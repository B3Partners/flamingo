import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';
import {
  AttributeListParameters,
  AttributeListResponse,
  AttributeMetadataParameters,
  AttributeMetadataResponse,
} from './attribute-models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AttributeService {

  constructor(private http: HttpClient) {
  }

  public featureTypeMetadata$(params: AttributeMetadataParameters): Observable<AttributeMetadataResponse> {
    let httpParams: HttpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      httpParams = httpParams.set(key, value);
    });
    httpParams = httpParams.set('attributes', 'true');
    return this.http.get<AttributeMetadataResponse>('/viewer/action/attributes', {params: httpParams});
  }

  /**
   * Get features for the attributelist
   * @param params Params for retrieving, sorting and filtering the features
   */
  public features$(params: AttributeListParameters): Observable<AttributeListResponse> {
    let httpParams: HttpParams = new HttpParams();
    httpParams = httpParams.set('limit', '10');
    httpParams = httpParams.set('page', '1');
    httpParams = httpParams.set('start', '1');

    Object.entries(params).forEach(([key, value]) => {
      httpParams = httpParams.set(key, value);
    });
    httpParams = httpParams.set('store', '1');
    return this.http.get<AttributeListResponse>('/viewer/action/attributes', {params: httpParams});
  }
}