/**
 * Remarks: a tab is created for each layer discovered in the layers property
 *          of the panel.
 */

import { Component, OnInit, AfterViewInit, Input, Output, ViewChild, EventEmitter } from '@angular/core';
import { LayerService } from '../layer.service';
import { RowClickData } from '../attributelist-common/attributelist-models';

@Component({
  selector: 'tailormap-attributelist-tab',
  templateUrl: './attributelist-tab.component.html',
  styleUrls: ['./attributelist-tab.component.css'],
})
export class AttributelistTabComponent implements OnInit, AfterViewInit {

  // The index of the tab in the tabgroup/layers. The first layer gets index 0.
  @Input()
  public tabIndex: number;

  @Output()
  public pageChange = new EventEmitter();

  @Output()
  public rowClick = new EventEmitter<RowClickData>();

  @ViewChild('toolbar') public toolbar;

  @ViewChild('table') public table;

  constructor(private layerService: LayerService) {
    // Init tab index.
    this.tabIndex = -1;
  }

  public ngOnInit(): void {
    // When a tab is initialized the tab index can be registered with
    // the layer service.
    // console.log('tab.comp ngOnInit: ' + this.tabIndex);
    this.layerService.registerTabComponent(this.tabIndex, this);
  }

  public ngAfterViewInit(): void {
    // console.log('tab.comp ngAfterViewInit: ' + this.tabIndex)
    // Set toolbar tab index.
    this.toolbar.setTabIndex(this.tabIndex);
    // Set table tab index (only here the table is defined).
    this.table.setTabIndex(this.tabIndex);
  }

  public onPageChange(): void {
    this.pageChange.emit();
  }

  public onRowClick(data: RowClickData): void {
    this.rowClick.emit(data);
  }

  public setTabIndex(tabIndex: number) {
    this.layerService.registerTabComponent(tabIndex, this);
    this.toolbar.setTabIndex(tabIndex);
    this.table.setTabIndex(tabIndex);
  }

}
