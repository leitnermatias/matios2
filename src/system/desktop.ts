import { startProgram } from ".";
import apps from "@/apps"
import utils from "@/utils";

export async function initDesktop() {
    const desktop = utils.$("#desktop")

    if (!desktop) throw new Error(`#desktop was not found at desktop init`)

    for (const app of apps) {
        const applicationBtn = document.createElement("button")
        applicationBtn.classList.add("desktop-icon")

        applicationBtn.onclick = async () => {
            const program = new app()
            await startProgram(program)
        }

        const defaultIcon = document.createElement("span")

        applicationBtn.appendChild(app.icon || defaultIcon)
        const text = document.createElement("span")
        text.innerText = app.name
        applicationBtn.appendChild(text)

        desktop.appendChild(applicationBtn)
    }
}