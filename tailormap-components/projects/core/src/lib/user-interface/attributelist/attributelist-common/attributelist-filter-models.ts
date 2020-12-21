import { CriteriaConditionModel } from '../../../analysis/models/criteria-condition.model';

export interface LayerFilterValues {
  layerId: number;
  columns: FilterColumns[];
 }

export interface FilterColumns {
  name: string;
  status: boolean;
  nullValue: boolean;
  filterType: string;
  uniqueValues: FilterValueSettings[]
}

export interface FilterValueSettings {
  // value in column.
  value: string;
  // value in filter selected
  select: boolean;
  // [value:string]:boolean
}

export interface FilterDialogSettings {
  filterType: string;
  filterSetting: string;
  criteria: CriteriaConditionModel;
}
