import { startProgram } from ".";
import { Terminal } from "../apps/tty";
import utils from "../utils";

export async function initDesktop() {
    const apps = [
        {
            name: "Terminal",
            program: Terminal
        }
    ]

    const desktop = utils.$("#desktop")

    if (!desktop) throw new Error(`#desktop was not found at desktop init`)

    for (const app of apps) {
        const applicationBtn = document.createElement("button")
        applicationBtn.classList.add("desktop-icon")

        applicationBtn.onclick = async () => {
            const program = new app.program()
            await startProgram(program)
        }

        const defaultIcon = document.createElement("span")

        applicationBtn.appendChild(app.program.icon || defaultIcon)
        const text = document.createElement("span")
        text.innerText = app.name
        applicationBtn.appendChild(text)

        desktop.appendChild(applicationBtn)
    }
}