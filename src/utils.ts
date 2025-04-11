import path from "path"
import { Uri, FileSystemError } from "vscode"

export interface EspruinoFile {
  name: string
  uri: string
  size: number
  mtime: Date
  dir: boolean
}

export function getIcon(icon: string) {
  return {
    light: Uri.file(path.join(__dirname, "..", `resources/light/${icon}.svg`)),
    dark: Uri.file(path.join(__dirname, "..", `resources/dark/${icon}.svg`)),
  }
}

export async function executeExpression<T>(expression: string) {
  const json = await new Promise<string>((res) =>
    Espruino.Core.Utils.executeExpression(expression, res)
  )
  return JSON.parse(json) as T
}

export async function listDirectory(dir: string): Promise<EspruinoFile[]> {
  const data = new Promise<string>((res) =>
    Espruino.Core.Utils.executeStatement(
      `((d) => {
  require("fs")
    .readdir(d)
    .forEach((name) => {
      var p = [d, name].join("/")
      var s = require("fs").statSync(p)
      s.name = name
      s.uri = p.replace("//","/")
      print(JSON.stringify(s))
    })
})(${JSON.stringify(dir)})`,
      res
    )
  )

  const rowData = await data
  return rowData.split("\n").reduce((agg, v) => {
    try {
      const stat = JSON.parse(v) as EspruinoFile
      agg.push(stat)
    } catch (err) {}
    return agg
  }, [] as EspruinoFile[])
}

export async function downloadFile(
  fileName: string,
  CHUNKSIZE: number = 384
): Promise<Uint8Array> {
  const data = await new Promise<string>((res) =>
    Espruino.Core.Utils.executeStatement(
      `((n,c)=>{var s=require('fs').statSync(n);if(!s){return};var f=E.openFile(n,"r");if(f){var d=f.read(c);while(d){console.log(btoa(d));d=f.read(c)}}})(${JSON.stringify(
        fileName.replace(/^\//, "")
      )},${CHUNKSIZE})`,
      res
    )
  )

  if (data) return Buffer.from(atob(data))
  else throw FileSystemError.Unavailable
}
