import { BrowserModule } from '@angular/platform-browser';
import { NgModule, Injector, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { createCustomElement } from '@angular/elements';

import { AppComponent } from './app.component';
import { CoreModule } from 'projects/core/src';
import { FormComponent } from 'projects/core/src/lib/feature-form/form/form.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormPopupComponent } from 'projects/core/src/lib/feature-form/form-popup/form-popup.component';
import { MatGridListModule } from '@angular/material/grid-list';
import {MapService} from "../../../core/src/lib/shared/ext-bridge/map/map.service";
import {MapComponent} from "../../../core/src/lib/shared/ext-bridge/map/map.component";

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    CoreModule,
    BrowserAnimationsModule,
  ],
  providers: [
  ],
  entryComponents: [
    FormPopupComponent,
  ],
  bootstrap: [],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
})
export class AppModule {
  constructor(injector: Injector) {
    customElements.define('tailormap-wegvak-popup', createCustomElement(FormPopupComponent, {injector}));
    customElements.define('tailormap-mapbridge', createCustomElement(MapComponent, {injector}));
  }
  public ngDoBootstrap() {}
}
