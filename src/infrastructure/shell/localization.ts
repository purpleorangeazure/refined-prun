import { isValidUrl } from '@src/utils/is-valid-url';
import {
  ArrayExpression,
  Identifier,
  Literal,
  Node,
  ObjectExpression,
  parse as parseAst,
} from 'acorn';
import { simple as simpleWalk } from 'acorn-walk';
import { IntlMessageFormat } from 'intl-messageformat';
import { generateTypes } from '@src/infrastructure/shell/generate-localization-types';

type MessageFormatElement = ConstructorParameters<typeof IntlMessageFormat>[0] extends
  | string
  | (infer U)[]
  ? U
  : never;

export const localization = new Map<string, MessageFormatElement[]>();

const scripts = document.head.getElementsByTagName('script');

for (let i = 0; i < scripts.length; i++) {
  const script = scripts[i];
  if (!script.src || !isValidUrl(script.src)) {
    continue;
  }
  if (new URL(script.src).hostname != 'apex.prosperousuniverse.com') {
    continue;
  }
  void extractLocalization(script.src);
}

async function extractLocalization(url: string) {
  const req = await fetch(url);
  const script = await req.text();
  const objects = extractAllObjectExpressions(script)
    .filter(hasIntlKeys)
    .map(x => toObject(x) as { id: string; defaultMessage: MessageFormatElement[] });
  for (const obj of objects) {
    localization.set(obj.id, obj.defaultMessage);
  }
  console.log(generateTypes(localization));
}

function extractAllObjectExpressions(source: string): ObjectExpression[] {
  const ast = parseAst(source, {
    ecmaVersion: 'latest',
  });
  const objects: ObjectExpression[] = [];
  simpleWalk(ast, {
    ObjectExpression(node) {
      objects.push(node);
    },
  });
  return objects;
}

function hasIntlKeys(objExp: ObjectExpression): boolean {
  let hasId = false;
  let hasDefaultMessage = false;
  for (const prop of objExp.properties) {
    if (prop.type !== 'Property') {
      continue;
    }
    if (prop.key.type !== 'Identifier') {
      continue;
    }
    const name = prop.key.name;
    if (name === 'id') {
      hasId = true;
    }
    if (name === 'defaultMessage') {
      hasDefaultMessage = true;
    }
    if (hasId && hasDefaultMessage) {
      return true;
    }
  }
  return false;
}

function convert(node: Node) {
  switch (node.type) {
    case 'ObjectExpression':
      return toObject(node as ObjectExpression);
    case 'ArrayExpression':
      return (node as ArrayExpression).elements.map(e => (e ? convert(e) : null));
    case 'Literal':
      return (node as Literal).value;
    case 'Identifier':
      return (node as Identifier).name;
    default:
      return '[complex]';
  }
}

function getKey(node: Node): string {
  if (node.type === 'Identifier') {
    return (node as Identifier).name;
  }
  if (node.type === 'Literal') {
    return String((node as Literal).value);
  }
  return '';
}

function toObject(objExp: ObjectExpression): object {
  const obj: object = {};
  for (const prop of objExp.properties) {
    if (prop.type !== 'Property') {
      continue;
    }
    const key = getKey(prop.key);
    obj[key] = convert(prop.value);
  }
  return obj;
}
