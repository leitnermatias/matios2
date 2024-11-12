import "./style.css"

// import { SystemFile, FileSystem } from "./system/file";
import { initSystem, SYSTEM } from "./system";
import { systemNotify } from "./system/notifications";

async function loop(time: DOMHighResTimeStamp) {
  try {
    SYSTEM.programs.forEach(async program => {
      await program.Update(time)
      await program.Draw(time)
    })
    requestAnimationFrame(loop)
  } catch (error) {
    systemNotify('Error in execution', 'error', 60)
  }
}

window.onload = async () => {
  try {
    await initSystem()
  } catch (error) {
    systemNotify("Error on system init", "error", 10)
    return
  }
  systemNotify("System init with success", "success", 5)

  requestAnimationFrame(loop)
}