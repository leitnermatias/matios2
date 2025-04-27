import { FileSystem, SystemFile } from "@/system/file";
import { Program } from "@/system/program";
import "./style.css"

export interface TerminalCommandResult {
    input: string;
    output: string;
    style?: {
        classes?: string[];
        raw?: string;
    }
}
export type TerminalCommand = (input: string) => Promise<TerminalCommandResult>
export type DefaultCommands = { [key: string]: TerminalCommand }
export interface ParsedCommandInput {
    cmdName: string;
    args: string[];
    input: string;
}
export interface InputInformation {
    result?: TerminalCommandResult;
    paths: {
        parsed: string;
        target: SystemFile<unknown> | null;
    }[];
    parsedInput: ParsedCommandInput;
    commandOptions: {[key: string]: string};
}

export class Terminal extends Program {
    static name: string = "Terminal"
    title = 'Terminal'

    historyView = document.createElement('div')
    history: TerminalCommandResult[] = []
    cmd = ''
    currentPath = '/'
    input = document.createElement('input')
    commands: DefaultCommands = {
        help: this.help,
        clear: this.clear,
        notFound: this.notFound,
        ls: this.ls,
        cd: this.cd,
        pwd: this.pwd
    }
    cmdWrapper = document.createElement('div');
    prefix = document.createElement('span');
    constructor() {
        super()

        this.viewport.classList.add("terminal-viewport")

        // History
        this.historyView.classList.add("terminal-history-view")
        this.viewport.appendChild(this.historyView);

        // CMD box
        this.cmdWrapper.classList.add("terminal-cmd-box")

        // Prefix
        this.prefix.classList.add("terminal-prefix")
        this.prefix.innerText = `${this.currentPath} >`;
        this.cmdWrapper.appendChild(this.prefix);


        // Input
        this.input.classList.add("terminal-cmd-input")

        this.input.addEventListener('focus', () => {
            this.input.style.outline = 'none';
        });

        this.input.addEventListener('keydown', (ev) => {
            if (this.cmd !== '') return;
            if (ev.key === 'Enter') {
                this.cmd = 'enter';
            }
        });

        this.cmdWrapper.appendChild(this.input);

        this.viewport.appendChild(this.cmdWrapper);

        this.input.focus();
    }

    async Update(_time: DOMHighResTimeStamp): Promise<void> {
        if (this.cmd === 'enter') {
            const cmdName = this.input.value.split(' ')[0];
            const cmd = this.commands[cmdName] || this.commands.notFound;
            let result: TerminalCommandResult = {
                input: this.input.value,
                output: ``,
            };
            try {
                result = await cmd.call(this, this.input.value);
            } catch (error) {
                result.output = `Error while trying to execute command: ${this.input.value}
                ${error}
                `;
            }

            this.history.push({
                input: result.input,
                output: result.output,
                style: result.style,
            });
            this.input.value = '';
            this.cmd = '';
        }
    }
    
    async Draw(_time: DOMHighResTimeStamp): Promise<void> {
        this.historyView.innerHTML = '';
        this.history.forEach(cmd => {
            if (cmd.input !== '') {
                const prefix = document.createElement('span');
                prefix.innerText = `> ${cmd.input}`;
                this.historyView.appendChild(prefix);
            }
            const span = document.createElement('span');
            span.innerHTML = cmd.output;
            if (cmd.style) {
                span.style = cmd.style.raw || '';
                span.classList.add(...cmd.style.classes || [])
            }
            this.historyView.appendChild(span);
        });

        this.prefix.innerText = `${this.currentPath} >`;
    }

    async Close(): Promise<void> {
        return;
    }

    getCmdInput(input: string) {
        const splitted = input.split(" ")
        return {
            cmdName: splitted[0],
            args: splitted.slice(1),
            input
        }
    }

    normalizePath(path: string) {
        const segments = path.split('/');
        const stack: string[] = [];
      
        for (const segment of segments) {
          if (segment === '' || segment === '.') {
            continue;
          } else if (segment === '..') {
            if (stack.length) {
              stack.pop();
            }
          } else {
            stack.push(segment);
          }
        }
      
        return '/' + stack.join('/');
    }

    pathContainsRelativeReference(path: string) {
        return path.split("/").some(portion => portion === '..')
    }

    async getInputInformation(input: string, options: {
        invalidOutput?: string,
        pathIndexes?: number[],
        validations: ((inputInformation: InputInformation) => TerminalCommandResult | void)[],
    }) {
        const information: InputInformation = {
            parsedInput: this.getCmdInput(input),
            paths: [],
            commandOptions: {}
        }

        if (options.pathIndexes) {
            for (const argNum of options.pathIndexes) {
                const rawPath = information.parsedInput.args[argNum]
                const parsed = this.normalizePath(rawPath)
                const target = !!rawPath ? await FileSystem.GetByPath(parsed) : null
                
                information.paths.push({
                    parsed,
                    target,
                })
            }
        }

        for (const arg of information.parsedInput.args) {
            if (arg.startsWith('--')) {
                const splitted = arg.slice(2).split('=')

                if (splitted.length < 2) continue

                const name = splitted[0]
                const value = splitted.slice(1).join("=")

                information.commandOptions[name] = value
            }
        }

        for (const validation of options.validations) {
            const failedValidationResult = validation.call(this, information)

            if (failedValidationResult) {
                information.result = failedValidationResult;
                break;
            }
        }

        return information;
    }

    // Commands

    async help(input: string): Promise<TerminalCommandResult> {
        const dontShow = ['notFound']
        const availableCommands = Object.keys(this.commands)
            .filter(c => !dontShow.includes(c))
            .map((c) => `- ${c}`)
            .join(`
            `)
        let output = `
        To receive help for a particular command, type help <command name>

        Available commands:
        ${availableCommands}
        `;

        return {
            input,
            output
        };
    }

    async clear(_input: string): Promise<TerminalCommandResult> {
        this.history = [];
        this.historyView.innerHTML = '';
        return {
            input: '',
            output: '',
        };
    }

    async notFound(input: string): Promise<TerminalCommandResult> {
        return {
            input,
            output: `The command ${input.split(' ')[0]} does not exist.`
        }
    }

    async ls(input: string): Promise<TerminalCommandResult> {
        const inputInformation = await this.getInputInformation(input, {
            validations: [
                (inputInformation) => {
                    if (inputInformation.parsedInput.args.length > 1 && Object.keys(inputInformation.commandOptions).length === 0) {
                        return {
                            input,
                            output: `Invalid number of arguments for ls (${inputInformation.parsedInput.args.length})`,
                            style: {
                                raw: 'color: red;'
                            }
                        }
                    }

                    if (!inputInformation.paths[0]?.target && inputInformation.parsedInput.args.length > 0) {
                        return {
                            input,
                            output: `${inputInformation.paths[0]?.parsed} was not found in the system`,
                            style: {
                                raw: 'color: red;'
                            }
                        };
                    }
                }
            ],
            pathIndexes: [0]
        })

        if (inputInformation.result) return inputInformation.result;

        const target = inputInformation.paths[0]?.target || await FileSystem.GetByPath(this.currentPath)


        const childrens = await FileSystem.GetById(...target!.children);
        return {
            input,
            output: childrens.map(c => c.name).join('  ')
        };
    }

    async cd(input: string): Promise<TerminalCommandResult> {
        const inputInformation = await this.getInputInformation(input, {
            validations: [
                (inputInformation) => {
                    if (!inputInformation.paths[0]?.target) {
                        return {
                            input,
                            output: `Invalid path for ${inputInformation.paths[0]?.parsed}`,
                            style: {
                                raw: `color: red;`
                            }
                        }
                    }
                }
            ],
            pathIndexes: [0]
        })

        if (inputInformation.result) return inputInformation.result
        
        if (inputInformation.parsedInput.args[0] === "..") {
            const splitted = this.currentPath.split("/")
            if (splitted.length === 2) {
                this.currentPath = "/"
                return {
                    input,
                    output: ``
                }
            }

            const previousPath = splitted.slice(0, -1).join("/")

            if (previousPath) this.currentPath = previousPath
        } else {
            const path = inputInformation.paths[0]

            this.currentPath = path.parsed
        }

        return {
            input,
            output: ``
        }
    }

    async pwd(input: string): Promise<TerminalCommandResult> {
        return {
            input,
            output: this.currentPath
        }
    }
}

Terminal.icon = document.createElement("span")
Terminal.icon.innerText = "T"
Terminal.icon.style.fontSize = "43px"
Terminal.icon.style.color = "red"

export default Terminal