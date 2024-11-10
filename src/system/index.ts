export interface System {
    idb: IDBDatabase;
}

export interface IDBTable {
    name: string;
    options?: IDBObjectStoreParameters
}

export async function initIDB(tables: IDBTable[]): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('system', 1);
    
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          tables.forEach(table => {
            if (!db.objectStoreNames.contains(table.name)) {
                db.createObjectStore(table.name, table.options)
            }
          })
        };
    
        request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
        request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
      });
}

export let SYSTEM: System;

export async function initSystem(): Promise<System> {
    const idb = await initIDB([
        {name: 'fileSystem', options: {keyPath: 'name'}}
    ])

    SYSTEM = {
        idb
    }

    return SYSTEM
}