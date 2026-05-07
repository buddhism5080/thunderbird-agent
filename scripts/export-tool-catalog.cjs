#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const apiPath = path.join(root, 'extension', 'agent_server', 'api.js');
const outPath = path.join(root, 'shared', 'tool-catalog.json');

function extractArrayLiteral(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Marker not found: ${marker}`);
  }
  const start = source.indexOf('[', markerIndex);
  if (start === -1) {
    throw new Error(`Opening '[' not found after ${marker}`);
  }

  let depth = 0;
  let inString = null;
  let escape = false;

  for (let index = start; index < source.length; index++) {
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

  throw new Error(`Closing ']' not found for ${marker}`);
}

function main() {
  const source = fs.readFileSync(apiPath, 'utf8');
  const arrayLiteral = extractArrayLiteral(source, 'const tools = [');
  const tools = vm.runInNewContext(`(${arrayLiteral})`, Object.create(null), {
    filename: 'tool-catalog-extract.vm',
  });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(tools, null, 2)}\n`, 'utf8');
  process.stdout.write(`Exported ${tools.length} tools to ${outPath}\n`);
}

main();
