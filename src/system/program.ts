export interface ProgramArgs<T> {
    id?: string;
    viewport: HTMLElement;
    title: string;
    state: T;
    width: string;
    height: string;
}

export abstract class Program<T> {
    id?: string;
    viewport: HTMLElement;
    title: string;
    state: T;
    width: string;
    height: string;

    constructor(args: ProgramArgs<T>) {
        this.id = args.id;
        this.viewport = args.viewport;
        this.title = args.title;
        this.state = args.state;
        this.width = args.width;
        this.height = args.height;
    }

    abstract Update(time: DOMHighResTimeStamp): Promise<void>
    abstract Draw(time: DOMHighResTimeStamp): Promise<void>
    abstract Close(): Promise<void>
}