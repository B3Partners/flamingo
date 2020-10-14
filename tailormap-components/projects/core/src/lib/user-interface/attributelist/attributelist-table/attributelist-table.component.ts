
import { Component, ElementRef, OnInit, AfterViewInit, Renderer2, ViewChild } from '@angular/core';

import { MatPaginator } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { animate, state, style, transition, trigger } from '@angular/animations';

import { AttributelistTable } from '../attributelist-common/attributelist-models';
import { AttributeDataSource } from '../attributelist-common/attributelist-datasource';
import { AttributelistColumn } from '../attributelist-common/attributelist-column-models';
import { AttributelistTableOptionsFormComponent } from '../attributelist-table-options-form/attributelist-table-options-form.component';
import { AttributeService } from '../../../shared/attribute-service/attribute.service';
import { CheckState, DetailsState } from '../attributelist-common/attributelist-enums';
import { ExportService } from '../../../shared/export-service/export.service';
import { LayerService } from '../layer.service';
import { PassportService } from '../passport.service';


@Component({
  selector: 'tailormap-attributelist-table',
  templateUrl: './attributelist-table.component.html',
  styleUrls: ['./attributelist-table.component.css'],
  animations: [
    trigger('onDetailsExpand', [
      state('void', style({ height: '0px', minHeight: '0', visibility: 'hidden' })),
      state('*', style({ height: '*', visibility: 'visible' })),
      transition('void <=> *', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class AttributelistTableComponent implements AttributelistTable, OnInit, AfterViewInit {

  @ViewChild(MatPaginator) private paginator: MatPaginator;
  @ViewChild(MatSort) private sort: MatSort;

  // Get the paginator element.
  @ViewChild(MatPaginator, {
    static: true, read: ElementRef }) private paginatorElem: ElementRef<HTMLDivElement>;

  // Table reference for 'manually' rendering.
  @ViewChild('table') public table: MatTable<any>;

  public dataSource = new AttributeDataSource(this.layerService,
                                              this.attributeService,
                                              // this.exportService,
                                              this.passportService);

  // Number of checked rows.
  public nrChecked = 0;

  // State of checked rows ('All','None','Some').
  public checkState = CheckState.None;

  private tabIndex = -1;

  private defaultPageSize = 5;

  /**
   * Remark: The Renderer2 is needed for setting a custom css style.
   */
  constructor(private attributeService: AttributeService,
              private layerService: LayerService,
              private exportService: ExportService,
              private passportService: PassportService,
              private dialog: MatDialog,
              private renderer: Renderer2) {
    // console.log('=============================');
    // console.log('#Table - constructor');
  }

  public ngOnInit(): void {
  }

  public ngAfterViewInit(): void {
    // console.log('#Table - ngAfterViewInit');

    // Set datasource paginator.
    this.dataSource.paginator = this.paginator;
    // Set datasource sort.
    this.dataSource.sorter = this.sort;

    // Hide the paginator pagesize combo.
    this.paginator.hidePageSize = true;

    // Init the paginator with the startup page index and page size.
    this.paginator.pageIndex = 0;
    this.paginator.pageSize = this.defaultPageSize;
  }

  public onAfterLoadData(): void {
    //console.log('#Table - onAfterLoadData');

    // Update paginator page size and total number of rows.
    this.paginator.pageSize = this.defaultPageSize;
    this.paginator.length = this.dataSource.totalNrOfRows;

    // Update the table rows.
    this.table.renderRows();

    // FOR TESTING. SHOW TABLE OPTIONS FORM AT STARTUP.
    // this.onTableOptionsClick(null);
  }

  public getColumns(includeSpecial: boolean): AttributelistColumn[] {
    return this.dataSource.columnController.getActiveColumns(includeSpecial);
  }

  /**
   * Return the column names. Include special column names.
   */
  public getColumnNames(): string[] {
    return this.dataSource.columnController.getActiveColumnNames(true);
  }

  public getColumnWidth(name: string): string {
    console.log("#Table - getColumnWidth - " + name);
    return '180px';
  }

  // public getDetailsInfo(row: any): string {
  //   console.log('#Table - getDetailInfo');
  //   console.log(row);
  //   if (row.related_featuretypes.length > 0) {
  //     return row.related_featuretypes[0].foreignFeatureTypeName;
  //   } else {
  //     return '';
  //   }
  // }

  /**
   * Returns if the bar with the button should be visible.
   */
  public getFooterBarVisible(): string {
    if (this.nrChecked == 0) {
      return 'none';
    } else {
      return 'block';
    }
  };

  public getLayerIdOnTab(index): number {
    // console.log('#Table - setTabIndex');
    // Set corresponding tab index.
    this.tabIndex = index;
    // Get layer.
    const layer = this.layerService.getLayerByTabIndex(this.tabIndex);
    // console.log(layer);
    if ((!layer) || ((layer) && (layer.name === ''))) {
      return;
    } else if (layer) {
      return layer.id;
    }

  }

  public getTabIndex(): number {
    return this.tabIndex;
  }

  /**
   * Fired when the checkbox in the header is clicked.
   */
  public onHeaderCheckClick(): void {
    const currCheckState = this.checkState;
    if (currCheckState === CheckState.All) {
      this.dataSource.checkNone();
    } else if (currCheckState === CheckState.None) {
      this.dataSource.checkAll();
    } else {
      this.dataSource.checkAll();
    }
    // Update check info.
    this.updateCheckedInfo();
  }

  public onObjectOptionsClick(): void {
    alert('Not yet implemented.');
  }

  public onPageChange(event): void {
    console.log('#Table - onPageChange');
    // Update the table.
    this.updateTable();
  }

  /**
   * Fired when a checkbox is clicked.
   */
  public onRowCheckClick(row: any): void {
    //console.log('#Table - onRowCheckClick');
    //console.log(row);
    // Toggle the checkbox in the checked row.
    this.dataSource.toggleChecked(row);
    // Update check info.
    this.updateCheckedInfo();
  }

  /**
   * Fired when a expand/collapse icon/char is clicked.
   */
  public onRowExpandClick(row: any): void {
    // console.log('#Table - onRowExpandClick');
    // console.log(row);
    if (row.hasOwnProperty("_detailsRow")) {
      // Toggle the expanded/collapsed state of the row.
      row._detailsRow.toggle();
    }
  }

  /**
   * Fired when a row is clicked.
   */
  public onRowClick(row: any): void {
    console.log('#Table - onRowClicked');
  }

  /**
   * Fired when a column header is clicked.
   */
  public onSortClick(sort: Sort): void {
    // Reset the paginator page index.
    this.paginator.pageIndex = 0;
    // Update the table.
    this.updateTable();
  }

  /**
   * Shows a popup to set visible columns.
   */
  public onTableOptionsClick(evt: MouseEvent): void {

    // Get the target for setting the dialog position.
    let target = null;
    if (evt !== null) {
      target = new ElementRef(evt.currentTarget);
    }

    // Create and set the dialog config.
    const config = new MatDialogConfig();

    // Show transparent backdrop, click outside dialog for closing.
    config.backdropClass = 'cdk-overlay-backdrop';

    // Possible additional settings:
    //     config.hasBackdrop = false;     // Don't show a gray mask.
    //     config.maxHeight = '100px';
    //     config.height = '300px';
    //     config.panelClass = 'attributelist-table-options-form';

    config.data = {
      trigger: target,
      columnController: this.dataSource.columnController,
    };
    const dialogRef = this.dialog.open(AttributelistTableOptionsFormComponent, config);
    dialogRef.afterClosed().subscribe(value => {
      // Collapse all rows.
      columnController: this.dataSource.resetExpanded();
    });
  }

  public onTest(): void {
    console.log('#Table.onTest');
    this.table.renderRows();
  }

  public setTabIndex(index: number): void {
    // console.log('#Table - setTabIndex');
    // Set corresponding tab index.
    this.tabIndex = index;
    // Get layer.
    const layer = this.layerService.getLayerByTabIndex(this.tabIndex);
    // console.log(layer);
    if (layer.name === '') {
      return;
    }
    // Set params layer name and id.
    this.dataSource.params.layerName = layer.name;
    this.dataSource.params.layerId = layer.id;
    // Update table.
    this.updateTable();
  }

  private updateCheckedInfo(): void {
    // Update the number checked.
    this.nrChecked = this.dataSource.getNrChecked();
    // Update the check state.
    this.checkState = this.dataSource.getCheckState(this.nrChecked);
  }

  private updateTable(): void {
    // (Re)load data. Fires the onAfterLoadData method.
    this.dataSource.loadData(this);
    // Update check info (number checked/check state).
    this.updateCheckedInfo();
  }
}
