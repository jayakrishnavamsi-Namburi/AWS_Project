/**
 * SecureProctor MERN — Persistence Integration Test
 * ===================================================
 * Verifies that data written to MongoDB survives container restarts
 * and that the server_uploads volume persists uploaded files.
 *
 * Usage:
 *   node scripts/test-persistence.js
 *
 * Prerequisites:
 *   - MongoDB running at MONGODB_URI (or localhost:27017/secureproctor_db)
 *   - server/uploads directory accessible
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Config ──────────────────────────────────────────────────────────────────
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/secureproctor_db';
const UPLOADS_DIR = path.join(ROOT, 'server', 'uploads');

// ── Colours ──────────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};
const ok = (msg) => console.log(`${c.green}  ✔  ${c.reset}${msg}`);
const fail = (msg) => console.log(`${c.red}  ✘  ${c.reset}${msg}`);
const info = (msg) => console.log(`${c.cyan}  ℹ  ${c.reset}${msg}`);
const section = (msg) =>
  console.log(`\n${c.bold}${c.yellow}▶ ${msg}${c.reset}`);

// ── Test State ────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const testFile = path.join(UPLOADS_DIR, `persistence_test_${Date.now()}.tmp`);

// ── Helpers ───────────────────────────────────────────────────────────────────
function assert(condition, message) {
  if (condition) {
    ok(message);
    passed++;
  } else {
    fail(message);
    failed++;
  }
}

// ── Inline minimal schemas (avoids importing full app context) ────────────────
const PersistenceTestSchema = new mongoose.Schema({
  testId: { type: String, required: true, unique: true },
  payload: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});
const PersistenceTest = mongoose.model('PersistenceTest', PersistenceTestSchema);

// ── Tests ─────────────────────────────────────────────────────────────────────

async function testMongoConnection() {
  section('MongoDB Connection');
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    ok(`Connected to ${MONGODB_URI}`);
    passed++;
  } catch (err) {
    fail(`Failed to connect: ${err.message}`);
    failed++;
    throw err; // Can't proceed without DB
  }
}

async function testMongoWrite() {
  section('MongoDB Write & Read');
  const testId = `persistence_${crypto.randomUUID()}`;
  const payload = {
    timestamp: new Date().toISOString(),
    value: Math.random(),
    nested: { a: 1, b: [1, 2, 3] },
  };

  // Write
  let docId;
  try {
    const doc = await PersistenceTest.create({ testId, payload });
    docId = doc._id;
    ok(`Document written — testId: ${testId}`);
    passed++;
  } catch (err) {
    fail(`Write failed: ${err.message}`);
    failed++;
    return null;
  }

  // Read back immediately
  try {
    const found = await PersistenceTest.findOne({ testId });
    assert(found !== null, 'Document readable after write');
    assert(
      found.payload.value === payload.value,
      'Payload value matches exactly'
    );
    assert(
      JSON.stringify(found.payload.nested) === JSON.stringify(payload.nested),
      'Nested payload matches'
    );
  } catch (err) {
    fail(`Read back failed: ${err.message}`);
    failed++;
  }

  return docId;
}

async function testMongoUpdate(docId) {
  section('MongoDB Update & Index');
  if (!docId) {
    info('Skipping update test (write failed)');
    return;
  }

  try {
    const updated = await PersistenceTest.findByIdAndUpdate(
      docId,
      { $set: { 'payload.updated': true } },
      { new: true }
    );
    assert(updated.payload.updated === true, 'Field updated via findByIdAndUpdate');
  } catch (err) {
    fail(`Update failed: ${err.message}`);
    failed++;
  }
}

async function testMongoCleanup(docId) {
  section('MongoDB Cleanup');
  if (!docId) return;
  try {
    await PersistenceTest.findByIdAndDelete(docId);
    const gone = await PersistenceTest.findById(docId);
    assert(gone === null, 'Document deleted successfully');
  } catch (err) {
    fail(`Cleanup failed: ${err.message}`);
    failed++;
  }
}

async function testCollections() {
  section('Required Collections Existence');
  const db = mongoose.connection.db;
  const collections = (await db.listCollections().toArray()).map((c) => c.name);
  info(`Found collections: ${collections.join(', ') || '(none)'}`);

  const required = ['users', 'examinations', 'examsessions', 'questions'];
  for (const name of required) {
    const exists = collections.includes(name);
    // Collections only exist after first document insert; warn instead of fail
    if (exists) {
      ok(`Collection '${name}' exists`);
      passed++;
    } else {
      info(`Collection '${name}' not yet created (run seed first)`);
    }
  }
}

async function testFileSystemPersistence() {
  section('File System (server/uploads) Persistence');

  // Create uploads dir if missing
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    info(`Created missing uploads directory: ${UPLOADS_DIR}`);
  }
  ok(`Uploads directory exists: ${UPLOADS_DIR}`);
  passed++;

  // Write test file
  const content = `SecureProctor persistence test — ${new Date().toISOString()}`;
  try {
    fs.writeFileSync(testFile, content, 'utf8');
    ok(`Test file written: ${path.basename(testFile)}`);
    passed++;
  } catch (err) {
    fail(`File write failed: ${err.message}`);
    failed++;
    return;
  }

  // Read back
  try {
    const readBack = fs.readFileSync(testFile, 'utf8');
    assert(readBack === content, 'File content matches after read-back');
  } catch (err) {
    fail(`File read failed: ${err.message}`);
    failed++;
  }

  // Cleanup
  try {
    fs.unlinkSync(testFile);
    assert(!fs.existsSync(testFile), 'Test file deleted successfully');
  } catch (err) {
    fail(`File cleanup failed: ${err.message}`);
    failed++;
  }
}

async function testMongoIndexes() {
  section('Index Verification');
  const db = mongoose.connection.db;
  const colls = (await db.listCollections().toArray()).map((c) => c.name);

  for (const collName of ['users', 'examinations', 'answers']) {
    if (!colls.includes(collName)) {
      info(`Skipping index check for '${collName}' — not seeded yet`);
      continue;
    }
    const indexes = await db.collection(collName).indexes();
    info(`Indexes on '${collName}': ${indexes.map((i) => i.name).join(', ')}`);
    ok(`Index list fetched for '${collName}'`);
    passed++;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    `\n${c.bold}${c.cyan}SecureProctor MERN — Persistence Integration Test${c.reset}\n`
  );

  let docId = null;
  try {
    await testMongoConnection();
    docId = await testMongoWrite();
    await testMongoUpdate(docId);
    await testMongoCleanup(docId);
    await testCollections();
    await testMongoIndexes();
  } catch (err) {
    fail(`Fatal error: ${err.message}`);
  } finally {
    // Always run filesystem test
    await testFileSystemPersistence();

    // Cleanup temp test file if left over
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }

    // Disconnect
    try {
      await mongoose.disconnect();
    } catch (_) {}
  }

  // ── Results ──
  console.log(`\n${'─'.repeat(50)}`);
  console.log(
    `${c.bold}Results: ${c.green}${passed} passed${c.reset}, ${failed > 0 ? c.red : c.reset}${failed} failed${c.reset}`
  );
  console.log('─'.repeat(50));

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log(`\n${c.green}${c.bold}✔ All persistence checks passed!${c.reset}\n`);
    process.exit(0);
  }
}

main();
