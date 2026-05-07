const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const API_PATH = path.join(ROOT, 'extension', 'agent_server', 'api.js');
const CATALOG_PATH = path.join(ROOT, 'shared', 'tool-catalog.json');

function extractArrayLiteral(source, marker) {
  const markerIndex = source.indexOf(marker);
  assert.notEqual(markerIndex, -1, `marker not found: ${marker}`);
  const start = source.indexOf('[', markerIndex);
  assert.notEqual(start, -1, `opening '[' not found for ${marker}`);

  let depth = 0;
  let inString = null;
  let escape = false;

  for (let index = start; index < source.length; index += 1) {
    const ch = source[index];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '[') {
      depth += 1;
      continue;
    }
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  throw new Error(`closing ']' not found for ${marker}`);
}

function loadToolsFromApi() {
  const source = fs.readFileSync(API_PATH, 'utf8');
  const literal = extractArrayLiteral(source, 'const tools = [');
  const tools = vm.runInNewContext(`(${literal})`, Object.create(null));
  return JSON.parse(JSON.stringify(tools));
}

describe('shared tool catalog', () => {
  it('stays byte-for-byte aligned with the tool metadata in api.js', () => {
    const fromApi = loadToolsFromApi();
    const fromCatalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
    assert.deepStrictEqual(fromCatalog, fromApi);
  });

  it('contains the full 36-tool surface used by the CLI and shared skill/docs', () => {
    const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
    assert.equal(catalog.length, 36);
    assert.ok(catalog.some((tool) => tool.name === 'searchMessages'));
    assert.ok(catalog.some((tool) => tool.name === 'sendMail'));
    assert.ok(catalog.some((tool) => tool.name === 'createFilter'));
    assert.ok(catalog.some((tool) => tool.name === 'getAccountAccess'));
  });
});
