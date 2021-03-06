import { Component, ElementRef, Inject, OnDestroy, OnInit } from '@angular/core';
import { ConfirmDialogService } from '@tailormap/shared';
import { filter, map, switchMap, take, takeUntil } from 'rxjs/operators';
import { combineLatest, Observable, of, Subject } from 'rxjs';
import { Attribute, FormConfiguration, TabbedField, TabColumn } from './form-models';
import { Feature } from '../../shared/generated';
import { FormActionsService } from '../form-actions/form-actions.service';
import { MetadataService } from '../../application/services/metadata.service';
import { FormState } from '../state/form.state';
import { Store } from '@ngrx/store';
import * as FormActions from '../state/form.actions';
import { toggleFeatureFormVisibility } from '../state/form.actions';
import * as WorkflowActions from '../../workflow/state/workflow.actions';
import {
  selectCloseAfterSaveFeatureForm, selectCurrentFeature, selectFeatures, selectFormAlreadyDirty, selectFormEditing, selectFormVisible,
  selectIsMultiFormWorkflow,
} from '../state/form.selectors';
import { WORKFLOW_ACTION } from '../../workflow/state/workflow-models';
import { WorkflowState } from '../../workflow/state/workflow.state';
import {
  selectFormConfigForFeatureTypeName, selectFormConfigs, selectLayersWithAttributes,
} from '../../application/state/application.selectors';
import { FormHelpers } from './form-helpers';
import { FeatureInitializerService } from '../../shared/feature-initializer/feature-initializer.service';
import { EditFeatureGeometryService } from '../services/edit-feature-geometry.service';
import { AttributeMetadataResponse } from '../../shared/attribute-service/attribute-models';
import { ExtendedFormConfigurationModel } from '../../application/models/extended-form-configuration.model';
import { METADATA_SERVICE } from '@tailormap/models';

@Component({
  selector: 'tailormap-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.css'],
})
export class FormComponent implements OnDestroy, OnInit {

  public features: Feature[];
  public feature: Feature;
  public formConfig: FormConfiguration;
  public initComplete = false;

  public isBulk: boolean;
  public formsForNew: FormConfiguration[] = [];
  public formDirty: boolean;

  private destroyed = new Subject();
  public closeAfterSave = false;

  public isHidden$: Observable<boolean>;
  public editing$: Observable<boolean>;
  public isMultiFormWorkflow$: Observable<boolean>;
  public formTabs: TabbedField[] = [];

  constructor(
    private store$: Store<FormState | WorkflowState>,
    private confirmDialogService: ConfirmDialogService,
    @Inject(METADATA_SERVICE) private metadataService: MetadataService,
    private featureInitializerService: FeatureInitializerService,
    public actions: FormActionsService,
    private editFeatureGeometryService: EditFeatureGeometryService,
    private formElement: ElementRef,
  ) {
  }

  public ngOnInit(): void {
    this.store$.select(selectCurrentFeature)
      .pipe(
        takeUntil(this.destroyed),
        switchMap(feature => combineLatest([
          of(feature),
          this.store$.select(selectFeatures),
        ])),
        filter(([ feature, _features ]) => !!feature && !!feature.tableName),
        switchMap(([ feature, features ]) => combineLatest([
          of(feature),
          of(features),
          this.store$.select(selectCloseAfterSaveFeatureForm),
          this.store$.select(selectFormAlreadyDirty),
          this.store$.select(selectFormConfigForFeatureTypeName, feature.tableName),
          this.store$.select(selectFormConfigs),
          this.store$.select(selectLayersWithAttributes).pipe(
            map(appLayers => {
              const layers = appLayers.filter(appLayer => {
                const layerName = appLayer.userlayer ? appLayer.userlayer_original_layername : appLayer.layerName;
                return layerName === features[0].layerName || appLayer.featureTypeName === features[0].tableName;
                },

              );
              return layers[0];
            }),
            switchMap(layer => {
              return this.metadataService.getFeatureTypeMetadata$(layer.id).pipe(take(1));
            }),
          ),
        ])),
      )
      .subscribe(([ feature, features, closeAfterSave, formAlreadyDirty, formConfig, allFormConfigs, metaDataResponse ]) => {
        this.initForm(feature, features, closeAfterSave, formAlreadyDirty, formConfig, allFormConfigs, metaDataResponse);
      });

    this.isHidden$ = this.store$.select(selectFormVisible).pipe(map(visible => !visible));
    this.editing$ = this.store$.select(selectFormEditing);
    this.isMultiFormWorkflow$ = this.store$.select(selectIsMultiFormWorkflow);
  }

  private initForm(
    feature: Feature,
    features: Feature[],
    closeAfterSave: boolean,
    formAlreadyDirty: boolean,
    formConfig: FormConfiguration,
    allFormConfigs: Map<string, ExtendedFormConfigurationModel>,
    metaDataResponse: AttributeMetadataResponse,
  ) {
    this.initComplete = true;
    if (!formConfig) {
      return;
    }
    this.feature = { ...feature };
    this.formDirty = !!formAlreadyDirty;
    this.formConfig = formConfig;
    this.features = [...features];
    this.isBulk = features.length > 1;
    this.closeAfterSave = closeAfterSave;
    this.formsForNew = [];
    metaDataResponse.relations.forEach(rel => {
      const relationName = rel.foreignFeatureTypeName;
      if (allFormConfigs.has(relationName)) {
        this.formsForNew.push(allFormConfigs.get(relationName));
      }
    });
    this.formTabs = this.prepareFormConfig();
    this.formElement.nativeElement.style.setProperty('--overlay-panel-form-columns', `${this.getColumnCount()}`);
  }

  private prepareFormConfig(): Array<TabbedField> {
    const tabbedFields = [];
    for (let tabNr = 1; tabNr <= this.formConfig.tabs; tabNr++) {
      tabbedFields.push({
        tabId: tabNr,
        label: this.formConfig.tabConfig[tabNr],
        columns: this.getColumns(tabNr),
      });
    }
    return tabbedFields;
  }

  public getColumns(tabNr: number): TabColumn[] {
    const columns: TabColumn[] = [];
    const columnCount = this.getColumnCount();
    for (let i = 1; i <= columnCount; i++) {
      columns.push({
        columnId: i,
        attributes: this.getAttributes(i, tabNr),
      });
    }
    return columns;
  }

  public getAttributes(column: number, tabNr: number): Attribute[] {
    return this.formConfig.fields.filter(attr => attr.column === column && attr.tab === tabNr);
  }

  private getColumnCount() {
    const columnNumbers = this.formConfig.fields.map(field => field.column);
    return Math.max(...columnNumbers);
  }

  public ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  public formChanged(result: boolean) {
    this.formDirty = result;
  }

  public setFormEditing(editing) {
    this.store$.dispatch(FormActions.setFormEditing({ editing }));
  }

  public newItem($event: MouseEvent, featureTypeName: string) {
    const type = featureTypeName;

    combineLatest([
      this.store$.select(selectFormConfigForFeatureTypeName, type),
      this.store$.select(selectFeatures),
    ])
      .pipe(take(1))
      .subscribe(([formConfig, features]) => {
        const objecttype = FormHelpers.capitalize(type);
        this.featureInitializerService.create$(type, {
          id: null,
          clazz: type,
          isRelated: true,
          objecttype,
          children: null,
          [formConfig.treeNodeColumn]: `Nieuwe ${formConfig.name}`,
        }).subscribe(newFeature=>{
          this.store$.dispatch(FormActions.setNewFeature({newFeature, parentId: features[0].fid}));
          this.store$.dispatch(FormActions.setFormEditing({editing: true}));
        });
      });
  }

  public remove() {
    const attribute = Object.keys(this.feature).find(searchAttribute => searchAttribute === this.formConfig.treeNodeColumn);
    let message = 'Wilt u ' + this.formConfig.name + ' - ' + this.feature[attribute] + ' verwijderen?';
    if (this.feature.children && this.feature.children.length > 0) {
      message += ' Let op! Alle onderliggende objecten worden ook verwijderd.';
    }
    this.confirmDialogService.confirm$('Verwijderen',
      message, true)
      .pipe(take(1), filter(remove => remove)).subscribe(() => {
      this.actions.removeFeature$(this.feature).subscribe(() => {
        this.store$.dispatch(FormActions.setFeatureRemoved({feature: this.feature}));
        if (!this.feature) {
          this.closeForm();
        }
      });
    });
  }

  public copy() {
    const copyFeature = { ...this.features[0] };
    this.closeForm();
    this.store$.dispatch(WorkflowActions.setFeature({
      feature: copyFeature,
      action: WORKFLOW_ACTION.COPY,
    }));
  }

  public editGeometry(): void {
    this.store$.dispatch(toggleFeatureFormVisibility({ visible: false }));
    this.editFeatureGeometryService.updateCurrentFeatureGeometry$()
      .pipe(takeUntil(this.destroyed))
      .subscribe(geometry => {
        this.store$.dispatch(toggleFeatureFormVisibility({ visible: true }));
        if (!geometry) {
          return;
        }
        const geomField = this.feature.defaultGeometryField;
        if (!geomField) {
          return;
        }
        this.feature = {
          ...this.feature,
          [geomField]: geometry,
        };
      });
  }

  public closeForm() {
    if (this.formDirty) {
      this.closeNotification(function () {
        this.store$.dispatch(FormActions.setCloseFeatureForm());
      });
    } else {
      this.store$.dispatch(FormActions.setCloseFeatureForm());
    }
  }

  private closeNotification(afterAction) {
    this.confirmDialogService.confirm$('Formulier sluiten',
      'Wilt u het formulier sluiten? Niet opgeslagen wijzigingen gaan verloren.', true)
      .pipe(take(1), filter(remove => remove))
      .pipe(takeUntil(this.destroyed))
      .subscribe(() => {
        afterAction.call(this);
      });
  }

}
