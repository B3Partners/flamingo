import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import {
  selectActiveColumnsForTab, selectFeatureTypeDataForTab, selectLoadingDataForTab, selectTabAndFeatureTypeDataForTab,
} from '../state/attribute-list.selectors';
import { filter, map, takeUntil } from 'rxjs/operators';
import { combineLatest, Observable, Subject } from 'rxjs';
import { AttributeListRowModel } from '../models/attribute-list-row.model';
import { Store } from '@ngrx/store';
import { AttributeListState } from '../state/attribute-list.state';
import { loadStatisticsForColumn, updateRowSelected, updateSort } from '../state/attribute-list.actions';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AttributeListColumnModel } from '../models/attribute-list-column-models';
import { AttributeListFilterComponent } from '../attribute-list-filter/attribute-list-filter.component';
import { MatDialog } from '@angular/material/dialog';
import { AttributeListFilterModel } from '../models/attribute-list-filter-models';
import { AttributeListStatisticColumnModel } from '../models/attribute-list-statistic-column.model';
import { StatisticsHelper } from '../helpers/statistics-helper';
import { StatisticType } from '../../../shared/statistic-service/statistic-models';

@Component({
  selector: 'tailormap-attribute-list-table',
  templateUrl: './attribute-list-table.component.html',
  styleUrls: ['./attribute-list-table.component.css'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttributeListTableComponent implements OnInit, OnDestroy {

  @Input()
  public layerId: string;

  public featureType: number;

  private destroyed = new Subject();

  public rows$: Observable<AttributeListRowModel[]>;

  public columns: AttributeListColumnModel[];
  public columnNames: string[];

  public uncheckedCount: number;
  public checkedCount: number;
  private filters: AttributeListFilterModel[];
  public showCheckboxColumn$: Observable<boolean>;
  public sort: { column: string; direction: string };
  public rowLength: number;

  public loadingData$: Observable<boolean>;
  public notLoadingData$: Observable<boolean>;

  public statisticTypes = StatisticsHelper.getStatisticOptions();
  private statistics: Map<string, AttributeListStatisticColumnModel> = new Map();

  constructor(
    private store$: Store<AttributeListState>,
    private dialog: MatDialog,
  ) { }

  public ngOnInit(): void {

    const featureTypeData$ = this.store$.select(selectFeatureTypeDataForTab, this.layerId);

    featureTypeData$
      .pipe(
        takeUntil(this.destroyed),
        filter(featureData => !!featureData),
      )
      .subscribe(featureData => {
        this.uncheckedCount = featureData.rows.filter(row => !row._checked).length;
        this.checkedCount = featureData.rows.filter(row => row._checked).length;
        this.featureType = featureData.featureType;
        this.sort = { column: featureData.sortedColumn, direction: featureData.sortDirection.toLowerCase() };
        this.filters = featureData.filter;
        this.rowLength = featureData.rows.length;
        this.statistics = new Map(featureData.statistics.map(s => [s.name, s]));
      });

    this.showCheckboxColumn$ = this.store$.select(selectTabAndFeatureTypeDataForTab, this.layerId)
      .pipe(
        filter(([tab, featureData]) => !!tab && !!featureData),
        map(([tab, featureData]) => tab.featureType === featureData.featureType),
      );

    combineLatest([
      this.store$.select(selectActiveColumnsForTab, this.layerId),
      this.showCheckboxColumn$,
    ])
      .pipe(takeUntil(this.destroyed))
      .subscribe(([ columns, showCheckboxColumn ]) => {
        this.columns = columns;
        this.columnNames = this.getColumnNames(columns, showCheckboxColumn);
      });

    this.rows$ = featureTypeData$.pipe(
      takeUntil(this.destroyed),
      filter(data => !!data),
      map(data => data.rows),
    );

    this.loadingData$ = this.store$.select(selectLoadingDataForTab, this.layerId);
    this.notLoadingData$ = this.store$.select(selectLoadingDataForTab, this.layerId).pipe(map(loading => !loading));
  }

  public ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  public trackByRowId(idx: number, row: AttributeListRowModel) {
    return row.rowId;
  }

  public onRowClick($event: MouseEvent, row: AttributeListRowModel): void {
    $event.stopPropagation();
    this.store$.dispatch(updateRowSelected({
      featureType: this.featureType,
      layerId: this.layerId,
      rowId: row.rowId,
      selected: !row._selected,
    }));
  }

  public onSortClick(columnName: string): void {
    let direction: 'asc' | 'desc' | '' = 'asc';
    if (this.sort.column === columnName) {
      direction = this.sort.direction === 'asc' ? 'desc' : '';
    }
    this.store$.dispatch(updateSort({ layerId: this.layerId, featureType: this.featureType, column: columnName, direction }));
  }

  public onFilterClick(columnName: string): void {
    const filterModel = this.filters.find(f => f.name === columnName);
    const column = this.columns.find(c => c.name === columnName);
    this.dialog.open(AttributeListFilterComponent, {
      data: {
        columnName,
        featureType: this.featureType,
        layerId: this.layerId,
        filter: filterModel,
        columnType: column.attributeType,
      },
    });
  }

  public getIsFilterActive(columnName): boolean {
    const filterModel = this.filters.find(f => f.name === columnName);
    return !!filterModel;
  }

  public hasStatisticResult(col: AttributeListColumnModel): boolean {
    const column = this.statistics.get(col.name);
    return !!column && !column.processing &&  StatisticsHelper.getStatisticValue(col.dataType, column) !== null;
  }

  public getStatisticResult(col: AttributeListColumnModel): string {
    const column = this.statistics.get(col.name);
    const value = StatisticsHelper.getStatisticValue(col.dataType, column);
    if (column && value) {
      return `${StatisticsHelper.getLabelForStatisticType(column.statisticType)} = ${value}`;
    }
    return '';
  }

  public isStatisticsProcessing(colName: string): boolean {
    return this.statistics.get(colName)?.processing;
  }

  public isStatisticsTypeAvailable(type: StatisticType, col: AttributeListColumnModel) {
    return StatisticsHelper.isStatisticTypeAvailable(type, col.dataType);
  }

  public isStatisticsTypeSelected(type: StatisticType, col: AttributeListColumnModel) {
    const statisticColumn = this.statistics.get(col.name);
    return !!statisticColumn && statisticColumn.statisticType === type;
  }

  public loadStatistic(type: StatisticType, col: AttributeListColumnModel) {
    this.store$.dispatch(loadStatisticsForColumn({
      layerId: this.layerId,
      featureType: this.featureType,
      column: col.name,
      statisticType: type,
    }));
  }

  public getColumnNames(columns: AttributeListColumnModel[], showCheckboxColumn: boolean): string[] {
    const columnNames = [
      '_details',
      ...columns.map(c => c.name),
    ];
    if (showCheckboxColumn) {
      columnNames.unshift('_checked');
    }
    return columnNames;
  }

}
