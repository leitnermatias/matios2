import { SYSTEM } from "@/system";

export enum SystemFileType {
    DIRECTORY = 'directory',
    FILE = 'file'
}

export class SystemFile<T> {
    id: string;
    name: string;
    contents: T;
    type: SystemFileType;
    children: string[];
    parent: string;
    path?: string = '';

    private constructor(args: {
        id?: string;
        name: string;
        contents: T;
        type: SystemFileType;
        children: string[];
        parent: string;
    }) {
        this.id = args.id ? args.id : crypto.randomUUID()
        this.name = args.name;
        this.contents = args.contents;
        this.type = args.type;
        this.children = args.children;
        this.parent = args.parent;
    }

    async getPath() {
        const hierarchy: SystemFile<T>[] = [];
        let currentFile: SystemFile<T> | null = this;

        while (currentFile) {
            if (currentFile.name !== '/') hierarchy.unshift(currentFile);
            if (currentFile.parent) {
                const queryResult: SystemFile<any>[] = await FileSystem.GetById(currentFile.parent)

                if (queryResult.length > 0) {
                    currentFile = queryResult[0]
                } else {
                    currentFile = null
                }
            } else {
                currentFile = null
            }
        }
        const path = hierarchy.map(systemFile => systemFile.name).join('/')
        return `/${path}`;
    }

    async save(): Promise<void> {
        this.path = await this.getPath()
        await FileSystem.Save(this)
    }

    async childOf(of: SystemFile<any>) {
        this.parent = of.id;
        of.children.push(this.id)
        await this.save()
        await of.save()
    }

    static async Create<T>(args: {
        id?: string;
        name: string;
        contents: T;
        type: SystemFileType;
        children: string[];
        parent: string;
    }) {
        const sf = new SystemFile<T>(args)
        sf.path = await sf.getPath()
        return sf
    }
}

export class FileSystem {
    static async GetById<T>(...ids: string[]): Promise<SystemFile<T>[]> {
        return new Promise(async (resolve) => {
            const transaction = SYSTEM.idb.transaction('fileSystem', 'readonly')
            const store = transaction.objectStore('fileSystem')

            const results = await Promise.all(ids.map(id => {
                return new Promise<SystemFile<T> | null>((resolve) => {
                    const getRequest: IDBRequest<SystemFile<T>> = store.get(id);
                    getRequest.onsuccess = () => resolve(getRequest.result);
                    getRequest.onerror = () => resolve(null);
                });
            }));

            resolve(results.filter(r => !!r))
        })
    }

    static async GetByPath<T>(path: string): Promise<SystemFile<T> | null> {
        return new Promise((resolve) => {
            const transaction = SYSTEM.idb.transaction('fileSystem', 'readonly')
            const store = transaction.objectStore('fileSystem')
            const index = store.index("pathIndex")
            const request = index.get(path)

            request.onsuccess = async () => {
                if (!request.result) return resolve(null)
                const result: SystemFile<T> = await SystemFile.Create<T>(request.result)
                resolve(result)
            }

            request.onerror = () => {
                resolve(null)
            }
        })
    }

    static async Delete(ids: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const transaction = SYSTEM.idb.transaction('fileSystem', 'readwrite')
            const store = transaction.objectStore('fileSystem')

            const deletePromises = ids.map(id => {
                return new Promise<void>((resolve, reject) => {
                    const request = store.delete(id);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);

            Promise.all(deletePromises).then(() => resolve()).catch(reject);
        })
    }

    static async Save(systemFile: SystemFile<any>): Promise<void> {
        return new Promise((resolve, reject) => {
            const transaction = SYSTEM.idb.transaction('fileSystem', 'readwrite');
            const store = transaction.objectStore('fileSystem');

            const request = store.put(systemFile);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event) => {
                reject((event.target as IDBRequest)?.error);
            };
        });
    }

    static async GetRoot(): Promise<SystemFile<any> | null> {
        return await this.GetByPath('/')
    }
}

export default {
    SystemFile,
    FileSystem
}