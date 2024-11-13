import utils from "@/utils";

const MAX_NOTIFICATIONS = 3
export function removeNotification(timeout: number, notification: HTMLElement) {
    notification.classList.remove('enter')
    notification.classList.add('exit')

    notification.addEventListener("animationend", () => {
        notification.remove();
    });

    clearTimeout(timeout)
}

export function addNotification(notification: HTMLElement, notifications: HTMLElement, seconds: number) {
    if (notifications.children.length > MAX_NOTIFICATIONS) notifications.innerHTML = ''
    notification.classList.add('enter', 'notification')

    notifications.appendChild(notification)

    const timeout = setTimeout(() => removeNotification(timeout, notification), seconds * 1000)

    notification.onclick = () => removeNotification(timeout, notification)

    return timeout
}

export function systemNotify(msg: string, type: 'error' | 'warning' | 'success', seconds: number = 3) {
    const notifications = utils.$<HTMLDivElement>("#notifications")

    if (!notifications) throw new Error(`No notifications container was found`)

    const notification = document.createElement("p")
    const text = document.createElement("span")

    text.innerText = msg
    notification.appendChild(text)

    notification.classList.add(type)

    return addNotification(notification, notifications, seconds)

}

export function customNotify(element: HTMLElement, seconds: number = 3) {
    const notifications = utils.$<HTMLDivElement>("#notifications")

    if (!notifications) throw new Error(`No notifications container was found`)

    return addNotification(element, notifications, seconds)
}