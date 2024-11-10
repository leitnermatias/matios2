export interface Program<T> {
    id?: string;
    viewport: HTMLElement;
    title: string;
    state: T;
    width: string;
    height: string;
    Init(): Promise<Program<T>>
    Update(time: DOMHighResTimeStamp): Promise<void>
    Draw(time: DOMHighResTimeStamp): Promise<void>
    Close(): Promise<void>
}