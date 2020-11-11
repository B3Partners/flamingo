/* tslint:disable:no-string-literal */
import {
  Component,
  Inject,
  OnInit,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { Feature } from '../../shared/generated';
import { FormconfigRepositoryService } from '../../shared/formconfig-repository/formconfig-repository.service';
import {
  FormConfiguration,
} from '../form/form-models';
import { FormActionsService } from '../form-actions/form-actions.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CopyDialogData } from './form-copy-models';
import { FeatureInitializerService } from '../../shared/feature-initializer/feature-initializer.service';

@Component({
  selector: 'tailormap-form-copy',
  templateUrl: './form-copy.component.html',
  styleUrls: ['./form-copy.component.css'],
})
export class FormCopyComponent implements OnInit {

  private width = '400px';

  public originalFeature: Feature;

  public showSidePanel = 'false';

  public deleteRelated = false;

  public parentFeature: Feature;

  public formConfig: FormConfiguration;

  public featuresToCopy = new Map<string, Map<string, string>>();

  constructor(public dialogRef: MatDialogRef<FormCopyComponent>,
              @Inject(MAT_DIALOG_DATA) public data: CopyDialogData,
              private configService: FormconfigRepositoryService,
              private actionService: FormActionsService,
              private _snackBar: MatSnackBar,
              private formConfigRepo: FormconfigRepositoryService,
              private featureInitializer: FeatureInitializerService) {
  }

  public ngOnInit(): void {
    this.originalFeature = this.data.originalFeature;
    this.parentFeature = this.data.originalFeature;
    this.formConfig = this.configService.getFormConfig(this.originalFeature.clazz);
    const fieldsToCopy = new Map<string, string>();
    for (const field of this.formConfig.fields) {
      fieldsToCopy.set(field.key, field.label);
    }
    this.featuresToCopy.set(this.originalFeature['objectGuid'], fieldsToCopy);
    if (this.originalFeature.children) {
      for (const child of this.originalFeature.children) {
        const config = this.configService.getFormConfig(child.clazz);
        if (config) {
          // tslint:disable-next-line:no-shadowed-variable
          const fieldsToCopy = new Map<string, string>();
          for (const field of config.fields) {
            fieldsToCopy.set(field.key, field.label);
          }
          fieldsToCopy.set('objecttype', child.objecttype);
          this.featuresToCopy.set(child.objectGuid, fieldsToCopy);
        }
      }
    }
  }

  public cancel() {
    this.dialogRef.close();
  }

  public copy() {
    let successCopied = 0;
    const destinationFeatures = this.data.destinationFeatures;
    if (destinationFeatures.length > 0) {
      if (this.deleteRelated) {
        this.deleteRelatedFeatures();
      }
      const valuesToCopy = this.getPropertiesToMerge();
      const childsToCopy = this.getNewChildFeatures();
      for (let i  = 0; i <= destinationFeatures.length - 1; i++) {
        destinationFeatures[i] = {...destinationFeatures[i], ...valuesToCopy};
        for (let n = 0; n <= childsToCopy.length - 1; n++) {
          this.actionService.save$(false, childsToCopy[n], destinationFeatures[i]).subscribe(childSaved => {
            console.log('child saved');
          })
        }
        this.actionService.save$(false, destinationFeatures[i], destinationFeatures[i]).subscribe(savedFeature => {
            successCopied++;
            if (successCopied === destinationFeatures.length) {
              this._snackBar.open('Er zijn ' + successCopied + ' features gekopieerd', '', {
                duration: 5000,
              });
              this.dialogRef.close();
            }
          },
          error => {
            this._snackBar.open('Fout: Feature niet kunnen opslaan: ' + error.error.message, '', {
              duration: 5000,
            });
          });
      }
    } else {
      this._snackBar.open('Er zijn geen objecten geselecteerd!', '', {
        duration: 5000,
      });
    }
  }

  public deleteRelatedFeatures() {
    for (let i  = 0; i <= this.data.destinationFeatures.length - 1; i++) {
      const feature = this.data.destinationFeatures[i];
      const children = feature.children;
      for (let c  = 0; c <= children.length - 1; c++) {
        const child = children[c];
        this.actionService.removeFeature$(child, [feature]).subscribe(childRemoved => {
          console.log('child removed');
        });
      }
    }
  }

  public stringToNumber(key: string) {
    return Number(key);
  }

  public isFieldChecked(event: any) {
    const fieldsToCopy = this.featuresToCopy.get(this.originalFeature['fid']);
    return fieldsToCopy.has(event);
  }

  public toggle(event: any) {
    if (!event.checked) {
      const fieldsToCopy = this.featuresToCopy.get(this.originalFeature['fid']);
      fieldsToCopy.clear();
    } else {
      const fieldsToCopy = this.featuresToCopy.get(this.originalFeature['fid']);
      for (let i  = 0; i <= this.formConfig.fields.length - 1; i++) {
        const config = this.formConfig.fields[i];
        fieldsToCopy.set(config.key, config.label);
      }
    }
  }

  public updateFieldToCopy(event: any) {
    if (!event.checked) {
      if (this.featuresToCopy.has(this.originalFeature['objectGuid'])) {
        const fieldsToCopy = this.featuresToCopy.get(this.originalFeature['objectGuid']);
        if (fieldsToCopy.has(event.source.id)) {
          fieldsToCopy.delete(event.source.id);
        }
      }
    } else {
      if (this.featuresToCopy.has(this.originalFeature['objectGuid'])) {
        const fieldsToCopy = this.featuresToCopy.get(this.originalFeature['objectGuid']);
        fieldsToCopy.set(event.source.id, event.source.name);
      }
    }
  }

  private getPropertiesToMerge(): any {
    const valuesToCopy = {};
    const fieldsToCopy = this.featuresToCopy.get(this.parentFeature['objectGuid']);
    fieldsToCopy.forEach((value, key) => {
      valuesToCopy[key] = this.originalFeature[key];
    })
    return valuesToCopy;
  }

  private getNewChildFeatures(): Feature[] {
    const newChilds = [];
    this.featuresToCopy.forEach((fieldsToCopy, key) => {
      let newChild = {};
      if (key !== this.parentFeature['objectGuid']) {
        const valuesToCopy = {};
        for (let i = 0; i <= this.parentFeature.children.length - 1; i++) {
          const child = this.parentFeature.children[i];
          if (child.objectGuid === key) {
            fieldsToCopy.forEach((value, key1) => {
              valuesToCopy[key1] = child[key1];
            })
          }
        }
        newChild = this.featureInitializer.create(fieldsToCopy.get('objecttype'), valuesToCopy);
        newChilds.push(newChild);
      }
    });
    return newChilds;
  }

  public openForm(feature) {
    if (feature) {
        this.originalFeature = feature;
        this.formConfig = this.formConfigRepo.getFormConfig(this.originalFeature.clazz);
    }
  }

  public setDeleteRelated(event: any) {
    this.deleteRelated = !this.deleteRelated;
  }

  public settings() {
    if (this.width === '400px') {
      this.width = '800px';
      this.dialogRef.updateSize(this.width);
      this.showSidePanel = 'true';
    } else {
      this.width = '400px';
      this.dialogRef.updateSize(this.width);
      this.showSidePanel = 'false';
    }
  }
}