import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FlatTreeControl } from '@angular/cdk/tree';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from '@angular/material/tree';


import {
  FeatureNode,
  FlatNode,
} from './form-tree-models';
import { Feature } from '../../shared/generated';
import { FormTreeHelpers } from './form-tree-helpers';
import { FormconfigRepositoryService } from '../../shared/formconfig-repository/formconfig-repository.service';
import { FormHelpers } from '../form/form-helpers';

@Component({
  selector: 'tailormap-form-tree',
  templateUrl: './form-tree.component.html',
  styleUrls: ['./form-tree.component.css'],
})
export class FormTreeComponent implements OnInit, OnChanges {

  constructor(
    private formConfigRepo: FormconfigRepositoryService) {
  }

  @Output()
  public nodeClicked = new EventEmitter<Feature>();

  @Input()
  public features: Feature[];

  @Input()
  public isCopy = false;

  @Input()
  public feature: Feature;

  @Input()
  public featuresToCopy = [];

  public treeControl = new FlatTreeControl<FlatNode>(node => node.level, node => node.expandable);

  public treeFlattener = new MatTreeFlattener(
    FormTreeHelpers.transformer, node => node.level, node => node.expandable, node => node.children);

  public dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  public ngOnInit() {
  }

  public ngOnChanges(changes: SimpleChanges): void {
    this.dataSource.data = this.convertFeatureToNode(this.features);
    this.treeControl.expandAll();
  }

  public setNodeSelected(node: FlatNode) {
    this.nodeClicked.emit(node.feature);
  }

  private convertFeatureToNode(features: Feature[]): FeatureNode[] {
    const nodes: FeatureNode[] = [];
    features.forEach(feature => {
      const children: FeatureNode[] = [];
      if (feature.children) {
        const fts = {};
        feature.children.forEach((child: Feature) => {
          const featureType = child.clazz;
          if (this.formConfigRepo.getFormConfig(featureType)) {
            if (!fts.hasOwnProperty(featureType)) {
              fts[featureType] = {
                name: FormHelpers.capitalize(featureType),
                children: [],
                id: featureType,
                isFeatureType: true,
              };
            }
            fts[featureType].children.push(this.convertFeatureToNode([child])[0]);
          }
        });
        for (const key in fts) {
          if (fts.hasOwnProperty(key)) {
            const child = fts[key];
            children.push(child);
          }
        }
      }
      nodes.push({
        name: this.formConfigRepo.getFeatureLabel(feature),
        children,
        objectGuid: feature.objectGuid,
        feature,
        selected: feature.objectGuid === this.feature.objectGuid,
        isFeatureType: false,
      });
    });
    return nodes;
  }

  public isFeatureForCopyChecked(featureId: number): boolean {
    const isIn = false;
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < this.featuresToCopy.length; i++) {
      if (featureId === this.featuresToCopy[i]) {
        return true;
      }
    }
    return isIn;
  }

  public addFeatureForCopy(event: any, featureId: number) {
    if (event.checked) {
      this.featuresToCopy.push(featureId);
    }
     else {
      for (let i = 0; i < this.featuresToCopy.length; i++) {
        if (featureId === this.featuresToCopy[i]) {
          this.featuresToCopy.splice(i, 1);
        }
      }
    }

  }

  public getNodeClassName(node: FlatNode) {
    const treeNodeBaseClass = 'tree-node-wrapper';

    const cls = [
      treeNodeBaseClass,
      node.expandable ? `${treeNodeBaseClass}--folder` : `${treeNodeBaseClass}--leaf`,
      `${treeNodeBaseClass}--level-${node.level}`,
    ];

    if (node.selected) {
      cls.push(`${treeNodeBaseClass}--selected`);
    }

    return cls.join(' ');
  }

  public hasChild = (_: number, node: FlatNode) => node.expandable;
}
