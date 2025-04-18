declare global {
  type EspruinoPort = {
    description: string
    path: string
  } & (
    | {
        usb?: Array<number> // vid/pid
        unimportant?: boolean
        type?: undefined
      }
    | {
        rssi: number
        type: "bluetooth"
      }
    | {
        type: "socket"
      }
  )

  interface EspruinoSerialConnectInfo {
    error?: string
    portName?: string
  }

  interface EspruinoBoardData {
    BOARD: string
    VERSION: string
    RAM: number
  }

  interface SerialDevice {
    name: string
    init: () => void
  }

  var Espruino: {
    callProcessor(
      processor: string,
      data: any,
      callback: (data: any) => void
    ): void
    awaitProcessor(processor: string, data: any): Promise<any>
    addProcessor(
      processor: string,
      callback: (data: any, done: (data: any) => void) => void
    ): void
    Config: {
      [key: string]: any
      set(key: string, value: any): void
    }
    Core: {
      CodeWriter: {
        writeToEspruino(code: string, callback?: () => void): void
      }
      Config: {
        data: {
          [key: string]: { section: string }
        }
      }
      Env: {
        getBoardData(): EspruinoBoardData
      }
      Notifications: {
        success(message: string): void
        error(message: string): void
        warning(message: string): void
        info(message: string): void
      }
      Serial: {
        devices: SerialDevice[]
        getPorts(
          callback: (ports: EspruinoPort[], shouldCallAgain: boolean) => void
        ): void
        setSlowWrite(slow: boolean): void
        open(
          path: string,
          opened: (info?: EspruinoSerialConnectInfo) => void,
          closed: () => void
        ): void
        close(): void
        write(data: string, showStatus?: boolean, callback?: () => void): void
        startListening(callback: (data: ArrayBuffer) => void): void
        isConnected(): boolean
      }
      Utils: {
        getEspruinoPrompt(callback?: () => void): void
        executeExpression(
          code: string,
          callback: (result: string) => void,
          options?: {
            exprPrintsResult?: boolean // If true, whatever expression prints to the console is returned
            maxTimeout?: number // Defaults to 30
          }
        ): void
        executeStatement(code: string, callback: (result: string) => void): void
        parseJSONish<T>(json: string): T
        downloadFile(
          fileName: string,
          callback: (result?: string) => void
        ): void
        uploadFile(
          fileName: string,
          contents: string,
          callback: () => void
        ): void
        atob: (input: string) => string
        btoa: (input: string) => string
      }
    }
    Plugins: {
      LocalModules: {
        setCwd(cwd: string): void
      }
    }
  }
}

export {}
