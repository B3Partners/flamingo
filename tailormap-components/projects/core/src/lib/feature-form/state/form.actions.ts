import { createAction, props } from '@ngrx/store';
import { Feature } from '../../shared/generated';

const formActionsPrefix = '[Form]';

export const setOpenFeatureForm = createAction(
  `${formActionsPrefix} Open feature form`,
  props<{ features : Feature[]}>(),
);
