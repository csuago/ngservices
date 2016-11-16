import { Component, OnInit, Injectable, Inject } from '@angular/core';
import { Http, Request, RequestOptions, RequestMethod, Response, Headers, URLSearchParams } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { StorageService, StorageType } from './storage';
import { Global } from './global';

// Routes
export enum RestApi {
    LOGIN = <any>'login',
    LOGOUT = <any>'logout'
}

export enum TypeContent {
    JSON = <any>'application/json',
    FORM = <any>'multipart/form-data',
    URL_ENCODE = <any>'application/x-www-form-urlencoded',
}

export interface RestSchema {
    url?: string | string[];
    body?: any;
    search?: any;
    header?: Headers;
    auth?: boolean;
    type?: TypeContent;
}

export class RestModel {
    url: string;
    body: any;
    search: URLSearchParams;
    header: Headers;
    auth: boolean;
    type: TypeContent;

    constructor(data: RestSchema, urlBase: string) {
        if (data != null) {
            this.url = this.buildUrl(urlBase, data.url);
            this.body = data.body;
            this.search = this.toParams(data.search);
            this.header = data.header;
            this.auth = data.auth;
            this.type = data.type;

            if (this.body != null) {
                if (this.header == null) {
                    this.header = new Headers();
                }
                if (this.type == null) {
                    this.type = TypeContent.JSON;
                }
                switch (this.type) {
                    case TypeContent.FORM:
                        this.body = this.getFormdata(this.body);
                        break;
                    case TypeContent.URL_ENCODE:
                        this.header.set('Content-Type', this.type.toString());
                        this.body = this.toParams(this.body).toString();
                        break;
                    default:
                        this.header.set('Content-Type', this.type.toString());
                        this.body = JSON.stringify(this.body);
                }
            }
        } else {
            this.url = urlBase;
        }
    }

    buildUrl(base: string, params: string | string[]): string {
        if (params != null) {
            if (Array.isArray(params)) {
                return base + "/" + (<string[]>params).join("/");
            }
            else {
                return base + '/' + params;
            }
        }
        return base;
    }

    toParams(params: any): URLSearchParams {
        let search: URLSearchParams;
        if (params != null) {
            search = new URLSearchParams();
            for (let field in params) {
                search.set(field, params[field]);
            }
        }
        return search;
    }

    getFormdata(value: any) {
        let form = new FormData();
        for (var key in value) {
            this.parseData(form, key, value[key]);
        }
        return form;
    }

    parseData(form: FormData, k: any, value: any, isArray = false) {
        if (value && Array.isArray(value)) {
            value.forEach((e: any, i: any) => {
                this.parseData(form, k + "[" + i + "]", e);
            });
        } else if (value && typeof value === "object" && !(value instanceof File)) {
            for (var key in value) {
                this.parseData(form, k + "[" + key + "]", value[key]);
            }
        } else {
            form.append(k, value);
        }
    }
}

@Injectable()
export class RestService {

    private static unknows: string = 'Error unknows';
    protected static token: any;
    protected urlBase = "http://127.0.0.1/api"; // URL base change it
    protected auth: boolean;
    private handler: any;
    private error: any;
    private req: RequestOptions;
    protected url: string;

    constructor(public http: Http, private store: StorageService) {

    }

    setBase(url: string) {
        this.urlBase = url;
    }

    base(url: string) {
        this.urlBase = url;
        return this;
    }

    setRoute(route: RestApi | string) {
        this.url = this.urlBase + route;
    }

    route(route: RestApi | string) {
        this.url = this.urlBase + route;
        return this;
    }

    clear() {
        this.token(null);
    }

    getToken() {
        return RestService.token;
    }

    token(token: string) {
        if (token == null) {
            this.auth = false;
        }
        else {
            this.auth = true;
        }
        return this;
    }

    setToken(token: string) {
        if (token == null) {
            this.auth = false;
        }
        else {
            this.auth = true;
        }
        RestService.token = token;
    }

    private setMethod(info: RestSchema, method: RequestMethod, handler?: (data: any) => void) {
        let data = new RestModel(info, this.url);

        this.auth = data.auth == null ? true : data.auth;
        this.handler = handler;

        this.req = new RequestOptions({
            method: method,
            search: data.search,
            body: data.body,
            headers: data.header,
            url: data.url
        });
    }

    login(body: any, remember: boolean) {
        this.setRoute(RestApi.LOGIN);

        let info: RestSchema = { body: body, search: { remember: remember } };

        this.setMethod(info, RequestMethod.Post, (data: any) => {
            let json = data.json();
            let storageType = remember ? StorageType.LOCAL : StorageType.SESSION;
            this.store.set('user', json.user, storageType);
            this.store.set('token', json.token, storageType);
            this.setToken(json.token);
        });
        return this;
    }

    post(info?: RestSchema) {
        this.setMethod(info, RequestMethod.Post);
        return this;
    }

    get(info?: RestSchema) {
        this.setMethod(info, RequestMethod.Get);
        return this;
    }

    update(info: RestSchema) {
        this.setMethod(info, RequestMethod.Put);
        return this;
    }

    delete(info: RestSchema) {
        this.setMethod(info, RequestMethod.Delete);
        return this;
    }

    hadlerError(search: string): any {
        let response: string;
        let section = search.split('.');
        if (section.length != 0) {
            response = this.error[section[1]][section[2]];
        }
        else {
            response = RestService.unknows;
        }
        console.error(response);
        return response;
    }

    checkToken() {
        try {
            if (RestService.token == null) {
                let local = this.store.get('token', StorageType.LOCAL);
                this.setToken(local == null ? this.store.get('token', StorageType.SESSION) : local);
            }
            if (RestService.token != null) {
                if (this.req.search == null) {
                    this.req.search = new URLSearchParams();
                }
                this.req.search.set('token', RestService.token);
            }
        }
        catch (ex) {
            console.error("ex: " + ex);
        }
    }

    response(res?: (data: Response) => void, error?: (error: any) => void, attempts: number = 0): void {
        try {
            let count = attempts;
            // Tokenization
            if (this.auth) { this.checkToken(); }

            this.http.request(new Request(this.req)).subscribe((data) => {
                if (data != null) {
                    try {
                        let json = data.json();
                        if (json != null && (json.success == null || json.success != null && json.success == true)) {
                            if (res != null) {
                                if (this.handler != null) this.handler(data);
                                res(data);
                            }
                        }
                        else {
                            //if (error != null) error(this.hadlerError(json.code));
                            if (error != null) error(data);
                            console.error(data);
                        }
                    }
                    catch (e) {
                        if (res != null) {
                            if (this.handler != null) this.handler(data);
                            res(data);
                        }
                    }
                }
            }, ex => {
                console.error(ex);
                //if (error != null) error(this.hadlerError(json.code));
                if (error != null) error(ex);
                if (attempts > 0) {
                    this.response(res, error, count--);
                }
                else if (attempts == -1) {
                    this.response(res, error, -1);
                }
            });
        } catch (ex) {
            console.error(ex);
        }
    }
}