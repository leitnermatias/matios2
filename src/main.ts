import "./style.css"

// import { SystemFile, FileSystem } from "./system/file";
import { initSystem, SYSTEM } from "./system";
import { Terminal } from "./system/tty";

async function loop(time: DOMHighResTimeStamp) {
  try {
    SYSTEM.programs.forEach(async program => {
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

  const tty = await Terminal.Init()

  SYSTEM.programs.push(tty)

  // try {
  //   const data = [
  //     ["id", "name", "email"],
  //     [1, "John Doe", "johndoe@example.com"],
  //     [2, "Jane Smith", "janesmith@example.com"],
  //     [3, "Chris Johnson", "chrisj@example.com"]
  //   ];
    
  //   const csvContent = data.map(e => e.join(",")).join("\n");
  //   const blob = new Blob([csvContent], { type: "text/csv" });
  
  //   const f1 = new SystemFile({name: 'Test in init', path: '/tmp', contents: new File([blob], 'test in init.csv', {type: 'text/csv'})})
  //   await f1.save()

  //   const f1new = await FileSystem.Get("Test in init")

  //   console.log(f1new)
  // } catch (error) {
  //   console.error("Error saving file ", error)
  // }
  requestAnimationFrame(loop)
}