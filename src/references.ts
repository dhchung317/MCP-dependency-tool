import ts from "typescript-compiler";
import { findPackageImports } from "./imports.js";

export type ImportReference = {
  localName: string;
  line: number;
  column: number;
  expression: string;
};

export function inspectReferences(
  filePath: string,
  packageName: string,
): ImportReference[] {
  const program = ts.createProgram({
    rootNames: [filePath],
    options: {
      allowJs: true,
      noEmit: true,
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
    },
  });

  const checker = program.getTypeChecker();
  const checkedFile = program.getSourceFile(filePath);

  if (typeof checkedFile === "undefined") {
    throw new Error(`Could not load ${filePath}`);
  }

  return collectReferences(checkedFile, checker, packageName);
}

export function collectReferences(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  packageName: string,
): ImportReference[] {
  const imports = findPackageImports(sourceFile, packageName);

  const identifiers: ts.Identifier[] = [];

  for (const declaration of imports) {
    const clause = declaration.importClause;
    if (!clause) continue;

    // Default import: import validator from "zod";
    if (clause.name) {
      identifiers.push(clause.name);
    }

    const bindings = clause.namedBindings;
    if (!bindings) continue;

    if (ts.isNamespaceImport(bindings)) {
      // example: import * as validation from "zod";
      identifiers.push(bindings.name);
    } else {
      // example: import { z as schema, ZodError } from "zod";
      for (const element of bindings.elements) {
        identifiers.push(element.name);
      }
    }
  }

  const tracked = new Map<ts.Symbol, ts.Identifier>();

  for (const identifier of identifiers) {
    const symbol = checker.getSymbolAtLocation(identifier);
    if (symbol) tracked.set(symbol, identifier);
  }

  const references: ImportReference[] = [];

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) return;

    if (ts.isIdentifier(node)) {
      const symbol = checker.getSymbolAtLocation(node);
      const binding = symbol ? tracked.get(symbol) : undefined;

      if (binding) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        );

        let expression: ts.Node = node;

        while (
          (ts.isPropertyAccessExpression(expression.parent) &&
            expression.parent.expression === expression) ||
          (ts.isCallExpression(expression.parent) &&
            expression.parent.expression === expression) ||
          (ts.isElementAccessExpression(expression.parent) &&
            expression.parent.expression === expression)
        ) {
          expression = expression.parent;
        }

        references.push({
          localName: binding.text,
          line: line + 1,
          column: character + 1,
          expression: expression.getText(sourceFile),
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return references;
}
