import ts from "typescript-compiler";

type StringImportDeclaration = ts.ImportDeclaration & {
  moduleSpecifier: ts.StringLiteral;
};

export type ImportBinding = {
  importedName: string;
  localName: string;
  kind: "named" | "default" | "namespace";
  isTypeOnly: boolean;
};

export type PackageImport = {
  modulePath: string;
  line: number;
  bindings: ImportBinding[];
};

export function inspectImports(
  filePath: string,
  content: string,
  packageName: string,
): PackageImport[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
  );

  const matches = findPackageImports(sourceFile, packageName);

  const res: PackageImport[] = matches.map((match) => {
    const clause = match.importClause;
    const bindings: ImportBinding[] = [];

    const { line } = sourceFile.getLineAndCharacterOfPosition(
      match.getStart(sourceFile),
    );

    const modulePath = match.moduleSpecifier.text;

    if (clause) {
      if (clause?.name) {
        bindings.push({
          importedName: "default",
          localName: clause.name.text,
          kind: "default",
          isTypeOnly: clause.isTypeOnly,
        });
      }

      if (clause.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings)) {
          bindings.push({
            importedName: "*",
            localName: clause.namedBindings.name.text,
            kind: "namespace",
            isTypeOnly: clause.isTypeOnly,
          });
        }

        if (ts.isNamedImports(clause.namedBindings)) {
          const elements = clause.namedBindings.elements;

          for (const element of elements) {
            bindings.push({
              importedName: (element.propertyName ?? element.name).text,
              localName: element.name.text,
              kind: "named",
              isTypeOnly: clause.isTypeOnly || element.isTypeOnly,
            });
          }
        }
      }
    }

    return {
      modulePath,
      line: line + 1,
      bindings,
    };
  });

  return res;
}

export function findPackageImports(
  sourceFile: ts.SourceFile,
  packageName: string,
): StringImportDeclaration[] {
  const matches = sourceFile.statements.filter(
    (statement): statement is StringImportDeclaration => {
      if (!ts.isImportDeclaration(statement)) return false;
      if (!ts.isStringLiteral(statement.moduleSpecifier)) return false;

      const modulePath = statement.moduleSpecifier.text;

      return (
        modulePath === packageName || modulePath.startsWith(`${packageName}/`)
      );
    },
  );

  return matches;
}
