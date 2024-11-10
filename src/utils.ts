const $ = function<T extends Element>(s: string) {
    return document.querySelector<T>(s)
} 
const $$ = function<T extends Element>(s: string) {
    return document.querySelectorAll<T>(s)
} 

export default {
    $,
    $$
}