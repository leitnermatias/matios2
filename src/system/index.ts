import utils from "../utils";
import { Program } from "./program";

export interface System {
    idb: IDBDatabase;
    appDiv: HTMLDivElement;
    programs: Program[]
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

    const appDiv = utils.$<HTMLDivElement>("#app")

    if (!appDiv) throw new Error(`#app div is not present at system init`)

    SYSTEM = {
        idb,
        appDiv,
        programs: []
    }

    return SYSTEM
}

export async function startProgram(newProgram: Program) {
    const program = await newProgram.Init()
    program.id = crypto.randomUUID()

    const container = document.createElement("div")

    container.style.display = "flex"
    container.style.flexDirection = "column"

    const topBar = document.createElement("nav")
    topBar.style.position = "relative"
    topBar.style.top = "1px"
    topBar.style.width = "100%"
    topBar.style.height = "25px"
    topBar.style.background = "gray"

    container.appendChild(topBar)
    container.appendChild(program.viewport)
    
    SYSTEM.appDiv.appendChild(container)

    SYSTEM.programs.push(program)
}