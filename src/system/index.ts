import utils from "../utils";
import { Program } from "./program";
import { FileSystem, SystemFile, SystemFileType } from "./file";

export interface System {
  idb: IDBDatabase;
  appDiv: HTMLDivElement;
  programs: Program<any>[];
  DEBUG: HTMLElement;
  fsRootId: string;
}

export interface IDBTable {
  name: string;
  options?: IDBObjectStoreParameters;
  indexes: { name: string, keyPath: string | string[], options?: IDBIndexParameters }[]
}

export async function initIDB(tables: IDBTable[]): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('system', 2);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      tables.forEach(table => {
        if (!db.objectStoreNames.contains(table.name)) {
          const store = db.createObjectStore(table.name, table.options)

          table.indexes.forEach(index => {
            store.createIndex(index.name, index.keyPath, index.options)
          })
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
    { name: 'fileSystem', options: { keyPath: 'id' }, indexes: [{ name: 'pathIndex', keyPath: 'path', options: { unique: true } }] }
  ])

  const appDiv = utils.$<HTMLDivElement>("#app")

  const debug = document.createElement("div")

  appDiv?.appendChild(debug)

  if (!appDiv) throw new Error(`#app div is not present at system init`)

  SYSTEM = {
    idb,
    appDiv,
    programs: [],
    DEBUG: debug,
    fsRootId: '',
  }

  const systemInfo = document.createElement("p")
  systemInfo.innerText = `IDB Version: ${idb.version}`
  SYSTEM.appDiv.appendChild(systemInfo)

  const fsRoot = await FileSystem.GetRoot()

  SYSTEM.fsRootId = fsRoot?.id || ''
  if (!fsRoot) {
    const newFsRoot = await SystemFile.Create({
      name: '/',
      contents: null,
      type: SystemFileType.DIRECTORY,
      children: [],
      parent: ""
    })

    const defaultSystemDirectories = [
      await SystemFile.Create({
        name: 'tmp',
        contents: null,
        type: SystemFileType.DIRECTORY,
        children: [],
        parent: newFsRoot.id,
      }),
      await SystemFile.Create({
        name: 'proc',
        contents: null,
        type: SystemFileType.DIRECTORY,
        children: [],
        parent: newFsRoot.id,
      }),
      await SystemFile.Create({
        name: 'init',
        contents: null,
        type: SystemFileType.DIRECTORY,
        children: [],
        parent: newFsRoot.id,
      }),
    ]

    for (const sysDir of defaultSystemDirectories) {
      await sysDir.save()
      newFsRoot.children.push(sysDir.id)
    }

    await newFsRoot.save()
    SYSTEM.fsRootId = newFsRoot.id
  } else {
    const proc = await FileSystem.GetByPath("/proc")

    if (!proc) throw new Error(`proc folder was not found at startup`)

    await FileSystem.Delete(proc.children)
    proc.children = []
    await proc.save()
  }

  return SYSTEM
}

export async function startProgram(program: Program<any>) {
  program.id = crypto.randomUUID()

  const container = document.createElement("div")

  container.classList.add("program-container")
  container.style.width = program.width;
  container.style.height = program.height;
  program.viewport.style.height = "inherit"

  const topBar = document.createElement("nav")
  const resizer = document.createElement("div")

  resizer.classList.add("resize-handle", "bottom-right")

  // Top bar title
  const programTitle = document.createElement("span")
  programTitle.innerText = program.title
  programTitle.classList.add("program-title")
  topBar.appendChild(programTitle)

  // Top bar buttons
  const closeButton = document.createElement("button")
  closeButton.classList.add("program-top-bar-button")
  closeButton.innerText = 'X'

  topBar.classList.add("program-top-bar")
  topBar.appendChild(closeButton)


  // Close button
  closeButton.addEventListener("click", async () => {
    await program.Close()

    const proc = await FileSystem.GetByPath("/proc")

    if (!proc) throw new Error(`proc folder was not found at startup`)

    const processId = proc.children.find(p => p === program.id)
    if (!processId) throw new Error(`No program with id ${program.id} found in proc`)
    proc.children = proc.children.filter(c => c !== program.id)
    await FileSystem.Delete([processId])
    await proc.save()

    const systemProgram = SYSTEM.programs.findIndex(p => p.id === program.id)

    container.remove()

    SYSTEM.programs.splice(systemProgram, 1)
  })

  // Drag window
  let dragging = false
  topBar.addEventListener("mousedown", () => {
    dragging = true
  })

  window.addEventListener("mouseup", () => {
    dragging = false
  })

  window.addEventListener("mousemove", (ev) => {
    if (!dragging) return
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    let newLeft = ev.clientX - containerWidth / 2;
    let newTop = ev.clientY;

    newLeft = Math.max(0, Math.min(newLeft, viewportWidth - containerWidth));
    newTop = Math.max(0, Math.min(newTop, viewportHeight - containerHeight));

    container.style.left = `${newLeft}px`;
    container.style.top = `${newTop}px`;
  })

  // Resize window
  let isResizing = false;
  let initialMouseX = 0;
  let initialMouseY = 0;
  let initialWidth = 0;
  let initialHeight = 0;

  resizer.addEventListener("mousedown", (e: MouseEvent) => {
    e.preventDefault();
    isResizing = true;

    initialMouseX = e.clientX;
    initialMouseY = e.clientY;
    const rect = container.getBoundingClientRect();
    initialWidth = rect.width;
    initialHeight = rect.height;

    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResize);
  });

  function resize(e: MouseEvent): void {
    if (!isResizing) return;

    const dx = e.clientX - initialMouseX;
    const dy = e.clientY - initialMouseY;

    const newWidth = Math.max(initialWidth + dx, 100);
    const newHeight = Math.max(initialHeight + dy, 100);

    container.style.width = `${newWidth}px`;
    container.style.height = `${newHeight}px`;
  }

  function stopResize(): void {
    isResizing = false;
    window.removeEventListener("mousemove", resize);
    window.removeEventListener("mouseup", stopResize);
  }


  container.appendChild(topBar)
  container.appendChild(resizer)
  container.appendChild(program.viewport)

  SYSTEM.appDiv.appendChild(container)

  SYSTEM.programs.push(program)

  const proc = await FileSystem.GetByPath("/proc")
  if (proc) {
    const process = await SystemFile.Create({
      id: program.id,
      name: `${program.title}-${program.id}`,
      contents: null,
      type: SystemFileType.DIRECTORY,
      children: [],
      parent: proc.id,
    })
    await process.childOf(proc)
  } else {
    console.warn("No proc folder was found in the system")
  }

}