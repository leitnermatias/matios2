import { Program } from "../system/program";

export interface TerminalCommandResult {
    input: string;
    output: string;
}
export type TerminalCommand = (input: string) => TerminalCommandResult

export interface TerminalState {
    historyView: HTMLDivElement;
    history: TerminalCommandResult[],
    cmd: string;
    input: HTMLInputElement;
    keyMap: { [key: string]: boolean };
    lastTimeStamp: number;
    defaultCommands: { [key: string]: TerminalCommand }
}

export const Terminal: Program<TerminalState> = {
    title: "Terminal",
    viewport: document.createElement("div"),
    width: "400px",
    height: "400px",
    state: {
        historyView: document.createElement('div'),
        history: [],
        cmd: '',
        input: document.createElement('input'),
        keyMap: {},
        lastTimeStamp: 0,
        defaultCommands: {
            notFound: (input) => ({ input, output: `The command ${input.split(' ')[0]} does not exist.` }),
            clear: () => {
                Terminal.state.history = []
                Terminal.state.historyView.innerHTML = ''
                return {
                    input: '',
                    output: ''
                }
            }
        }
    },
    Init: async (): Promise<Program<TerminalState>> => {
        const viewportStyle = Terminal.viewport.style
        viewportStyle.background = "black";
        viewportStyle.color = "white";
        viewportStyle.textAlign = 'left';
        viewportStyle.padding = '10px';
        viewportStyle.fontFamily = 'monospace';
        viewportStyle.overflow = 'scroll';

        // History
        Terminal.state.historyView.style.display = 'flex'
        Terminal.state.historyView.style.flexDirection = 'column'
        Terminal.viewport.appendChild(Terminal.state.historyView)


        // CMD box
        const cmdWrapper = document.createElement('div')
        cmdWrapper.style.display = 'flex'
        cmdWrapper.style.alignItems = 'center'
        const prefix = document.createElement('span')
        prefix.style.marginRight = '2px'
        prefix.innerText = '>'
        cmdWrapper.appendChild(prefix)


        // Input
        const inputStyle = Terminal.state.input.style
        inputStyle.color = "green"
        inputStyle.background = "transparent"
        inputStyle.border = "none"
        inputStyle.width = '100%'

        Terminal.state.input.addEventListener('focus', () => {
            inputStyle.outline = 'none';
        });

        Terminal.state.input.addEventListener('keydown', (ev) => {
            if (Terminal.state.cmd !== '') return
            Terminal.state.keyMap[ev.key] = true
            if (ev.key === 'Enter') {
                Terminal.state.cmd = 'enter'
            }
        })

        Terminal.state.input.addEventListener('keyup', (ev) => {
            delete Terminal.state.keyMap[ev.key]
        })

        cmdWrapper.appendChild(Terminal.state.input)

        Terminal.viewport.appendChild(cmdWrapper)

        Terminal.state.input.focus()

        return Terminal;
    },
    Draw: async (_time: DOMHighResTimeStamp): Promise<void> => {
        Terminal.state.historyView.innerHTML = ''
        Terminal.state.history.forEach(cmd => {
            if (cmd.input !== '') {
                const prefix = document.createElement('span')
                prefix.innerText = `> ${cmd.input}`
                Terminal.state.historyView.appendChild(prefix)
            }
            const span = document.createElement('span')
            span.innerText = cmd.output
            Terminal.state.historyView.appendChild(span)
        })
    },
    Update: async (_time: DOMHighResTimeStamp): Promise<void> => {
        // SYSTEM.DEBUG.innerText = JSON.stringify(Terminal.state)
        if (Terminal.state.cmd === 'enter') {
            const cmdName = Terminal.state.input.value.split(' ')[0]
            const cmd = Terminal.state.defaultCommands[cmdName] || Terminal.state.defaultCommands.notFound

            const result = cmd(Terminal.state.input.value)

            Terminal.state.history.push({
                input: result.input,
                output: result.output
            })
            Terminal.state.input.value = ''
            Terminal.state.cmd = ''
        }
        Terminal.state.lastTimeStamp = 0;
    },
    Close: async (): Promise<void> => {
        return
    }
}