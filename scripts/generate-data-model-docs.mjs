import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import prettier from "prettier";
import ts from "typescript";

const PROJECT_ROOT = process.cwd();
const SCHEMA_PATH = path.join(PROJECT_ROOT, "convex", "schema.ts");
const OUTPUT_PATH = path.join(PROJECT_ROOT, "docs", "data-model.schema.md");

const CHECK_MODE = process.argv.includes("--check");

const readSourceFile = (filePath) => {
  const text = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  return { text, sourceFile };
};

const isIdentifierNamed = (node, name) =>
  ts.isIdentifier(node) && node.text === name;

const getStringLiteralValue = (node) => {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
};

const buildImportsIndex = (sourceFile) => {
  /** @type {Map<string, { filePath: string, exportName: string }>} */
  const imports = new Map();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!statement.importClause?.namedBindings) continue;

    const moduleSpecifier = getStringLiteralValue(statement.moduleSpecifier);
    if (!moduleSpecifier || !moduleSpecifier.startsWith(".")) continue;
    const resolved = path.join(
      path.dirname(sourceFile.fileName),
      moduleSpecifier,
    );

    if (ts.isNamedImports(statement.importClause.namedBindings)) {
      for (const specifier of statement.importClause.namedBindings.elements) {
        const exportName = specifier.propertyName?.text ?? specifier.name.text;
        const localName = specifier.name.text;
        imports.set(localName, { filePath: resolved, exportName });
      }
    }
  }

  return imports;
};

const buildExportsIndex = (sourceFile) => {
  /** @type {Map<string, import("typescript").Expression>} */
  const exports = new Map();

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const isExported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );
    if (!isExported) continue;

    for (const decl of statement.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;
      if (!decl.initializer) continue;
      exports.set(decl.name.text, decl.initializer);
    }
  }

  return exports;
};

const ensureTsExtension = (filePath) => {
  if (
    filePath.endsWith(".ts") ||
    filePath.endsWith(".mts") ||
    filePath.endsWith(".tsx")
  ) {
    return filePath;
  }
  return `${filePath}.ts`;
};

const createResolver = (rootSourceFile) => {
  const imports = buildImportsIndex(rootSourceFile);
  /** @type {Map<string, Map<string, import("typescript").Expression>>} */
  const exportCache = new Map();

  /**
   * @param {string} identifier
   * @returns {import("typescript").Expression | null}
   */
  const resolveImportedIdentifier = (identifier) => {
    const info = imports.get(identifier);
    if (!info) return null;
    const filePath = ensureTsExtension(info.filePath);
    if (!exportCache.has(filePath)) {
      const { sourceFile } = readSourceFile(filePath);
      exportCache.set(filePath, buildExportsIndex(sourceFile));
    }
    const exports = exportCache.get(filePath);
    return exports?.get(info.exportName) ?? null;
  };

  return { resolveImportedIdentifier };
};

/**
 * @param {import("typescript").Expression} expr
 * @param {{ resolveImportedIdentifier: (identifier: string) => import("typescript").Expression | null, seen: Set<string> }} ctx
 * @returns {{ type: string, optional: boolean }}
 */
const describeValidator = (expr, ctx) => {
  // Expand imported identifiers like `planSchema`, `chatAttachmentValidator`, etc.
  if (ts.isIdentifier(expr)) {
    if (ctx.seen.has(expr.text)) {
      return { type: expr.text, optional: false };
    }
    const resolved = ctx.resolveImportedIdentifier(expr.text);
    if (!resolved) {
      return { type: expr.text, optional: false };
    }
    ctx.seen.add(expr.text);
    const described = describeValidator(resolved, ctx);
    ctx.seen.delete(expr.text);
    return described;
  }

  if (
    ts.isCallExpression(expr) &&
    ts.isPropertyAccessExpression(expr.expression)
  ) {
    const receiver = expr.expression.expression;
    const method = expr.expression.name.text;

    if (isIdentifierNamed(receiver, "v")) {
      switch (method) {
        case "string":
          return { type: "string", optional: false };
        case "number":
          return { type: "number", optional: false };
        case "boolean":
          return { type: "boolean", optional: false };
        case "any":
          return { type: "any", optional: false };
        case "id": {
          const tableName = getStringLiteralValue(expr.arguments[0]);
          return {
            type: tableName ? `Id<"${tableName}">` : "Id<...>",
            optional: false,
          };
        }
        case "literal": {
          const arg = expr.arguments[0];
          if (
            ts.isStringLiteral(arg) ||
            ts.isNoSubstitutionTemplateLiteral(arg)
          ) {
            return { type: JSON.stringify(arg.text), optional: false };
          }
          if (ts.isNumericLiteral(arg)) {
            return { type: arg.text, optional: false };
          }
          if (arg?.kind === ts.SyntaxKind.TrueKeyword) {
            return { type: "true", optional: false };
          }
          if (arg?.kind === ts.SyntaxKind.FalseKeyword) {
            return { type: "false", optional: false };
          }
          return {
            type: arg ? arg.getText(arg.getSourceFile()) : "…",
            optional: false,
          };
        }
        case "optional": {
          const inner = expr.arguments[0];
          if (!inner) return { type: "unknown", optional: true };
          const described = describeValidator(inner, ctx);
          return { type: described.type, optional: true };
        }
        case "array": {
          const inner = expr.arguments[0];
          if (!inner) return { type: "unknown[]", optional: false };
          const described = describeValidator(inner, ctx);
          return { type: `${described.type}[]`, optional: false };
        }
        case "union": {
          const parts = expr.arguments.map(
            (arg) => describeValidator(arg, ctx).type,
          );
          return { type: parts.join(" | "), optional: false };
        }
        case "object": {
          const arg = expr.arguments[0];
          if (!arg || !ts.isObjectLiteralExpression(arg)) {
            return { type: "{ ... }", optional: false };
          }
          const fields = [];
          for (const prop of arg.properties) {
            if (!ts.isPropertyAssignment(prop)) continue;
            const key = prop.name
              .getText(arg.getSourceFile())
              .replaceAll(/['"]/g, "");
            const described = describeValidator(prop.initializer, ctx);
            fields.push(
              `${key}${described.optional ? "?" : ""}: ${described.type}`,
            );
          }
          return { type: `{ ${fields.join("; ")} }`, optional: false };
        }
        default:
          return { type: `v.${method}(...)`, optional: false };
      }
    }
  }

  return { type: expr.getText(expr.getSourceFile()), optional: false };
};

const parseIndexCall = (callExpr) => {
  const indexName = getStringLiteralValue(callExpr.arguments[0]);
  const fieldsArg = callExpr.arguments[1];
  const fields = [];
  if (fieldsArg && ts.isArrayLiteralExpression(fieldsArg)) {
    for (const element of fieldsArg.elements) {
      const fieldName = getStringLiteralValue(element);
      if (fieldName) fields.push(fieldName);
    }
  }
  return indexName ? { name: indexName, fields } : null;
};

const parseDefineTableChain = (initializer) => {
  /** @type {{ name: string, fields: Array<{ name: string, type: string, optional: boolean }>, indexes: Array<{ name: string, fields: string[] }> } | null} */
  const result = { fields: [], indexes: [] };

  let current = initializer;
  while (
    ts.isCallExpression(current) &&
    ts.isPropertyAccessExpression(current.expression)
  ) {
    const prop = current.expression.name.text;
    if (prop === "index") {
      const index = parseIndexCall(current);
      if (index) result.indexes.push(index);
    }
    current = current.expression.expression;
  }

  if (
    !ts.isCallExpression(current) ||
    !ts.isIdentifier(current.expression) ||
    current.expression.text !== "defineTable"
  ) {
    return null;
  }

  const fieldsArg = current.arguments[0];
  if (!fieldsArg || !ts.isObjectLiteralExpression(fieldsArg)) {
    return null;
  }

  result.indexes.reverse();

  const resolver = createResolver(fieldsArg.getSourceFile());
  for (const prop of fieldsArg.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const fieldName = prop.name
      .getText(fieldsArg.getSourceFile())
      .replaceAll(/['"]/g, "");
    const { type, optional } = describeValidator(prop.initializer, {
      resolveImportedIdentifier: resolver.resolveImportedIdentifier,
      seen: new Set(),
    });
    result.fields.push({ name: fieldName, type, optional });
  }

  return result;
};

const parseSchema = (schemaSourceFile) => {
  const resolver = createResolver(schemaSourceFile);

  /** @type {Array<{ name: string, fields: Array<{ name: string, type: string, optional: boolean }>, indexes: Array<{ name: string, fields: string[] }> }>} */
  const tables = [];
  let includesAuthTables = false;

  /** @type {import("typescript").CallExpression | null} */
  let defineSchemaCall = null;

  for (const statement of schemaSourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const decl of statement.declarationList.declarations) {
      if (!decl.initializer) continue;
      if (!ts.isCallExpression(decl.initializer)) continue;
      if (!ts.isIdentifier(decl.initializer.expression)) continue;
      if (decl.initializer.expression.text !== "defineSchema") continue;
      defineSchemaCall = decl.initializer;
    }
  }

  if (!defineSchemaCall) {
    throw new Error("Could not find defineSchema(...) in convex/schema.ts");
  }

  const schemaObj = defineSchemaCall.arguments[0];
  if (!schemaObj || !ts.isObjectLiteralExpression(schemaObj)) {
    throw new Error("defineSchema(...) argument is not an object literal");
  }

  for (const prop of schemaObj.properties) {
    if (ts.isSpreadAssignment(prop)) {
      if (isIdentifierNamed(prop.expression, "authTables")) {
        includesAuthTables = true;
      }
      continue;
    }

    if (!ts.isPropertyAssignment(prop)) continue;
    const tableName = prop.name
      .getText(schemaSourceFile)
      .replaceAll(/['"]/g, "");
    const tableDef = parseDefineTableChain(prop.initializer);
    if (!tableDef) continue;

    // Re-describe fields using the schema resolver so imported validators expand.
    const fields = [];
    for (const field of tableDef.fields) {
      fields.push(field);
    }

    tables.push({
      name: tableName,
      fields,
      indexes: tableDef.indexes,
    });
  }

  return { tables, includesAuthTables, resolver };
};

const formatMarkdown = ({ tables, includesAuthTables }) => {
  const lines = [];
  lines.push("# Data model (schema)");
  lines.push("");
  lines.push("<!--");
  lines.push("  GENERATED FILE — DO NOT EDIT BY HAND");
  lines.push("  Source: convex/schema.ts");
  lines.push("  Run: `bun run docs:data-model`");
  lines.push("-->");
  lines.push("");
  lines.push("This document is generated from `convex/schema.ts`.");
  lines.push("");
  lines.push(
    'All Convex documents also include `_id: Id<"table">` and `_creationTime: number` (ms since epoch).',
  );
  lines.push("");
  if (includesAuthTables) {
    lines.push(
      "Auth-related tables are included via `authTables` from `@convex-dev/auth/server` and are not expanded here.",
    );
    lines.push("");
  }

  for (const table of tables) {
    lines.push(`## ${table.name}`);
    lines.push("");
    lines.push("Fields:");
    for (const field of table.fields) {
      lines.push(
        `- \`${field.name}${field.optional ? "?" : ""}\`: ${field.type}`,
      );
    }
    lines.push("");
    if (table.indexes.length > 0) {
      lines.push("Indexes:");
      for (const index of table.indexes) {
        const fields = index.fields.map((f) => `\`${f}\``).join(", ");
        lines.push(`- \`${index.name}\`: (${fields})`);
      }
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
};

const main = async () => {
  const { sourceFile } = readSourceFile(SCHEMA_PATH);
  const { tables, includesAuthTables } = parseSchema(sourceFile);
  const markdown = formatMarkdown({ tables, includesAuthTables });
  const prettierConfig = await prettier.resolveConfig(PROJECT_ROOT);
  const formatted = await prettier.format(markdown, {
    ...prettierConfig,
    filepath: OUTPUT_PATH,
  });

  if (CHECK_MODE) {
    const existing = readFileSync(OUTPUT_PATH, "utf8");
    if (existing !== formatted) {
      process.stderr.write(
        [
          "docs/data-model.schema.md is out of date.",
          "Run `bun run docs:data-model` and commit the result.",
          "",
        ].join("\n"),
      );
      process.exitCode = 1;
    }
    return;
  }

  writeFileSync(OUTPUT_PATH, formatted, "utf8");
  process.stdout.write(`Wrote ${path.relative(PROJECT_ROOT, OUTPUT_PATH)}\n`);
};

await main();
