import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { SharedModule } from '../shared/shared.module';
import { applicationStateKey } from './state/application.state';
import { applicationReducer } from './state/application.reducer';
import { ApplicationTreeNodeComponent } from './application-tree-node/application-tree-node.component';
import { EffectsModule } from '@ngrx/effects';
import { ApplicationEffects } from './state/application.effects';


@NgModule({
  declarations: [
    ApplicationTreeNodeComponent,
  ],
  exports: [
    ApplicationTreeNodeComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    StoreModule.forFeature(applicationStateKey, applicationReducer),
    EffectsModule.forFeature([ ApplicationEffects ]),
  ],
})
export class ApplicationModule {}
