export interface Program {
    id: string;
    viewport: HTMLElement;
    state: any;
    Init(): Promise<Program>
    Draw(time: DOMHighResTimeStamp): Promise<void>
}