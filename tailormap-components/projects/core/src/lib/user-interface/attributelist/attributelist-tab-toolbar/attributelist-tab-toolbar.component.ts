import {
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { AttributelistColumn } from '../attributelist-common/attributelist-column-models';
import { ExportService } from '../../../shared/export-service/export.service';
import { ExportFeaturesParameters } from '../../../shared/export-service/export-models';
import { Layer } from '../layer.model';
import { LayerService } from '../layer.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AttributelistTabComponent } from '../attributelist-tab/attributelist-tab.component';

@Component({
  selector: 'tailormap-attributelist-tab-toolbar',
  templateUrl: './attributelist-tab-toolbar.component.html',
  styleUrls: ['./attributelist-tab-toolbar.component.css'],
})
export class AttributelistTabToolbarComponent implements OnInit {

  @Input()
  public tab: AttributelistTabComponent;

  private layer: Layer;

  public columns: AttributelistColumn[];

  private exportParams: ExportFeaturesParameters = {
    application: 0,
    appLayer: 0,
    columns: [],
    type: '',
  };

  constructor(
      private exportService: ExportService,
      private layerService: LayerService,
      private _snackBar: MatSnackBar) {
  }

  public ngOnInit(): void {
    this.exportParams.application = this.layerService.getAppId();
  }

  /**
   * format = 'CSV', 'GEOJSON', 'XLS', 'SHP'
   */
  public onExportClick(format: string): void {
    this.exportParams.appLayer =  this.layer.id;
    this.exportParams.type = format;
    this.exportParams.columns = [];
    this.columns = this.tab.table.getActiveColumns(false);
    this.columns.forEach(c => {
      if (c.visible) {
        this.exportParams.columns.push(c.name);
      }
    });
    this.exportService.exportFeatures(this.exportParams).subscribe((response => {
      window.location.href = response.url;
    }), () => this._snackBar.open('Error downloading the ' + this.exportParams.type + ' export\n', 'Close', {
      duration: 20000,
    }))
  }

  public onFilterClick(): void {
    alert('Not yet implemented.');
  }

  public onSearchClick(): void {
    alert('Not yet implemented.');
  }

  public setTabIndex(tabIndex: number): void {
    // Get the corresponding layer.
    this.layer = this.layerService.getLayerByTabIndex(tabIndex);
  }
}
