import { FileSystem } from "../system/file";
import { Program } from "../system/program";

export interface TerminalCommandResult {
    input: string;
    output: string;
}
export type TerminalCommand = (input: string) => Promise<TerminalCommandResult>

export interface TerminalState {
    historyView: HTMLDivElement;
    history: TerminalCommandResult[],
    cmd: string;
    currentPath: string;
    input: HTMLInputElement;
    keyMap: { [key: string]: boolean };
    lastTimeStamp: number;
    defaultCommands: { [key: string]: { f: TerminalCommand, help: string } }
}

export class Terminal extends Program<TerminalState> {
    constructor() {
        super({
            title: "Terminal",
            viewport: document.createElement("div"),
            width: `${window.innerWidth / 2}px`,
            height: `${window.innerHeight / 2}px`,
            state: {
                historyView: document.createElement('div'),
                history: [],
                cmd: '',
                currentPath: '/',
                input: document.createElement('input'),
                keyMap: {},
                lastTimeStamp: 0,
                defaultCommands: {
                    help: {
                        f: async (input) => {
                            let output = `
                                To receive help for a particular command, type help <command name>
            
                                Available default commands:
                                - clear
                                - ls
                                - cd
                                - help
                            `;

                            const splitted = input.split(" ");

                            if (splitted.length > 1) {
                                const cmdName = splitted[1];
                                const cmd = this.state.defaultCommands[cmdName];

                                if (cmd && cmd.help !== '') {
                                    output = cmd.help;
                                } else {
                                    output = `${cmdName} is not a valid command or it doesn't provide any help information.`;
                                }
                            }

                            return {
                                input,
                                output
                            };
                        },
                        help: ``
                    },
                    notFound: {
                        f: async (input) => ({ input, output: `The command ${input.split(' ')[0]} does not exist.` }),
                        help: ``
                    },
                    clear: {
                        f: async () => {
                            this.state.history = [];
                            this.state.historyView.innerHTML = '';
                            return {
                                input: '',
                                output: ''
                            };
                        },
                        help: `Removes all previous output from the terminal and cleans up the history.`
                    },
                    cd: {
                        f: async (input) => {
                            return {
                                input,
                                output: 'Not implemented yet'
                            };
                        },
                        help: `Moves the current position in the filesystem to a new one
                               Usage: cd <path>
                        `
                    },
                    ls: {
                        f: async (input) => {
                            const parsed = this.getCmdInput(input);

                            if (!parsed.args || parsed.args.length > 1) {
                                return {
                                    input,
                                    output: `Invalid number of arguments for ls.
                                             Type help ls for information about usage.
                                    `
                                };
                            }

                            const isRelative = parsed.args[0]?.startsWith('./') || !parsed.args[0]?.startsWith('/');
                            const isCurrentDirectoryPath = isRelative && !parsed.args[0]?.startsWith('./') && !parsed.args[0]?.startsWith('/');

                            let path = this.state.currentPath;
                            if (parsed.args?.length >= 1 && !isRelative) {
                                path = parsed.args[0];
                            } else if (parsed.args?.length > 0) {
                                const relativePath = parsed.args[0].split('/').slice(isCurrentDirectoryPath ? 0 : 1).join('/');
                                path = `${this.state.currentPath === '/' ? '' : this.state.currentPath}/${relativePath}`;
                            }

                            const target = await FileSystem.GetByPath(path);

                            if (!target) {
                                return {
                                    input,
                                    output: `${path} was not found in the system`
                                };
                            } else {
                                const childrens = await FileSystem.GetById(...target.children);
                                return {
                                    input,
                                    output: childrens.map(c => c.name).join('  ')
                                };
                            }



                        },
                        help: `Shows the contents of the given path in the filesystem
                               Usage:
                               - For showing the contents of the current position: ls
                               - For showing the contents of a particular path: ls <path>
                        `
                    },
                    mkdir: {
                        f: async (input) => {
                            const parsed = this.getCmdInput(input);

                            if (parsed.args.length !== 1) {
                                return {
                                    input,
                                    output: `Invalid number of arguments for mkdir. 
                                             Type help mkdir for information about usage.`
                                };
                            }

                            return {
                                input,
                                output: `${JSON.stringify(parsed)}`
                            };
                        },
                        help: `Creates a directory in the given path
                               Usage: mkdir <path>
                        `
                    }
                }
            },
        })

        const viewportStyle = this.viewport.style;
        viewportStyle.background = "#00000031";
        viewportStyle.color = "white";
        viewportStyle.textAlign = 'left';
        viewportStyle.padding = '10px';
        viewportStyle.fontFamily = 'monospace';
        viewportStyle.overflow = 'scroll';

        // History
        this.state.historyView.style.display = 'flex';
        this.state.historyView.style.flexDirection = 'column';
        this.viewport.appendChild(this.state.historyView);


        // CMD box
        const cmdWrapper = document.createElement('div');
        cmdWrapper.style.display = 'flex';
        cmdWrapper.style.alignItems = 'center';
        cmdWrapper.style.width = "100%";

        // Prefix
        const prefix = document.createElement('span');
        prefix.style.marginRight = '2px';
        prefix.style.color = 'green';
        prefix.style.flexShrink = '0';
        prefix.innerText = `${this.state.currentPath} >`;
        cmdWrapper.appendChild(prefix);


        // Input
        const inputStyle = this.state.input.style;
        inputStyle.color = "green";
        inputStyle.background = "transparent";
        inputStyle.border = "none";
        inputStyle.flex = '1'; // Ensures the input takes up remaining space
        inputStyle.width = '100%'; // Fills remaining space in cmdWrapper

        this.state.input.addEventListener('focus', () => {
            inputStyle.outline = 'none';
        });

        this.state.input.addEventListener('keydown', (ev) => {
            if (this.state.cmd !== '') return;
            this.state.keyMap[ev.key] = true;
            if (ev.key === 'Enter') {
                this.state.cmd = 'enter';
            }
        });

        this.state.input.addEventListener('keyup', (ev) => {
            delete this.state.keyMap[ev.key];
        });

        cmdWrapper.appendChild(this.state.input);

        this.viewport.appendChild(cmdWrapper);

        this.state.input.focus();
    }

    async Update(_time: DOMHighResTimeStamp): Promise<void> {
        // SYSTEM.DEBUG.innerText = JSON.stringify(this.state)
        if (this.state.cmd === 'enter') {
            const cmdName = this.state.input.value.split(' ')[0];
            const cmd = this.state.defaultCommands[cmdName] || this.state.defaultCommands.notFound;
            let result = {
                input: this.state.input.value,
                output: ``
            };
            try {
                result = await cmd.f(this.state.input.value);
            } catch (error) {
                result.output = `Error while trying to execute command: ${this.state.input.value}
                ${error}
                `;
            }

            this.state.history.push({
                input: result.input,
                output: result.output
            });
            this.state.input.value = '';
            this.state.cmd = '';
        }
        this.state.lastTimeStamp = 0;
    }
    async Draw(_time: DOMHighResTimeStamp): Promise<void> {
        this.state.historyView.innerHTML = '';
        this.state.history.forEach(cmd => {
            if (cmd.input !== '') {
                const prefix = document.createElement('span');
                prefix.innerText = `> ${cmd.input}`;
                this.state.historyView.appendChild(prefix);
            }
            const span = document.createElement('span');
            span.innerText = cmd.output;
            this.state.historyView.appendChild(span);
        });
    }
    async Close(): Promise<void> {
        return;
    }


    getCmdInput(input: string) {
        const splitted = input.split(" ")
        return {
            cmdName: splitted[0],
            args: splitted.slice(1)
        }
    }
}
