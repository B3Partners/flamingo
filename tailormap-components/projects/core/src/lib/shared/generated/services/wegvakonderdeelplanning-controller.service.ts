import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';
import { RequestBuilder } from '../request-builder';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';

import { PageWegvakonderdeelplanning } from '../models/page-wegvakonderdeelplanning';
import { Wegvakonderdeelplanning } from '../models/wegvakonderdeelplanning';

@Injectable({
  providedIn: 'root',
})
export class WegvakonderdeelplanningControllerService extends BaseService {
  constructor(
    config: ApiConfiguration,
    http: HttpClient
  ) {
    super(config, http);
  }

  /**
   * Path part for operation get2
   */
  static readonly Get2Path = '/wegvakonderdeelplanning/{objectGuid}';

  /**
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `get2()` instead.
   *
   * This method doesn't expect any request body.
   */
  get2$Response(params: {
    objectGuid: string;

  }): Observable<StrictHttpResponse<Wegvakonderdeelplanning>> {

    const rb = new RequestBuilder(this.rootUrl, WegvakonderdeelplanningControllerService.Get2Path, 'get');
    if (params) {

      rb.path('objectGuid', params.objectGuid, {});

    }
    return this.http.request(rb.build({
      responseType: 'json',
      accept: 'application/json'
    })).pipe(
      filter((r: any) => r instanceof HttpResponse),
      map((r: HttpResponse<any>) => {
        return r as StrictHttpResponse<Wegvakonderdeelplanning>;
      })
    );
  }

  /**
   * This method provides access to only to the response body.
   * To access the full response (for headers, for example), `get2$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  get2(params: {
    objectGuid: string;

  }): Observable<Wegvakonderdeelplanning> {

    return this.get2$Response(params).pipe(
      map((r: StrictHttpResponse<Wegvakonderdeelplanning>) => r.body as Wegvakonderdeelplanning)
    );
  }

  /**
   * Path part for operation update2
   */
  static readonly Update2Path = '/wegvakonderdeelplanning/{objectGuid}';

  /**
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `update2()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  update2$Response(params: {
    objectGuid: string;
      body: Wegvakonderdeelplanning
  }): Observable<StrictHttpResponse<Wegvakonderdeelplanning>> {

    const rb = new RequestBuilder(this.rootUrl, WegvakonderdeelplanningControllerService.Update2Path, 'put');
    if (params) {

      rb.path('objectGuid', params.objectGuid, {});

      rb.body(params.body, 'application/json');
    }
    return this.http.request(rb.build({
      responseType: 'json',
      accept: 'application/json'
    })).pipe(
      filter((r: any) => r instanceof HttpResponse),
      map((r: HttpResponse<any>) => {
        return r as StrictHttpResponse<Wegvakonderdeelplanning>;
      })
    );
  }

  /**
   * This method provides access to only to the response body.
   * To access the full response (for headers, for example), `update2$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  update2(params: {
    objectGuid: string;
      body: Wegvakonderdeelplanning
  }): Observable<Wegvakonderdeelplanning> {

    return this.update2$Response(params).pipe(
      map((r: StrictHttpResponse<Wegvakonderdeelplanning>) => r.body as Wegvakonderdeelplanning)
    );
  }

  /**
   * Path part for operation delete2
   */
  static readonly Delete2Path = '/wegvakonderdeelplanning/{objectGuid}';

  /**
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `delete2()` instead.
   *
   * This method doesn't expect any request body.
   */
  delete2$Response(params: {
    objectGuid: string;

  }): Observable<StrictHttpResponse<void>> {

    const rb = new RequestBuilder(this.rootUrl, WegvakonderdeelplanningControllerService.Delete2Path, 'delete');
    if (params) {

      rb.path('objectGuid', params.objectGuid, {});

    }
    return this.http.request(rb.build({
      responseType: 'text',
      accept: '*/*'
    })).pipe(
      filter((r: any) => r instanceof HttpResponse),
      map((r: HttpResponse<any>) => {
        return (r as HttpResponse<any>).clone({ body: undefined }) as StrictHttpResponse<void>;
      })
    );
  }

  /**
   * This method provides access to only to the response body.
   * To access the full response (for headers, for example), `delete2$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  delete2(params: {
    objectGuid: string;

  }): Observable<void> {

    return this.delete2$Response(params).pipe(
      map((r: StrictHttpResponse<void>) => r.body as void)
    );
  }

  /**
   * Path part for operation getAllPaged1
   */
  static readonly GetAllPaged1Path = '/wegvakonderdeelplanning';

  /**
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `getAllPaged1()` instead.
   *
   * This method doesn't expect any request body.
   */
  getAllPaged1$Response(params?: {

    /**
     * Zero-based page index (0..N)
     */
    page?: number;

    /**
     * The size of the page to be returned
     */
    size?: number;

    /**
     * Sorting criteria in the format: property(,asc|desc). Default sort order is ascending. Multiple sort criteria are supported.
     */
    sort?: Array<string>;

  }): Observable<StrictHttpResponse<PageWegvakonderdeelplanning>> {

    const rb = new RequestBuilder(this.rootUrl, WegvakonderdeelplanningControllerService.GetAllPaged1Path, 'get');
    if (params) {

      rb.query('page', params.page, {});
      rb.query('size', params.size, {});
      rb.query('sort', params.sort, {});

    }
    return this.http.request(rb.build({
      responseType: 'json',
      accept: 'application/json'
    })).pipe(
      filter((r: any) => r instanceof HttpResponse),
      map((r: HttpResponse<any>) => {
        return r as StrictHttpResponse<PageWegvakonderdeelplanning>;
      })
    );
  }

  /**
   * This method provides access to only to the response body.
   * To access the full response (for headers, for example), `getAllPaged1$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  getAllPaged1(params?: {

    /**
     * Zero-based page index (0..N)
     */
    page?: number;

    /**
     * The size of the page to be returned
     */
    size?: number;

    /**
     * Sorting criteria in the format: property(,asc|desc). Default sort order is ascending. Multiple sort criteria are supported.
     */
    sort?: Array<string>;

  }): Observable<PageWegvakonderdeelplanning> {

    return this.getAllPaged1$Response(params).pipe(
      map((r: StrictHttpResponse<PageWegvakonderdeelplanning>) => r.body as PageWegvakonderdeelplanning)
    );
  }

  /**
   * Path part for operation save2
   */
  static readonly Save2Path = '/wegvakonderdeelplanning';

  /**
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `save2()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  save2$Response(params: {
      body: { 'wv'?: Wegvakonderdeelplanning, 'parentId'?: string }
  }): Observable<StrictHttpResponse<Wegvakonderdeelplanning>> {

    const rb = new RequestBuilder(this.rootUrl, WegvakonderdeelplanningControllerService.Save2Path, 'post');
    if (params) {


      rb.body(params.body, 'application/json');
    }
    return this.http.request(rb.build({
      responseType: 'json',
      accept: 'application/json'
    })).pipe(
      filter((r: any) => r instanceof HttpResponse),
      map((r: HttpResponse<any>) => {
        return r as StrictHttpResponse<Wegvakonderdeelplanning>;
      })
    );
  }

  /**
   * This method provides access to only to the response body.
   * To access the full response (for headers, for example), `save2$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  save2(params: {
      body: { 'wv'?: Wegvakonderdeelplanning, 'parentId'?: string }
  }): Observable<Wegvakonderdeelplanning> {

    return this.save2$Response(params).pipe(
      map((r: StrictHttpResponse<Wegvakonderdeelplanning>) => r.body as Wegvakonderdeelplanning)
    );
  }

  /**
   * Path part for operation getAll2
   */
  static readonly GetAll2Path = '/wegvakonderdeelplanning/unpaged';

  /**
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `getAll2()` instead.
   *
   * This method doesn't expect any request body.
   */
  getAll2$Response(params?: {

  }): Observable<StrictHttpResponse<Array<Wegvakonderdeelplanning>>> {

    const rb = new RequestBuilder(this.rootUrl, WegvakonderdeelplanningControllerService.GetAll2Path, 'get');
    if (params) {


    }
    return this.http.request(rb.build({
      responseType: 'json',
      accept: 'application/json'
    })).pipe(
      filter((r: any) => r instanceof HttpResponse),
      map((r: HttpResponse<any>) => {
        return r as StrictHttpResponse<Array<Wegvakonderdeelplanning>>;
      })
    );
  }

  /**
   * This method provides access to only to the response body.
   * To access the full response (for headers, for example), `getAll2$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  getAll2(params?: {

  }): Observable<Array<Wegvakonderdeelplanning>> {

    return this.getAll2$Response(params).pipe(
      map((r: StrictHttpResponse<Array<Wegvakonderdeelplanning>>) => r.body as Array<Wegvakonderdeelplanning>)
    );
  }

}
