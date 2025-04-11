// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode"

//@ts-ignore
import * as espruino from "espruino"
import initBoardView from "./boardView.js"
import { initConfig } from "./config.js"
import selectDevice from "./selectDevice.js"
import { init } from "./serial.js"
import { initTerminal } from "./terminal.js"
import initFileSystem from "./fileSystemProvider.js"

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log("Pip-Boy extension activated", espruino)

  espruino.init(() => {
    console.log("espruino init")

    Espruino.awaitProcessor = (processor: string, data: any) =>
      new Promise((res) => Espruino.callProcessor(processor, data, res))

    Espruino.Core.Notifications.success = (message: string) =>
      vscode.window.showInformationMessage(message)
    Espruino.Core.Notifications.error = (message: string) =>
      vscode.window.showErrorMessage(message)
    Espruino.Core.Notifications.warning = (message: string) =>
      vscode.window.showWarningMessage(message)

    Espruino.Core.Notifications.info = (message: string) =>
      vscode.window.showInformationMessage(message)

    // This is a horrible hack to just remove anything but local serial, the Pip-Boy
    // doesn't use any of these and scanning hangs on bluetooth sometimes.
    Espruino.Core.Serial.devices = Espruino.Core.Serial.devices.filter(
      (device) => {
        return (
          !device.name.toLocaleLowerCase().includes("bluetooth") &&
          !device.name.toLocaleLowerCase().includes("web")
        )
      }
    )

    context.subscriptions.push(initConfig())

    context.subscriptions.push(
      init(initBoardView(), initTerminal(), initFileSystem(), initContext())
    )

    // pipboy.serial.connect
    context.subscriptions.push(
      vscode.commands.registerCommand("pipboy.serial.connect", async () => {
        if (Espruino.Core.Serial.isConnected()) {
          const action = await vscode.window.showWarningMessage(
            "You are already connected to a Pip-Boy device, do you want to disconnect from it?",
            "Disconnect"
          )
          if (action)
            await vscode.commands.executeCommand("pipboy.serial.disconnect")
          return
        }

        const selectedDevice = await selectDevice()

        if (!selectedDevice) return

        Espruino.Core.Serial.setSlowWrite(true)
        try {
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: `Connecting to ${selectedDevice.description}`,
            },
            () =>
              connect(selectedDevice, () => {
                // Disconnect from workspace too?
                vscode.workspace.updateWorkspaceFolders(0, 1)
                vscode.window.showWarningMessage(`Disconnected from Pip-Boy`)
              })
          )

          // Get initial prompt
          Espruino.Core.Utils.getEspruinoPrompt()

          // Once we're connected, refresh the file listing
          vscode.commands.executeCommand(
            "workbench.files.action.refreshFilesExplorer"
          )
        } catch (error: any) {
          vscode.window.showErrorMessage(`Connection failed ${error}`)
        }
      })
    )

    // pipboy.serial.disconnect
    context.subscriptions.push(
      vscode.commands.registerCommand("pipboy.serial.disconnect", async () => {
        console.log("disconnect command called")
        Espruino.Core.Serial.close()
      })
    )
  })
}

// This method is called when your extension is deactivated
export function deactivate() {}

function connect({ path }: EspruinoPort, onDisconnect: () => void) {
  const timeout = AbortSignal.timeout(10_000)
  const connecting = new Promise<string | undefined>((resolve, reject) =>
    Espruino.Core.Serial.open(
      path,
      (info) => {
        if (timeout.aborted) reject("Timeout (10 seconds)")
        else if (info?.error) reject(info.error)
        else resolve(info?.portName)
      },
      onDisconnect
    )
  )
  return Promise.race([
    connecting,
    new Promise((_, rej) =>
      timeout.addEventListener("abort", () => rej("Timeout (10 seconds)"))
    ),
  ])
}

function initContext() {
  return async () => {
    await vscode.commands.executeCommand(
      "setContext",
      "pipboy.serial.connected",
      true
    )

    return () =>
      vscode.commands.executeCommand(
        "setContext",
        "pipboy.serial.connected",
        false
      )
  }
}
