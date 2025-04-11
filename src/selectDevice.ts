import { QuickPickItem, window } from "vscode"
import { getIcon } from "./utils"

interface PortQuickPick extends QuickPickItem {
  port: EspruinoPort | "socket"
}

export default async function selectDevice(): Promise<
  EspruinoPort | undefined
> {
  const quickPick = window.createQuickPick<PortQuickPick>()
  let cancelled = false
  try {
    quickPick.title = "Select device"
    quickPick.busy = true

    continouslyGetPorts((ports) => {
      quickPick.items = ports
      return cancelled
    }).then(() => (quickPick.busy = false))

    quickPick.show()

    const selectedItem = await new Promise<PortQuickPick | undefined>((res) => {
      quickPick.onDidAccept(() => res(quickPick.selectedItems[0]))
      quickPick.onDidHide(() => res(undefined))
    })

    if (selectedItem?.port === "socket") return undefined

    return selectedItem?.port
  } finally {
    cancelled = true
    quickPick.dispose()
  }
}

async function getPorts() {
  return new Promise<{ ports: EspruinoPort[]; callAgain: boolean }>((res) =>
    Espruino.Core.Serial.getPorts((ports, callAgain) => {
      res({
        ports: ports.filter((port) => {
          if (!port.type && port.usb) {
            return true

            // TODO: This is the PipBoy vid/pid but Windows at least isn't reflecting this
            // if (port.usb[0] == 0xa4f1 && port.usb[1] == 0x0483)
            //   return true
          }
          return false
        }),
        callAgain: false,
      })
    })
  )
}

async function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

async function continouslyGetPorts(
  update: (ports: PortQuickPick[]) => boolean
) {
  const entries = new Map<string, PortQuickPick>()
  while (true) {
    const { ports, callAgain } = await getPorts()
    for (const port of ports) {
      entries.set(port.path, {
        label: port.description,
        description: port.path,
        port,
        iconPath: getIcon("usb"),
      })
    }
    const cancel = update([...entries.values()])
    if (cancel) break
    if (!callAgain) break
    await delay(1_000)
  }
}
