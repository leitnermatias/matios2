import { SYSTEM } from "../system";

export class SystemFile<T> {
    name: string;
    contents: T;
    path: string;

    constructor(args: {
        name: string;
        contents: T;
        path: string;
    }) {
        this.name = args.name;
        this.contents = args.contents;
        this.path = args.path;
    }

    async save(): Promise<void> {
        return new Promise((resolve, reject) => {
            const transaction = SYSTEM.idb.transaction('fileSystem', 'readwrite');
            const store = transaction.objectStore('fileSystem');
            store.put(this);

            store.transaction.oncomplete = () => {
                resolve()
            }

            store.transaction.onerror = () => {
                reject()
            }
        
        })

    }
}

export class FileSystem {
    static async Get<T>(name: string): Promise<SystemFile<T>> {
        return new Promise((resolve, reject) => {
            const transaction = SYSTEM.idb.transaction('fileSystem', 'readonly')
            const store = transaction.objectStore('fileSystem')
            const request = store.get(name)
    
            request.onsuccess = () => {
                const result: SystemFile<T> = request.result 
    
                resolve(result)
            }

            request.onerror = () => {
                reject()
            }
        })
    }
}

export default {
    SystemFile,
    FileSystem
}