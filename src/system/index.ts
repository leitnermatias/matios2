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
    container.style.width = program.width;
    container.style.height = program.height;
    container.style.border = "1px solid white"
    container.style.borderTop = "none"
    container.style.position = "absolute"
    program.viewport.style.height = "inherit"

    const topBar = document.createElement("nav")
    const resizers = [
        document.createElement("div"),
        document.createElement("div"),
        document.createElement("div"),
        document.createElement("div"),
    ]

    resizers[0].className = "resize-handle top-left"
    resizers[1].className = "resize-handle top-right"
    resizers[2].className = "resize-handle bottom-left"
    resizers[3].className = "resize-handle bottom-right"

    let isResizing = false;
    let currentHandle: HTMLElement | null = null;
    let initialMouseX = 0;
    let initialMouseY = 0;
    let initialWidth = 0;
    let initialHeight = 0;
    let initialLeft = 0;
    let initialTop = 0;

    function resize(e: MouseEvent): void {
        if (!isResizing || !currentHandle) return;
      
        const dx = e.clientX - initialMouseX;
        const dy = e.clientY - initialMouseY;
      
        if (currentHandle.classList.contains("top-left")) {
          container.style.width = `${initialWidth - dx}px`;
          container.style.height = `${initialHeight - dy}px`;
          container.style.left = `${initialLeft + dx}px`;
          container.style.top = `${initialTop + dy}px`;
        } else if (currentHandle.classList.contains("top-right")) {
          container.style.width = `${initialWidth + dx}px`;
          container.style.height = `${initialHeight - dy}px`;
          container.style.top = `${initialTop + dy}px`;
        } else if (currentHandle.classList.contains("bottom-left")) {
          container.style.width = `${initialWidth - dx}px`;
          container.style.height = `${initialHeight + dy}px`;
          container.style.left = `${initialLeft + dx}px`;
        } else if (currentHandle.classList.contains("bottom-right")) {
          container.style.width = `${initialWidth + dx}px`;
          container.style.height = `${initialHeight + dy}px`;
        }
      }
      
      function stopResize(): void {
        isResizing = false;
        currentHandle = null;
        window.removeEventListener("mousemove", resize);
        window.removeEventListener("mouseup", stopResize);
      }

    resizers.forEach(handle => {
        handle.addEventListener("mousedown", (e) => {
            e.preventDefault();
            isResizing = true;
            currentHandle = e.target as HTMLElement;
            
            initialMouseX = e.clientX;
            initialMouseY = e.clientY;
            const rect = container.getBoundingClientRect();
            initialWidth = rect.width;
            initialHeight = rect.height;
            initialLeft = rect.left;
            initialTop = rect.top;
            
            window.addEventListener("mousemove", resize);
            window.addEventListener("mouseup", stopResize);
        });

        container.appendChild(handle)
    })
    
    // Top bar title
    const programTitle = document.createElement("span")
    programTitle.innerText = program.title
    programTitle.style.paddingLeft = '5px'
    programTitle.style.color = "black"
    programTitle.style.fontWeight = "600"
    programTitle.style.width = "100%"
    programTitle.style.textAlign = "left"
    topBar.appendChild(programTitle)

    // Top bar buttons
    const closeButton = document.createElement("button")
    closeButton.style.background = 'white'
    closeButton.style.alignSelf = 'center'
    closeButton.style.marginRight = '5px'
    closeButton.style.color = "red"
    closeButton.style.fontWeight = "600"
    closeButton.style.cursor = "pointer"
    closeButton.innerText = 'X'

    topBar.appendChild(closeButton)
    

    // Top bar styles
    topBar.style.position = "relative"
    topBar.style.top = "1px"
    topBar.style.width = "inherit"
    topBar.style.height = "25px"
    topBar.style.background = "white"
    topBar.style.display = 'flex'

    // Top bar actions
    closeButton.addEventListener("click", async () => {
        await program.Close()

        const systemProgram = SYSTEM.programs.findIndex(p => p.id === program.id)

        container.remove()

        SYSTEM.programs.splice(systemProgram, 1)
    })

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


    container.appendChild(topBar)
    container.appendChild(program.viewport)
    
    SYSTEM.appDiv.appendChild(container)

    SYSTEM.programs.push(program)
}