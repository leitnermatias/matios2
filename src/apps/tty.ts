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
    defaultCommands: { [key: string]: { f: TerminalCommand, help: string } }
}

export const Terminal: Program<TerminalState> = {
    title: "Terminal",
    viewport: document.createElement("div"),
    width: `${window.innerWidth / 2}px`,
    height: `${window.innerHeight / 2}px`,
    state: {
        historyView: document.createElement('div'),
        history: [],
        cmd: '',
        input: document.createElement('input'),
        keyMap: {},
        lastTimeStamp: 0,
        defaultCommands: {
            help: {
                f: (input) => {
                    let output = `
                        To receive help for a particular command, type help <command name>
    
                        Available default commands:
                        - clear
                        - ls
                        - cd
                        - help
                    `

                    const splitted = input.split(" ")

                    if (splitted.length > 1) {
                        const cmdName = splitted[1]
                        const cmd = Terminal.state.defaultCommands[cmdName]

                        if (cmd && cmd.help !== '') {
                            output = cmd.help
                        } else {
                            output = `${cmdName} is not a valid command or it doesn't provide any help information.`
                        }
                    }

                    return {
                        input,
                        output
                    }
                },
                help: ``
            },
            notFound: {
                f: (input) => ({ input, output: `The command ${input.split(' ')[0]} does not exist.` }),
                help: ``
            },
            clear: {
                f: () => {
                    Terminal.state.history = []
                    Terminal.state.historyView.innerHTML = ''
                    return {
                        input: '',
                        output: ''
                    }
                },
                help: `Removes all previous output from the terminal and cleans up the history.`
            },
            cd: {
                f: (input) => {
                    return {
                        input,
                        output: 'Not implemented yet'
                    }
                },
                help: `Moves the current position in the filesystem to a new one
                       Usage: cd <path>
                `
            },
            ls: {
                f: (input) => {
                    return {
                        input,
                        output: `Not  implemented yet`
                    }
                },
                help: `Shows the contents of the given path in the filesystem
                       Usage:
                       - For showing the contents of the current position: ls
                       - For showing the contents of a particular path: ls <path>
                `
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
        prefix.style.color = 'green'
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

            const result = cmd.f(Terminal.state.input.value)

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