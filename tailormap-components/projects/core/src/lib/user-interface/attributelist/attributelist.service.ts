/**
 * Service for config settings.
 */

import { Injectable } from '@angular/core';
import { AttributelistConfig } from './attributelist-common/attributelist-models';
import { Subject } from 'rxjs';
import {
  AttributelistNode,
  SelectedTreeData,
} from './attributelist-tree/attributelist-tree-models';

@Injectable({
  providedIn: 'root',
})
export class AttributelistService {

  public config: AttributelistConfig;

  private updateTreeDataSubject$ = new Subject<AttributelistNode[]>();

  private openAttributeTreeSubject$ = new Subject();

  private selectedTreeDataSubject$ = new Subject<SelectedTreeData>(); // source voor Observable

  public updateTreeData$ = this.updateTreeDataSubject$.asObservable();

  public openAttributeTree$ = this.openAttributeTreeSubject$.asObservable();

  public selectedTreeData$ = this.selectedTreeDataSubject$.asObservable(); // ingang naar Observable

  public updateTreeData(treeData: AttributelistNode[]): void {
    this.updateTreeDataSubject$.next(treeData);
  }

  public setSelectedTreeData(selectedTreeData: SelectedTreeData): void {
    this.selectedTreeDataSubject$.next(selectedTreeData);
  }

  public openAttributeTree(): void {
    this.openAttributeTreeSubject$.next();
  }
}
