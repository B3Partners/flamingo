import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import * as AttributeListActions from './attribute-list.actions';
import { concatMap, filter, map, tap, withLatestFrom } from 'rxjs/operators';
import { HighlightService } from '../../../shared/highlight-service/highlight.service';
import { Store } from '@ngrx/store';
import { AttributeListState } from './attribute-list.state';
import {
  selectAttributeListConfig, selectFeatureDataAndRelatedFeatureDataForFeatureType, selectFeatureDataForTab, selectTab, selectTabForFeatureType,
} from './attribute-list.selectors';
import { of } from 'rxjs';
import { AttributeListDataService, LoadDataResult } from '../services/attribute-list-data.service';
import { UpdateFeatureDataHelper } from '../helpers/update-feature-data.helper';

@Injectable()
export class AttributeListEffects {

  public hideAttributeList$ = createEffect(() => this.actions$.pipe(
    ofType(AttributeListActions.setAttributeListVisibility),
    filter((action) => !action.visible),
    tap(action => {
      this.highlightService.clearHighlight();
    })), {dispatch: false},
  );

  public changeAttributeListTab$ = createEffect(() => this.actions$.pipe(
    ofType(AttributeListActions.setSelectedTab),
    tap(action => {
      this.highlightService.clearHighlight();
    })), {dispatch: false},
  );

  public updateRowSelected$ = createEffect(() => this.actions$.pipe(
    ofType(AttributeListActions.updateRowSelected),
    concatMap(action => of(action).pipe(
      withLatestFrom(this.store$.select(selectAttributeListConfig)),
    )),
    tap(([action, attributeListConfig]) => {
      this.highlightService.highlightFeature(`${action.rowId}`, +(action.layerId), true, attributeListConfig.zoomToBuffer);
    })), {dispatch: false},
  );

  public loadDataForTab$ = createEffect(() => this.actions$.pipe(
    ofType(AttributeListActions.loadDataForTab),
    concatMap(action => of(action).pipe(
      withLatestFrom(
        this.store$.select(selectTab, action.layerId),
        this.store$.select(selectFeatureDataForTab, action.layerId),
      ),
    )),
    concatMap(([action, tab, featureData]) => {
      return this.attributeListDataService.loadData(tab, featureData).pipe(
        map(result => AttributeListActions.loadDataForTabSuccess({layerId: action.layerId, data: result})),
      );
    }),
  ));

  public updateFeatureDataProperties$ = createEffect(() => this.actions$.pipe(
    ofType(AttributeListActions.updatePage, AttributeListActions.updateSort),
    concatMap(action => of(action).pipe(
      withLatestFrom(
        this.store$.select(selectTabForFeatureType, action.featureType),
        this.store$.select(selectFeatureDataAndRelatedFeatureDataForFeatureType, action.featureType),
      ),
    )),
    filter(([action, tab, data]) => !!tab),
    concatMap(([action, tab, featureData]) => {
      const updatedFeatureData = featureData.map(data => {
        if (data.featureType === action.featureType) {
          return UpdateFeatureDataHelper.updateDataForAction(action, data);
        }
        return data;
      });
      return this.attributeListDataService.loadDataForFeatureType(tab, action.featureType, updatedFeatureData);
    }),
    tap(() => {
      this.highlightService.clearHighlight();
    }),
    map((result: LoadDataResult) => {
      return AttributeListActions.loadDataForFeatureTypeSuccess({featureType: result.featureType, data: result});
    }),
  ));

  constructor(
    private actions$: Actions,
    private store$: Store<AttributeListState>,
    private attributeListDataService: AttributeListDataService,
    private highlightService: HighlightService,
  ) {
  }

}
