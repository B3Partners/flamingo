/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';
import { RequestBuilder } from '../request-builder';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';

import { Gras } from '../models/gras';

@Injectable({
  providedIn: 'root',
})
export class FormGrassControllerService extends BaseService {
  constructor(
    config: ApiConfiguration,
    http: HttpClient
  ) {
    super(config, http);
  }

  /**
   * Path part for operation get5
   */
  static readonly Get5Path = '/gras/{objectGuid}';

  /**
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `get5()` instead.
   *
   * This method doesn't expect any request body.
   */
  get5$Response(params: {
    objectGuid: string;
  }): Observable<StrictHttpResponse<Gras>> {

    const rb = new RequestBuilder(this.rootUrl, FormGrassControllerService.Get5Path, 'get');
    if (params) {
      rb.path('objectGuid', params.objectGuid, {});
    }

    return this.http.request(rb.build({
      responseType: 'json',
      accept: 'application/json'
    })).pipe(
      filter((r: any) => r instanceof HttpResponse),
      map((r: HttpResponse<any>) => {
        return r as StrictHttpResponse<Gras>;
      })
    );
  }

  /**
   * This method provides access to only to the response body.
   * To access the full response (for headers, for example), `get5$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  get5(params: {
    objectGuid: string;
  }): Observable<Gras> {

    return this.get5$Response(params).pipe(
      map((r: StrictHttpResponse<Gras>) => r.body as Gras)
    );
  }

  /**
   * Path part for operation onPoint5
   */
  static readonly OnPoint5Path = '/gras/{x}/{y}/{scale}';

  /**
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `onPoint5()` instead.
   *
   * This method doesn't expect any request body.
   */
  onPoint5$Response(params: {
    'x': number;
    'y': number;
    scale: number;
  }): Observable<StrictHttpResponse<Array<Gras>>> {

    const rb = new RequestBuilder(this.rootUrl, FormGrassControllerService.OnPoint5Path, 'get');
    if (params) {
      rb.path('x', params['x'], {});
      rb.path('y', params['y'], {});
      rb.path('scale', params.scale, {});
    }

    return this.http.request(rb.build({
      responseType: 'json',
      accept: 'application/json'
    })).pipe(
      filter((r: any) => r instanceof HttpResponse),
      map((r: HttpResponse<any>) => {
        return r as StrictHttpResponse<Array<Gras>>;
      })
    );
  }

  /**
   * This method provides access to only to the response body.
   * To access the full response (for headers, for example), `onPoint5$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  onPoint5(params: {
    'x': number;
    'y': number;
    scale: number;
  }): Observable<Array<Gras>> {

    return this.onPoint5$Response(params).pipe(
      map((r: StrictHttpResponse<Array<Gras>>) => r.body as Array<Gras>)
    );
  }

}
