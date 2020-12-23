import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { TreeDialogData, FlatNode, AttributelistNode } from './attributelist-tree-models';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from '@angular/material/tree';
import { FlatTreeControl } from '@angular/cdk/tree';
import { AttributelistTableComponent } from '../../attributelist-table/attributelist-table.component';
import { AttributelistService } from '../../attributelist.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'tailormap-attributelist-tree',
  templateUrl: './attributelist-tree.component.html',
  styleUrls: ['./attributelist-tree.component.css'],
})
export class AttributelistTreeComponent implements OnDestroy, OnInit {

  private destroyed = new Subject();

  public treeControl = new FlatTreeControl<FlatNode>(node => node.level, node => node.expandable);

  public treeFlattener = new MatTreeFlattener(
    this._transformer, node => node.level, node => node.expandable, node => node.children);

  public dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  constructor(public dialogRef: MatDialogRef<AttributelistTreeComponent>,
              @Inject(MAT_DIALOG_DATA) public data: TreeDialogData,
              private attributelistService: AttributelistService) {
    this.dataSource.data = data.tree;
    this.treeControl.expandAll();
  }

  private _transformer(node: AttributelistNode, level: number) {
    return {
      expandable: !!node.children && node.children.length > 0,
      name: node.name,
      numberOfFeatures: node.numberOfFeatures,
      level,
      columnNames: node.columnNames,
      features: node.features,
      params: node.params,
      isChild: node.isChild,
    };
  }

  public closeDialog() {
    this.dialogRef.close('tree gesloten');
  }

  public click(node: AttributelistNode) {
    this.attributelistService.setSelectedTreeData({
      features: node.features,
      columnNames: node.columnNames,
      params: node.params,
      name: node.name,
      isChild: node.isChild,
    });
  }

  public ngOnInit(): void {
    this.attributelistService.updateTreeData$.pipe(takeUntil(this.destroyed)).subscribe(treeData => {
      this.dataSource.data = treeData;
      this.treeControl.expandAll();
    });
  }

  public ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  public hasChild = (_: number, node: FlatNode) => node.expandable;
}
