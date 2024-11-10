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
    { name: 'fileSystem', options: { keyPath: 'name' } }
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
}