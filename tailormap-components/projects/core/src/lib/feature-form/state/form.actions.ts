import { createAction, props } from '@ngrx/store';
import { Feature } from '../../shared/generated';

const formActionsPrefix = '[Form]';

export let setTreeOpen = createAction(
  `${formActionsPrefix} Open form tree`,
  props<{ treeOpen : boolean }>(),
);

export const setOpenFeatureForm = createAction(
  `${formActionsPrefix} Open feature form`,
  props<{ features : Feature[], closeAfterSave ?: boolean, alreadyDirty?: boolean }>(),
);
export const setCloseFeatureForm = createAction(
  `${formActionsPrefix} Close feature form`,
);

export const setFeature = createAction(
  `${formActionsPrefix} Set feature`,
  props<{ feature : Feature }>(),
);
