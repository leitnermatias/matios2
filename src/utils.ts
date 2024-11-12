const $ = function <T extends Element>(s: string) {
    return document.querySelector<T>(s)
}
const $$ = function <T extends Element>(s: string) {
    return document.querySelectorAll<T>(s)
}

function debounce(func: Function, delay: number) {
    let timerId: number | null = null;

    return (...args: any[]) => {
        if (timerId) {
            clearTimeout(timerId);
        }
        timerId = window.setTimeout(() => {
            func(...args);
            timerId = null;
        }, delay);
    };
}

export default {
    $,
    $$,
    debounce,
}