import { FileSystem, SystemFile } from "@/system/file";
import { Program } from "@/system/program";
import "./style.css"

export interface TerminalCommandResult {
    input: string;
    output: string;
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
        isRelative: boolean;
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
    }
    constructor() {
        super()

        this.viewport.classList.add("terminal-viewport")

        // History
        this.historyView.classList.add("terminal-history-view")
        this.viewport.appendChild(this.historyView);

        // CMD box
        const cmdWrapper = document.createElement('div');
        cmdWrapper.classList.add("terminal-cmd-box")

        // Prefix
        const prefix = document.createElement('span');
        prefix.classList.add("terminal-prefix")
        prefix.innerText = `${this.currentPath} >`;
        cmdWrapper.appendChild(prefix);


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

        cmdWrapper.appendChild(this.input);

        this.viewport.appendChild(cmdWrapper);

        this.input.focus();
    }

    async Update(_time: DOMHighResTimeStamp): Promise<void> {
        if (this.cmd === 'enter') {
            const cmdName = this.input.value.split(' ')[0];
            const cmd = this.commands[cmdName] || this.commands.notFound;
            let result = {
                input: this.input.value,
                output: ``
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
                output: result.output
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
            span.innerText = cmd.output;
            this.historyView.appendChild(span);
        });
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

    isRelativePath(path: string) {
        return path.startsWith('./') || !path.startsWith('/');
    }

    normalizeRelativePath(relativePath: string, currentPath: string) {
        const isCurrentDirectoryPath = !relativePath.startsWith('./')
        const formatted = relativePath.split('/').slice(isCurrentDirectoryPath ? 0 : 1).join('/');
        return `${currentPath === '/' ? '' : currentPath}/${formatted}`;
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
                const isRelative = rawPath ? this.isRelativePath(rawPath) : false
                const parsed = isRelative ? this.normalizeRelativePath(rawPath, this.currentPath)  : rawPath
                const target = !!rawPath ? await FileSystem.GetByPath(parsed) : null

                information.paths.push({
                    isRelative,
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
                            output: `Invalid number of arguments for ls (${inputInformation.parsedInput.args.length})`
                        }
                    }

                }
            ],
            pathIndexes: [0]
        })

        if (inputInformation.result) return inputInformation.result;

        const target = inputInformation.paths[0]?.target || await FileSystem.GetByPath(this.currentPath)

        if (!target) {
            return {
                input,
                output: `${inputInformation.paths[0]?.parsed} was not found in the system`
            };
        } else {
            const childrens = await FileSystem.GetById(...target.children);
            return {
                input,
                output: childrens.map(c => c.name).join('  ')
            };
        }
    }
}

Terminal.icon = document.createElement("span")
Terminal.icon.innerText = "T"
Terminal.icon.style.fontSize = "43px"
Terminal.icon.style.color = "red"

export default Terminal