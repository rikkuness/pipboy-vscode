import * as vscode from "vscode"
import { downloadFile, EspruinoFile, listDirectory } from "./utils"

export class File implements vscode.FileStat {
  type: vscode.FileType = vscode.FileType.File
  ctime: number
  mtime: number
  size: number
  permissions?: vscode.FilePermission
  typeof: "file" = "file"
  uri: vscode.Uri

  constructor(uri: vscode.Uri, size: number, mtime: number) {
    this.uri = uri
    this.ctime = mtime
    this.mtime = mtime
    this.size = size
  }
}

export class Directory implements vscode.FileStat {
  type: vscode.FileType = vscode.FileType.Directory
  ctime: number
  mtime: number
  size: number = 0

  typeof: "directory" = "directory"
  uri: vscode.Uri

  constructor(uri: vscode.Uri, mtime: number) {
    this.uri = uri
    this.ctime = mtime
    this.mtime = mtime
  }
}

export type Entry = File | Directory

function espruinoToEntry(file: EspruinoFile): Entry {
  const uri = vscode.Uri.from({ scheme: "pipboy", path: file.uri })
  if (file.dir) return new Directory(uri, file.mtime.valueOf())
  else return new File(uri, file.size, file.mtime.valueOf())
}

export class PipBoyFilesystem implements vscode.FileSystemProvider {
  root = new Map<string, Entry>([
    ["/", new Directory(vscode.Uri.from({ scheme: "pipboy", path: "/" }), 0)],
  ])

  stat(uri: vscode.Uri): vscode.FileStat {
    const stat = this.root.get(uri.path)
    if (!stat) throw vscode.FileSystemError.FileNotFound("not present in cache")
    return stat
  }

  readDirectory(uri: vscode.Uri): Thenable<[string, vscode.FileType][]> {
    // TODO: If the dir is empty the logs spam errors, the user experience is fine though
    // TODO: This is still quite chattery, it'd be nice to also load this from memory
    // and maybe only fetch from the device if a manual refresh is triggered or something
    return listDirectory(uri.path).then((files) =>
      files
        .map(espruinoToEntry)
        .map((f) => {
          switch (f.uri.path) {
            case "/FW.js":
              if (f.typeof === "file")
                f.permissions = vscode.FilePermission.Readonly

            default:
              break
          }

          // Add everything we found to the cache
          this.root.set(f.uri.path, f)

          return f
        })
        .map((f) => [f.uri.path, f.type])
    )
  }

  readFile(uri: vscode.Uri): Thenable<Uint8Array> {
    if (!this.root.get(uri.path)) throw vscode.FileSystemError.FileNotFound
    return downloadFile(uri.path).then((data) => Buffer.from(data))
  }

  writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): void {
    return
  }

  rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean }
  ): void {}

  delete(uri: vscode.Uri): void {}

  createDirectory(uri: vscode.Uri): void {}

  isWritableFileSystem(scheme: string) {}

  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>()

  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> =
    this._emitter.event

  watch(_resource: vscode.Uri): vscode.Disposable {
    // ignore, fires for all changes...
    return new vscode.Disposable(() => {})
  }
}

export default function initFileSystem() {
  const pipFS = new PipBoyFilesystem()

  return () => {
    vscode.workspace.registerFileSystemProvider("pipboy", pipFS, {
      isCaseSensitive: true,
      isReadonly: true, // Temporary until I implement the write methods
    })

    vscode.workspace.updateWorkspaceFolders(0, 0, {
      uri: vscode.Uri.parse("pipboy:/"),
      name: "Pip-Boy SD Card",
    })
  }
}
