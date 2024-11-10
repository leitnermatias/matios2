import { Program } from "./program";

export const Terminal: Program = {
    id: "Terminal",
    viewport: document.createElement("div"),
    state: {
        cmd: '',
        count: 0,
        lastTimeStamp: 0
    },
    Init: async (): Promise<Program> => {
        Terminal.viewport.style.width = "400px"
        Terminal.viewport.style.height = "400px"
        Terminal.viewport.style.background = "black"
        Terminal.viewport.style.color = "white"
        Terminal.viewport.style.textAlign = 'left'
        Terminal.viewport.style.padding = '10px'
        Terminal.viewport.style.fontFamily = 'monospace'
        return Terminal
    },
    Draw: async (time: DOMHighResTimeStamp): Promise<void> => {

        const delta = time - Terminal.state.lastTimeStamp
        
        if (delta >= 3000) {
            Terminal.state.count += 1
            Terminal.viewport.innerText = Terminal.state.count
            Terminal.state.lastTimeStamp = time
        }
    }
}