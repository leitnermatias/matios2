export interface Program {
    id?: string;
    viewport: HTMLElement;
    title: string;
    state: any;
    width: string;
    height: string;
    Init(): Promise<Program>
    Update(time: DOMHighResTimeStamp): Promise<void>
    Draw(time: DOMHighResTimeStamp): Promise<void>
    Close(): Promise<void>
}