#!/usr/bin/env node
/**
 * Build the Thunderbird Agent extension XPI without mutating the source tree.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const PROJECT_DIR = path.resolve(__dirname, '..');
const EXT_DIR = path.join(PROJECT_DIR, 'extension');
const DIST_DIR = path.join(PROJECT_DIR, 'dist');
const OUT_FILE = path.join(DIST_DIR, 'thunderbird-agent.xpi');
const LEGACY_OUT_FILE = path.join(DIST_DIR, 'thunderbird-mcp.xpi');

const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, 'package.json'), 'utf8'));
const manifestJson = JSON.parse(fs.readFileSync(path.join(EXT_DIR, 'manifest.json'), 'utf8'));

if (packageJson.version !== manifestJson.version) {
  throw new Error(
    `Version mismatch: package.json=${packageJson.version} extension/manifest.json=${manifestJson.version}`
  );
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

class ZipWriter {
  constructor() {
    this.files = [];
    this.offset = 0;
    this.buffers = [];
  }

  addFile(name, data) {
    const normalizedName = name.split(path.sep).join('/');
    const nameBuf = Buffer.from(normalizedName, 'utf8');
    const compressed = zlib.deflateRawSync(data);
    const crc = crc32(data);

    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuf.copy(localHeader, 30);

    this.files.push({
      name: nameBuf,
      crc,
      compressedSize: compressed.length,
      uncompressedSize: data.length,
      offset: this.offset,
    });
    this.buffers.push(localHeader, compressed);
    this.offset += localHeader.length + compressed.length;
  }

  toBuffer() {
    const centralDirectory = [];
    let centralDirectorySize = 0;

    for (const file of this.files) {
      const entry = Buffer.alloc(46 + file.name.length);
      entry.writeUInt32LE(0x02014b50, 0);
      entry.writeUInt16LE(20, 4);
      entry.writeUInt16LE(20, 6);
      entry.writeUInt16LE(0, 8);
      entry.writeUInt16LE(8, 10);
      entry.writeUInt16LE(0, 12);
      entry.writeUInt16LE(0, 14);
      entry.writeUInt32LE(file.crc, 16);
      entry.writeUInt32LE(file.compressedSize, 20);
      entry.writeUInt32LE(file.uncompressedSize, 24);
      entry.writeUInt16LE(file.name.length, 28);
      entry.writeUInt16LE(0, 30);
      entry.writeUInt16LE(0, 32);
      entry.writeUInt16LE(0, 34);
      entry.writeUInt16LE(0, 36);
      entry.writeUInt32LE(0, 38);
      entry.writeUInt32LE(file.offset, 42);
      file.name.copy(entry, 46);
      centralDirectory.push(entry);
      centralDirectorySize += entry.length;
    }

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(this.files.length, 8);
    eocd.writeUInt16LE(this.files.length, 10);
    eocd.writeUInt32LE(centralDirectorySize, 12);
    eocd.writeUInt32LE(this.offset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...this.buffers, ...centralDirectory, eocd]);
  }
}

function getShortSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: PROJECT_DIR, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function isDirtyWorktree() {
  try {
    execSync('git diff --quiet && git diff --cached --quiet', { cwd: PROJECT_DIR, stdio: 'ignore' });
    return false;
  } catch {
    return true;
  }
}

function buildInfo() {
  const shortSha = getShortSha();
  let version = `v${packageJson.version}`;
  if (shortSha) {
    version += `-0-g${shortSha}`;
  }
  if (isDirtyWorktree()) {
    version += '+dirty';
  }
  return {
    version,
    packageVersion: packageJson.version,
    builtAt: new Date().toISOString(),
  };
}

function walkExtensionFiles(dir, prefix = '') {
  const entries = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      entries.push(...walkExtensionFiles(full, rel));
    } else {
      entries.push(rel);
    }
  }
  return entries.sort();
}

const manifestForBuild = Buffer.from(
  `${JSON.stringify({ ...manifestJson, version: packageJson.version }, null, 2)}\n`,
  'utf8'
);
const buildInfoForBuild = Buffer.from(`${JSON.stringify(buildInfo())}\n`, 'utf8');

const overrides = new Map([
  ['manifest.json', manifestForBuild],
  ['buildinfo.json', buildInfoForBuild],
]);

fs.mkdirSync(DIST_DIR, { recursive: true });
fs.rmSync(OUT_FILE, { force: true });
fs.rmSync(LEGACY_OUT_FILE, { force: true });

const zip = new ZipWriter();
const seen = new Set();

for (const rel of walkExtensionFiles(EXT_DIR)) {
  if (overrides.has(rel)) {
    zip.addFile(rel, overrides.get(rel));
    seen.add(rel);
  } else {
    zip.addFile(rel, fs.readFileSync(path.join(EXT_DIR, rel)));
  }
}

for (const [rel, data] of overrides.entries()) {
  if (!seen.has(rel)) {
    zip.addFile(rel, data);
  }
}

fs.writeFileSync(OUT_FILE, zip.toBuffer());
const sizeKb = (fs.statSync(OUT_FILE).size / 1024).toFixed(0);
process.stdout.write(`Built: ${OUT_FILE} (${sizeKb} KB)\n`);
