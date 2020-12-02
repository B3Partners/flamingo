/* tslint:disable */
import { Feature } from './feature';
export interface GrasPlanning extends Feature {
  belang?: number;
  calc_plan_code?: string;
  calc_plan_id?: string;
  calc_plan_name?: string;
  data_guid?: string;
  frequentie?: number;
  gepland_uitgevoerd?: string;
  gras_id?: string;
  hoeveelheid?: number;
  id?: number;
  jaarvanuitvoering?: number;
  kosten?: number;
  maatregel_gras?: string;
  maatregelgroep?: string;
  maatregeltype?: string;
  planstatus?: string;
  werkeenheid?: string;
}
