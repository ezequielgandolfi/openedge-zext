import { Event, EventEmitter, ExtensionContext, Range, Selection, SymbolInformation, SymbolKind, TextDocument, TextEditor, TextEditorRevealType, TreeDataProvider, TreeItem, TreeItemCollapsibleState, TreeView, commands, window, workspace, Position } from "vscode";
import * as path from "path";

const getIcon = (kind: SymbolKind, context: ExtensionContext): { dark: string; light: string } => {
  let icon: string;
  switch (kind) {
    case SymbolKind.Class:
      icon = "class";
      break;
    case SymbolKind.Constant:
      icon = "constant";
      break;
    case SymbolKind.Constructor:
    case SymbolKind.Function:
    case SymbolKind.Method:
      icon = "function";
      break;
    case SymbolKind.Interface:
      icon = "interface";
    case SymbolKind.Module:
    case SymbolKind.Namespace:
    case SymbolKind.Object:
    case SymbolKind.Package:
      icon = "module";
      break;
    case SymbolKind.Property:
      icon = "property";
      break;
    default:
      icon = "variable";
      break;
  }
  icon = `icon-${icon}.svg`;
  return {
    dark: context.asAbsolutePath(path.join("resources", "dark", icon)),
    light: context.asAbsolutePath(path.join("resources", "light", icon))
  };
};

let optsSortOrder: number[] = [];
let optsTopLevel: number[] = [];
let optsExpandNodes: number[] = [];
let optsDoSort = true;

export class OutlineNavigatorNode {
  parent?: OutlineNavigatorNode;
  symbol: SymbolInformation;
  children: OutlineNavigatorNode[];

  constructor(symbol?: SymbolInformation) {
    this.children = [];
    this.symbol = symbol;
  }

  /**
   * Judge if a node should be expanded automatically.
   */
  public static shouldAutoExpand(kind: SymbolKind): boolean {
    let ix = optsExpandNodes.indexOf(kind);
    if (ix < 0) {
      ix = optsExpandNodes.indexOf(-1);
    }
    return ix > -1;
  }

  private getKindOrder(kind: SymbolKind): number {
    let ix = optsSortOrder.indexOf(kind);
    if (ix < 0) {
      ix = optsSortOrder.indexOf(-1);
    }
    return ix;
  }

  private compareSymbols(a: OutlineNavigatorNode, b: OutlineNavigatorNode): number {
    const kindOrder =
      this.getKindOrder(a.symbol.kind) - this.getKindOrder(b.symbol.kind);
    if (kindOrder !== 0) {
      return kindOrder;
    }
    if (a.symbol.name.toLowerCase() > b.symbol.name.toLowerCase()) {
      return 1;
    }
    return -1;
  }

  sort() {
    this.children.sort(this.compareSymbols.bind(this));
    this.children.forEach(child => child.sort());
  }

  addChild(child: OutlineNavigatorNode) {
    child.parent = this;
    this.children.push(child);
  }
}

export class OutlineNavigatorTreeDataProvider implements TreeDataProvider<OutlineNavigatorNode> {
  private _onDidChangeTreeData: EventEmitter<OutlineNavigatorNode | null> = new EventEmitter<OutlineNavigatorNode | null>();
  readonly onDidChangeTreeData: Event<OutlineNavigatorNode | null> = this._onDidChangeTreeData.event;

  private context: ExtensionContext;
  private tree: OutlineNavigatorNode;
  private editor: TextEditor;

  constructor(context: ExtensionContext) {
    this.context = context;
  }

  private getSymbols(document: TextDocument): Thenable<SymbolInformation[]> {
    return commands.executeCommand<SymbolInformation[]>(
      "vscode.executeDocumentSymbolProvider",
      document.uri
    );
  }

  private compareSymbols(a: OutlineNavigatorNode, b: OutlineNavigatorNode) {
    const startComparison = a.symbol.location.range.start.compareTo(
      b.symbol.location.range.start
    );
    if (startComparison != 0) {
      return startComparison;
    }
    return b.symbol.location.range.end.compareTo(a.symbol.location.range.end);
  }

  private async updateSymbols(editor: TextEditor): Promise<void> {
    const tree = new OutlineNavigatorNode();
    this.editor = editor;
    if (editor) {
      readOpts();
      let symbols = await this.getSymbols(editor.document);
      if (optsTopLevel.indexOf(-1) < 0) {
        symbols = symbols.filter(sym => optsTopLevel.indexOf(sym.kind) >= 0);
      }
      // Create symbol nodes
      const symbolNodes = symbols.map(symbol => new OutlineNavigatorNode(symbol));
      // Sort nodes by left edge ascending and right edge descending
      symbolNodes.sort(this.compareSymbols);
      // Start with an empty list of parent candidates
      let potentialParents: OutlineNavigatorNode[] = [];
      symbolNodes.forEach(currentNode => {
        // Drop candidates that do not contain the current symbol range
        potentialParents = potentialParents
          .filter(
            node =>
              node !== currentNode &&
              node.symbol.location.range.contains(
                currentNode.symbol.location.range
              ) &&
              !node.symbol.location.range.isEqual(
                currentNode.symbol.location.range
              )
          )
          .sort(this.compareSymbols);
        // See if any candidates remain
        if (!potentialParents.length) {
          tree.addChild(currentNode);
        } else {
          const parent = potentialParents[potentialParents.length - 1];
          parent.addChild(currentNode);
        }
        // Add current node as a parent candidate
        potentialParents.push(currentNode);
      });
      if (optsDoSort) {
        tree.sort();
      }
    }
    this.tree = tree;
  }

  async getChildren(node?: OutlineNavigatorNode): Promise<OutlineNavigatorNode[]> {
    if (node) {
      return node.children;
    } else {
      await this.updateSymbols(window.activeTextEditor);
      return this.tree ? this.tree.children : [];
    }
  }

  getParent(node: OutlineNavigatorNode): OutlineNavigatorNode {
    return node.parent;
  }

  getNodeByPosition(position: Position): OutlineNavigatorNode {
    let node = this.tree;
    while (node.children.length) {
      const matching = node.children.filter(node =>
        node.symbol.location.range.contains(position)
      );
      if (!matching.length) {
        break;
      }
      node = matching[0];
    }
    if (node.symbol) {
      return node;
    }
  }

  getTreeItem(node: OutlineNavigatorNode): TreeItem {
    const { kind } = node.symbol;
    let treeItem = new TreeItem(node.symbol.name);

    if (node.children.length) {
      treeItem.collapsibleState =
        optsExpandNodes.length && OutlineNavigatorNode.shouldAutoExpand(kind)
          ? TreeItemCollapsibleState.Expanded
          : TreeItemCollapsibleState.Collapsed;
    } else {
      treeItem.collapsibleState = TreeItemCollapsibleState.None;
    }

    treeItem.command = {
      command: "abl.outline.revealRange",
      title: "",
      arguments: [this.editor, node.symbol.location.range]
    };

    treeItem.iconPath = getIcon(kind, this.context);
    return treeItem;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }
}

export class OutlineNavigatorProvider {
  symbolViewer: TreeView<OutlineNavigatorNode>;

  constructor(context: ExtensionContext) {
    const treeDataProvider = new OutlineNavigatorTreeDataProvider(context);
    this.symbolViewer = window.createTreeView("abl.outline", {
      treeDataProvider
    });
    commands.registerCommand("abl.outline.refresh", () => {
      treeDataProvider.refresh();
    });
    commands.registerCommand(
      "abl.outline.revealRange",
      (editor: TextEditor, range: Range) => {
        editor.revealRange(range, TextEditorRevealType.Default);
        editor.selection = new Selection(range.start, range.start);
        commands.executeCommand("workbench.action.focusActiveEditorGroup");
      }
    );
    window.onDidChangeActiveTextEditor(editor => treeDataProvider.refresh());
    workspace.onDidCloseTextDocument(document => treeDataProvider.refresh());
    workspace.onDidChangeTextDocument(event => treeDataProvider.refresh());
    workspace.onDidSaveTextDocument(document => treeDataProvider.refresh());
    commands.registerTextEditorCommand(
      "abl.outline.revealCurrentSymbol",
      (editor: TextEditor) => {
        if (editor.selections.length) {
          const node = treeDataProvider.getNodeByPosition(
            editor.selections[0].active
          );
          if (node) {
            this.symbolViewer.reveal(node);
          }
        }
      }
    );
  }
}

function readOpts() {
  let opts = workspace.getConfiguration("abl.outline");
  optsDoSort = opts.get<boolean>("doSort");
  optsExpandNodes = convertEnumNames(opts.get<string[]>("expandNodes"));
  optsSortOrder = convertEnumNames(opts.get<string[]>("sortOrder"));
  optsTopLevel = convertEnumNames(opts.get<string[]>("topLevel"));
}

function convertEnumNames(names: string[]): number[] {
  return names.map(str => {
    let v = SymbolKind[str];
    return typeof v == "undefined" ? -1 : v;
  });
}
