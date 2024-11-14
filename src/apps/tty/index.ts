import { FileSystem } from "@/system/file";
import { Program } from "@/system/program";
import "./style.css"

export interface TerminalCommandResult {
    input: string;
    output: string;
}
export type TerminalCommand = (input: string) => Promise<TerminalCommandResult>
export type DefaultCommands = { [key: string]: TerminalCommand }

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
            args: splitted.slice(1)
        }
    }

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
        const parsed = this.getCmdInput(input);

        if (parsed.args.length === 1 && parsed.args[0] === 'help') {
            return {
                input,
                output: `Shows the contents of the given path in the filesystem
                   Usage:
                   - For showing the contents of the current position: ls
                   - For showing the contents of a particular path: ls <path>`
            }
        }
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

        let path = this.currentPath;
        if (parsed.args?.length >= 1 && !isRelative) {
            path = parsed.args[0];
        } else if (parsed.args?.length > 0) {
            const relativePath = parsed.args[0].split('/').slice(isCurrentDirectoryPath ? 0 : 1).join('/');
            path = `${this.currentPath === '/' ? '' : this.currentPath}/${relativePath}`;
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
    }

}

Terminal.icon = document.createElement("span")
Terminal.icon.innerText = "T"
Terminal.icon.style.fontSize = "43px"
Terminal.icon.style.color = "red"

export default Terminal