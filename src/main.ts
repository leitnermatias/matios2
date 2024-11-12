import "./style.css"

// import { SystemFile, FileSystem } from "./system/file";
import { initSystem, startProgram, SYSTEM } from "./system";
import { Terminal } from "./apps/tty";

async function loop(time: DOMHighResTimeStamp) {
  try {
    SYSTEM.programs.forEach(async program => {
      await program.Update(time)
      await program.Draw(time)
    })

    requestAnimationFrame(loop)
  } catch (error) {
    console.error('error in loop ', error)
  }
}

window.onload = async () => {
  try {
    await initSystem()
  } catch (error) {
    console.error("Error on system init ", error)
    return
  }
  console.log("System init with success")

  try {
    await startProgram(new Terminal())
  } catch (error) {
    console.error(error)
  }
  requestAnimationFrame(loop)
}