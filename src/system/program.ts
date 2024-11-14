export interface ProgramArgs<T> {
    id?: string;
    viewport: HTMLElement;
    title: string;
    state: T;
    width: string;
    height: string;
}

export abstract class Program {
    static icon?: HTMLElement;
    static name: string;
    id?: string;
    viewport: HTMLElement = document.createElement("div");
    title: string = "";
    width: string = `${window.innerWidth / 2}px`;
    height: string = `${window.innerHeight / 2}px`;

    abstract Update(time: DOMHighResTimeStamp): Promise<void>
    abstract Draw(time: DOMHighResTimeStamp): Promise<void>
    abstract Close(): Promise<void>
}