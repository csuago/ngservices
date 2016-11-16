import { Injectable } from '@angular/core';

export enum StorageType {
    LOCAL,
    SESSION
}

@Injectable()
export class StorageService {

    private store: Storage;

    constructor() {
        this.setType(StorageType.SESSION);
    }

    type(type: StorageType) {
        if (type == StorageType.LOCAL) {
            this.store = window.localStorage;
        } else {
            this.store = window.sessionStorage;
        }
        return this;
    }

    setType(type: StorageType) {
        if (type == StorageType.LOCAL) {
            this.store = window.localStorage;
        } else {
            this.store = window.sessionStorage;
        }
    }

    checkType(st: StorageType) {
        switch (st) {
            case StorageType.LOCAL:
                this.store = window.localStorage;
                break;
            case StorageType.SESSION:
                this.store = window.sessionStorage;
                break;
        }
    }

    set(key: string, data: string | any, type?: StorageType) {

        if (type != null) this.checkType(type);

        this.store.setItem(key, typeof data != 'string' ? JSON.stringify(data) : data);
    }

    get(key: string, type?: StorageType) {
        if (type != null) this.checkType(type);
        return this.store.getItem(key);
    }

    remove(key: string, type?: StorageType) {
        if (type != null) this.checkType(type);
        this.store.removeItem(key);
    }

    key(index: number, type?: StorageType) {
        if (type != null) this.checkType(type);
        this.store.key(index);
    }

    length(type?: StorageType) {
        if (type != null) this.checkType(type);
        return this.store.length;
    }

    clear(type?: StorageType) {
        if (type != null) this.checkType(type);
        this.store.clear();
    }

}