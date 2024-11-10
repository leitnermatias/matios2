import { Program } from "./program";

export const Terminal: Program = {
    title: "Terminal",
    viewport: document.createElement("div"),
    width: "400px",
    height: "400px",
    state: {
        cmd: '',
        count: 0,
        lastTimeStamp: 0
    },
    Init: async (): Promise<Program> => {
        Terminal.viewport.style.background = "black";
        Terminal.viewport.style.color = "white";
        Terminal.viewport.style.textAlign = 'left';
        Terminal.viewport.style.padding = '10px';
        Terminal.viewport.style.fontFamily = 'monospace';
        return Terminal;
    },
    Draw: async (_time: DOMHighResTimeStamp): Promise<void> => {
        Terminal.viewport.innerText = Terminal.state.count;
    },
    Update: async (time: DOMHighResTimeStamp): Promise<void> => {
        const delta = time - Terminal.state.lastTimeStamp;
        if (delta >= 3000) {
            Terminal.state.count += 1;
            Terminal.state.lastTimeStamp = time;
        }
    },
    Close: async (): Promise<void> => {
        return
    }
}