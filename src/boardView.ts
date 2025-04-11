import {
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  window,
} from "vscode"

export default function initBoardView() {
  return () => {
    const boardData = Espruino.Core.Env.getBoardData()

    const boardTreeDataProvider = window.registerTreeDataProvider(
      "pipboy-board",
      new BoardTreeDataProvider(boardData)
    )
    return () => boardTreeDataProvider.dispose()
  }
}

export class BoardTreeDataProvider implements TreeDataProvider<string> {
  constructor(private boardData: EspruinoBoardData) {}

  async getChildren(key?: string) {
    if (key) {
      const data = this.boardData[key as keyof EspruinoBoardData]

      if (!data) return []

      if (typeof data === "number") {
        return Number.isInteger(data)
          ? [data % 1024 === 0 ? `${data / 1024} KiB` : `${data} bytes`]
          : [data.toString()]
      } else {
        return data.split(",")
      }
    }

    return Object.keys(this.boardData)
  }

  _getItemDescription(key: string): string[] | string | undefined {
    const data = this.boardData[key as keyof EspruinoBoardData]

    if (!data) return undefined

    if (typeof data === "number") {
      return Number.isInteger(data)
        ? data % 1024 === 0
          ? `${data / 1024} KiB`
          : `${data} bytes`
        : data.toString()
    } else if (data && data.indexOf(",") >= 0) {
      return data.split(",")
    } else {
      return data
    }
  }

  getTreeItem(key: string) {
    const treeItem = new TreeItem(key, TreeItemCollapsibleState.None)

    const description = this._getItemDescription(key)
    if (Array.isArray(description)) {
      treeItem.collapsibleState = TreeItemCollapsibleState.Expanded
    } else {
      treeItem.description = description
    }

    // TODO: Use Codicons for some things https://code.visualstudio.com/api/references/icons-in-labels#icon-listing
    // treeItem.iconPath =

    treeItem.id = key

    return treeItem
  }
}
