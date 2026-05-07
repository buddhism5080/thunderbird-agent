#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const core = require('../core/index.cjs');

const CATALOG_PATH = path.resolve(__dirname, '..', '..', 'shared', 'tool-catalog.json');

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printUsage() {
  process.stdout.write(`thunderbird-agent <command> [options]\n\n`);
  process.stdout.write(`Commands:\n`);
  process.stdout.write(`  doctor                         Diagnose connection discovery and live access\n`);
  process.stdout.write(`  rpc --request <json>           Send a raw JSON-RPC request to Thunderbird\n`);
  process.stdout.write(`  tools list [--catalog]         List live tools or the shared offline catalog\n`);
  process.stdout.write(`  tools call <name> [--args <json>]  Call a Thunderbird tool and print raw JSON\n`);
  process.stdout.write(`  catalog [show <name>]          Inspect the generated shared tool catalog\n`);
  process.stdout.write(`\nExamples:\n`);
  process.stdout.write(`  thunderbird-agent doctor\n`);
  process.stdout.write(`  thunderbird-agent tools list\n`);
  process.stdout.write(`  thunderbird-agent tools call searchMessages --args '{"query":"invoice","maxResults":10}'\n`);
  process.stdout.write(`  thunderbird-agent rpc --request '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'\n`);
}

function loadCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
}

function getFlagValue(args, name) {
  const index = args.indexOf(name);
  if (index === -1) {
    return null;
  }
  if (index === args.length - 1) {
    throw new Error(`Missing value for ${name}`);
  }
  return args[index + 1];
}

function hasFlag(args, name) {
  return args.includes(name);
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function camelToSnake(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .toLowerCase();
}

function summarizeCatalogTool(tool) {
  return {
    name: tool.name,
    toolAlias: `thunderbird_${camelToSnake(tool.name)}`,
    title: tool.title,
    group: tool.group,
    crud: tool.crud,
    description: tool.description,
    required: tool.inputSchema?.required || [],
  };
}

async function handleDoctor() {
  const report = await core.runDoctor();
  printJson(report);
  process.exitCode = report.ok ? 0 : 1;
}

async function handleRpc(args) {
  let requestText = getFlagValue(args, '--request');
  if (!requestText) {
    if (!process.stdin.isTTY) {
      requestText = (await readStdin()).trim();
    } else if (args[0] && !args[0].startsWith('--')) {
      requestText = args[0];
    }
  }
  if (!requestText) {
    throw new Error('Provide --request <json> or pipe a JSON-RPC request on stdin');
  }
  const request = JSON.parse(requestText);
  const response = await core.callRpc(request);
  printJson(response);
}

async function handleTools(args) {
  const subcommand = args[0];
  if (subcommand === 'list') {
    if (hasFlag(args, '--catalog')) {
      const catalog = loadCatalog().map(summarizeCatalogTool);
      printJson({ source: 'catalog', count: catalog.length, tools: catalog });
      return;
    }
    const tools = await core.listTools();
    printJson({ source: 'live', count: tools.length, tools });
    return;
  }

  if (subcommand === 'call') {
    const toolName = args[1];
    if (!toolName) {
      throw new Error('Usage: thunderbird-agent tools call <name> [--args <json>]');
    }
    const argsText = getFlagValue(args, '--args') || '{}';
    const toolArgs = JSON.parse(argsText);
    const result = await core.callTool(toolName, toolArgs);
    printJson(result);
    return;
  }

  throw new Error('Usage: thunderbird-agent tools <list|call> ...');
}

async function handleCatalog(args) {
  const catalog = loadCatalog();
  const subcommand = args[0] || 'list';
  if (subcommand === 'list') {
    printJson({ count: catalog.length, tools: catalog.map(summarizeCatalogTool) });
    return;
  }
  if (subcommand === 'show') {
    const toolName = args[1];
    if (!toolName) {
      throw new Error('Usage: thunderbird-agent catalog show <name>');
    }
    const tool = catalog.find((entry) => entry.name === toolName);
    if (!tool) {
      throw new Error(`Unknown catalog tool: ${toolName}`);
    }
    printJson(tool);
    return;
  }
  throw new Error('Usage: thunderbird-agent catalog [show <name>]');
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  if (command === 'doctor') {
    await handleDoctor(args);
    return;
  }
  if (command === 'rpc') {
    await handleRpc(args);
    return;
  }
  if (command === 'tools') {
    await handleTools(args);
    return;
  }
  if (command === 'catalog') {
    await handleCatalog(args);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  process.stderr.write(`thunderbird-agent: ${error.message || String(error)}\n`);
  process.exit(1);
});
