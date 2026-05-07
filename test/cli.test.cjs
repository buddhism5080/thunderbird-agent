const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CLI_PATH = path.join(ROOT, 'packages', 'cli', 'thunderbird-agent.cjs');

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tb-cli-'));
}

function cleanupTempRoot(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

function writeConnectionInfo(filePath, { port, token }) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ port, token, pid: process.pid }), 'utf8');
}

function runCli(args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_PATH, ...args], {
      env: { ...process.env, ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ status: code, stdout, stderr });
    });
  });
}

describe('thunderbird-agent CLI', () => {
  let root;

  beforeEach(() => {
    root = makeTempRoot();
  });

  afterEach(() => {
    cleanupTempRoot(root);
  });

  it('lists the offline shared catalog without needing Thunderbird to be running', async () => {
    const result = await runCli(['tools', 'list', '--catalog']);
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.source, 'catalog');
    assert.equal(payload.count, 36);
    assert.ok(payload.tools.some((tool) => tool.name === 'searchMessages'));
    assert.ok(payload.tools.some((tool) => tool.toolAlias === 'thunderbird_search_messages'));
  });

  it('calls a live Thunderbird tool and returns the raw tool payload instead of a JSON-RPC wrapper object', async () => {
    const token = 'cli-test-token';
    const connFile = path.join(root, 'connection.json');
    let receivedAuth = null;
    let receivedBody = null;

    const server = http.createServer((req, res) => {
      receivedAuth = req.headers.authorization;
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        receivedBody = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: receivedBody.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ ok: true, echoedArguments: receivedBody.params.arguments }, null, 2),
              },
            ],
          },
        }));
      });
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    writeConnectionInfo(connFile, { port, token });

    try {
      const result = await runCli(
        ['tools', 'call', 'searchMessages', '--args', '{"query":"invoice","maxResults":5}'],
        { THUNDERBIRD_AGENT_CONNECTION_FILE: connFile },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.equal(receivedAuth, `Bearer ${token}`);
      assert.equal(receivedBody.method, 'tools/call');
      assert.equal(receivedBody.params.name, 'searchMessages');
      const payload = JSON.parse(result.stdout);
      assert.deepStrictEqual(payload, {
        ok: true,
        echoedArguments: {
          query: 'invoice',
          maxResults: 5,
        },
      });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('doctor reports live connectivity and tool count using the same connection override path', async () => {
    const token = 'doctor-token';
    const connFile = path.join(root, 'connection.json');

    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        const request = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: [
              { name: 'searchMessages', description: 'Search mail', inputSchema: { type: 'object', properties: {} } },
              { name: 'getMessage', description: 'Read mail', inputSchema: { type: 'object', properties: {} } },
            ],
          },
        }));
      });
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    writeConnectionInfo(connFile, { port, token });

    try {
      const result = await runCli(['doctor'], { THUNDERBIRD_AGENT_CONNECTION_FILE: connFile });
      assert.equal(result.status, 0, result.stderr);
      const payload = JSON.parse(result.stdout);
      assert.equal(payload.ok, true);
      assert.equal(payload.connection.port, port);
      assert.equal(payload.liveTools.count, 2);
      assert.deepStrictEqual(payload.liveTools.names, ['searchMessages', 'getMessage']);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
