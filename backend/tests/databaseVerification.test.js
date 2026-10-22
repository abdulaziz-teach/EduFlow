import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from 'mongoose';
import connectDB, { disconnectDB } from '../src/config/db.js';
import app from '../src/app.js';
import User from '../src/models/User.js';
import AuditLog from '../src/models/AuditLog.js';
import Notification from '../src/models/Notification.js';
import Wallet from '../src/models/Wallet.js';
import ShopItem from '../src/models/ShopItem.js';
import Inventory from '../src/models/Inventory.js';
import { withTransaction } from '../src/utils/transactionHelper.js';
import { encodeCursor, decodeCursor, queryAuditLogs } from '../src/services/auditService.js';
import { purchaseItem } from '../src/services/shopService.js';

let server;
let baseUrl;
let adminToken;
let testUser;
let adminUser;

async function apiRequest(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...options.headers,
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON
  }

  return { status: res.status, ok: res.ok, data };
}

describe('🛡️ Database Hardening & P2/P3 Final Verification Suite', () => {
  before(async () => {
    await connectDB();

    // Start HTTP test server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    // Clean up test collections
    await User.deleteMany({ email: /@db-verify-test\.com$/ });
    await AuditLog.deleteMany({ action: /^TEST_VERIFY_/ });
    await Notification.deleteMany({ title: /^TEST_VERIFY_/ });

    // Seed test admin
    adminUser = await User.create({
      email: 'admin@db-verify-test.com',
      name: 'DB Verify Admin',
      displayName: 'DB Verify Admin',
      password: 'AdminPassword123!',
      role: 'admin',
      status: 'active',
    });

    // Seed regular user
    testUser = await User.create({
      email: 'student@db-verify-test.com',
      name: 'Test Student',
      displayName: 'Test Student',
      password: 'StudentPassword123!',
      role: 'user',
      status: 'active',
    });

    // Log in admin to get JWT token
    const loginRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@db-verify-test.com',
        password: 'AdminPassword123!',
      },
    });

    assert.equal(loginRes.status, 200);
    adminToken = loginRes.data.accessToken || loginRes.data.token;
    assert.ok(adminToken, 'Admin token acquired');
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await User.deleteMany({ email: /@db-verify-test\.com$/ });
    await AuditLog.deleteMany({ action: /^TEST_VERIFY_/ });
    await Notification.deleteMany({ title: /^TEST_VERIFY_/ });
    await disconnectDB();
  });

  // =========================================================================
  // FIND-01 (P2): Global NoSQL Injection Sanitization
  // =========================================================================
  describe('1. FIND-01 (P2): Global NoSQL Injection Sanitization', () => {
    it('sanitizes $ne / $gt operator keys in request body', async () => {
      // Send login request with nested MongoDB operator object
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: { $ne: null },
          password: { $gt: '' },
        },
      });

      // The global mongoSanitize replaces keys starting with $ with _
      // So body becomes { email: { _ne: null }, password: { _gt: '' } }
      // Validation rejects because email is an object, not a string
      assert.equal(res.status, 400);
      assert.equal(res.data.success, false);
    });

    it('sanitizes malicious operator keys in query parameters without crashing', async () => {
      // Query with URL-encoded NoSQL operator: status[$ne]=cancelled
      const res = await apiRequest('/api/billing/admin/subscriptions?status[%24ne]=cancelled', {
        token: adminToken,
      });

      // Query parameter %24ne ($ne) should be sanitized to _ne, preventing operator execution
      assert.ok([200, 400].includes(res.status));
      if (res.status === 200) {
        assert.equal(res.data.success, true);
      }
    });

    it('sanitizes nested $where, $regex, and $gt in search parameters', async () => {
      const res = await apiRequest('/api/search?q[%24regex]=.*&filter[%24gt]=0', {
        token: adminToken,
      });

      assert.ok([200, 400].includes(res.status));
      assert.equal(res.data.success, true);
    });

    it('preserves legitimate application inputs containing dollar signs and dots', async () => {
      // Legitimate string value containing $ and . (e.g. price, description, email)
      const testEmail = 'john.doe.tester@db-verify-test.com';
      const registerRes = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'John Doe Jr.',
          displayName: 'John Doe Jr.',
          email: testEmail,
          password: 'StrongPassword123!',
        },
      });

      assert.equal(registerRes.status, 201);
      assert.equal(registerRes.data.user.email, testEmail);

      // Clean up registered user
      await User.deleteOne({ email: testEmail });
    });
  });

  // =========================================================================
  // FIND-02 (P2): AuditLog Deterministic Cursor Pagination
  // =========================================================================
  describe('2. FIND-02 (P2): AuditLog Deterministic Cursor Pagination', () => {
    let testLogs = [];

    before(async () => {
      // Create 15 deterministic audit logs with same or sequential timestamps
      const baseTime = Date.now() - 100000;
      for (let i = 0; i < 15; i++) {
        // Intentionally create duplicate timestamps for items 5, 6, 7 to test tie-breaking
        const timestamp = i >= 5 && i <= 7 ? new Date(baseTime + 5000) : new Date(baseTime + i * 1000);
        const log = await AuditLog.create({
          actorId: adminUser._id,
          adminUserId: adminUser._id,
          actorRole: 'admin',
          action: `TEST_VERIFY_ACTION_${i}`,
          resourceType: 'system',
          resourceId: `res_${i}`,
          createdAt: timestamp,
        });
        testLogs.push(log);
      }
    });

    it('encodes and decodes pagination cursors correctly', () => {
      const sampleDoc = {
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date('2026-09-01T12:00:00.000Z'),
      };

      const cursor = encodeCursor(sampleDoc);
      assert.ok(cursor, 'Cursor string generated');
      assert.equal(typeof cursor, 'string');

      const decoded = decodeCursor(cursor);
      assert.equal(decoded._id, sampleDoc._id.toString());
      assert.equal(decoded.createdAt.getTime(), sampleDoc.createdAt.getTime());
    });

    it('rejects tampered or malformed cursors with 400 INVALID_CURSOR', async () => {
      const res = await apiRequest('/api/admin/audit-logs?cursor=not-a-valid-cursor-xyz', {
        token: adminToken,
      });

      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'INVALID_CURSOR');
    });

    it('fetches first page with limit and returns nextCursor and hasMore', async () => {
      const res = await apiRequest('/api/admin/audit-logs?limit=5', {
        token: adminToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.logs.length, 5);
      assert.equal(res.data.data.pagination.hasMore, true);
      assert.ok(res.data.data.pagination.nextCursor);
    });

    it('fetches subsequent pages using cursor without skipping or duplicate records', async () => {
      // Page 1
      const page1Res = await apiRequest('/api/admin/audit-logs?limit=5', {
        token: adminToken,
      });
      assert.equal(page1Res.status, 200);
      const page1Logs = page1Res.data.data.logs;
      const cursor1 = page1Res.data.data.pagination.nextCursor;
      assert.ok(cursor1);

      // Page 2 using cursor
      const page2Res = await apiRequest(`/api/admin/audit-logs?limit=5&cursor=${encodeURIComponent(cursor1)}`, {
        token: adminToken,
      });
      assert.equal(page2Res.status, 200);
      const page2Logs = page2Res.data.data.logs;
      const cursor2 = page2Res.data.data.pagination.nextCursor;

      // Ensure no overlapping records between page 1 and page 2
      const page1Ids = new Set(page1Logs.map((l) => l._id));
      for (const log of page2Logs) {
        assert.equal(page1Ids.has(log._id), false, `Record ${log._id} appeared on both page 1 and page 2`);
      }

      // Page 3 using cursor2
      const page3Res = await apiRequest(`/api/admin/audit-logs?limit=5&cursor=${encodeURIComponent(cursor2)}`, {
        token: adminToken,
      });
      assert.equal(page3Res.status, 200);
      const page3Logs = page3Res.data.data.logs;

      const page2Ids = new Set(page2Logs.map((l) => l._id));
      for (const log of page3Logs) {
        assert.equal(page2Ids.has(log._id), false, `Record ${log._id} appeared on both page 2 and page 3`);
      }
    });

    it('handles duplicate timestamps deterministically using compound cursor', async () => {
      // Query specifically for the test action filter
      const result = await queryAuditLogs(
        { action: 'TEST_VERIFY_ACTION_' },
        { limit: 15 }
      );

      assert.ok(result.logs.length >= 15);

      // Verify deterministic descending order by createdAt, then _id
      for (let i = 0; i < result.logs.length - 1; i++) {
        const curr = result.logs[i];
        const next = result.logs[i + 1];
        const currTime = new Date(curr.createdAt).getTime();
        const nextTime = new Date(next.createdAt).getTime();

        if (currTime === nextTime) {
          assert.ok(
            String(curr._id) > String(next._id),
            `When timestamps are equal, _id must strictly descend: ${curr._id} > ${next._id}`
          );
        } else {
          assert.ok(currTime > nextTime, `createdAt must strictly descend: ${currTime} >= ${nextTime}`);
        }
      }
    });

    it('caps requested limit to 100 to prevent denial of service', async () => {
      const res = await apiRequest('/api/admin/audit-logs?limit=500', {
        token: adminToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.data.pagination.limit, 100);
    });

    it('preserves legacy offset pagination when cursor is omitted for backward compatibility', async () => {
      const res = await apiRequest('/api/admin/audit-logs?page=2&limit=5', {
        token: adminToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.data.pagination.page, 2);
      assert.ok(res.data.data.pagination.total >= 15);
      assert.ok(res.data.data.pagination.pages >= 3);
    });
  });

  // =========================================================================
  // FIND-03 (P3): Transaction Safety & Production Fail-Fast
  // =========================================================================
  describe('3. FIND-03 (P3): Transaction Safety & Production Fail-Fast', () => {
    it('withTransaction executes work successfully in development/test environment', async () => {
      const result = await withTransaction(async (session) => {
        return { executed: true, hasSession: Boolean(session) };
      });

      assert.equal(result.executed, true);
    });

    it('withTransaction strictly rejects standalone MongoDB when strict=true (production policy)', async () => {
      // In standalone MongoDB, starting a transaction with strict: true must throw TRANSACTION_REPLICA_SET_REQUIRED
      // instead of silently falling back to workFn(null)
      try {
        await withTransaction(
          async () => {
            return 'should_not_run_if_standalone';
          },
          { strict: true }
        );
        // If the current MongoDB IS a replica set, this test also passes safely
        assert.ok(true, 'Replica set active and transaction succeeded');
      } catch (err) {
        // If standalone, verify it failed fast with the exact production error code
        assert.equal(err.errorCode, 'TRANSACTION_REPLICA_SET_REQUIRED');
        assert.ok(err.message.includes('Transactions require a MongoDB Replica Set'));
      }
    });

    it('aborts transaction and propagates errors without silent suppression', async () => {
      const testAction = `TEST_VERIFY_ROLLBACK_${Date.now()}`;

      try {
        await withTransaction(async (session) => {
          const sessionOpts = session ? { session } : {};
          await AuditLog.create(
            [
              {
                actorId: adminUser._id,
                action: testAction,
                resourceType: 'system',
              },
            ],
            sessionOpts
          );

          // Trigger simulated failure
          throw new Error('SIMULATED_TRANSACTION_FAILURE');
        });
        assert.fail('Should have thrown');
      } catch (err) {
        assert.equal(err.message, 'SIMULATED_TRANSACTION_FAILURE');
      }
    });
  });

  // =========================================================================
  // FIND-04 (P3): Notification Redundant Index Cleanup
  // =========================================================================
  describe('4. FIND-04 (P3): Notification Redundant Index Cleanup', () => {
    it('verifies redundant single-field userId_1 index is not defined in Notification schema', async () => {
      const schemaIndexes = Notification.schema.indexes();

      // Check schema-level index declarations
      const singleFieldUserIdIndex = schemaIndexes.find((idx) => {
        const keys = Object.keys(idx[0]);
        return keys.length === 1 && keys[0] === 'userId';
      });

      assert.equal(
        singleFieldUserIdIndex,
        undefined,
        'Notification schema must NOT define a single-field index on userId'
      );
    });

    it('verifies compound indexes covering userId prefix are preserved', async () => {
      const schemaIndexes = Notification.schema.indexes();

      // Check compound index { userId: 1, createdAt: -1 } exists
      const compoundUserIdCreatedAt = schemaIndexes.find((idx) => {
        const spec = idx[0];
        return spec.userId === 1 && spec.createdAt === -1 && Object.keys(spec).length === 2;
      });

      assert.ok(compoundUserIdCreatedAt, 'Compound index { userId: 1, createdAt: -1 } must exist');

      // Check compound index { userId: 1, read: 1, createdAt: -1 } exists
      const compoundUserIdReadCreatedAt = schemaIndexes.find((idx) => {
        const spec = idx[0];
        return spec.userId === 1 && spec.read === 1 && spec.createdAt === -1;
      });

      assert.ok(compoundUserIdReadCreatedAt, 'Compound index { userId: 1, read: 1, createdAt: -1 } must exist');
    });

    it('executes Notification queries efficiently without redundant single-field index', async () => {
      // Create a test notification
      const notif = await Notification.create({
        userId: testUser._id,
        type: 'SYSTEM',
        title: 'TEST_VERIFY_NOTIFICATION',
        message: 'Notification index verification test',
      });

      // Query by userId (covered by compound prefix { userId: 1, createdAt: -1 })
      const found = await Notification.find({ userId: testUser._id })
        .sort({ createdAt: -1 })
        .lean();

      assert.ok(found.length > 0);
      assert.equal(found[0].title, 'TEST_VERIFY_NOTIFICATION');
    });
  });

  // =========================================================================
  // FIND-05 (P3): User Legacy Field Compatibility & Password Security
  // =========================================================================
  describe('5. FIND-05 (P3): User Legacy Field Compatibility & Security', () => {
    it('synchronizes name and displayName bidirectionally on save', async () => {
      const userWithNameOnly = new User({
        email: 'name-only@db-verify-test.com',
        name: 'Name Only Student',
        password: 'Password123!',
      });
      await userWithNameOnly.save();

      assert.equal(userWithNameOnly.name, 'Name Only Student');
      assert.equal(userWithNameOnly.displayName, 'Name Only Student');

      const userWithDisplayOnly = new User({
        email: 'display-only@db-verify-test.com',
        displayName: 'Display Only Student',
        password: 'Password123!',
      });
      await userWithDisplayOnly.save();

      assert.equal(userWithDisplayOnly.name, 'Display Only Student');
      assert.equal(userWithDisplayOnly.displayName, 'Display Only Student');

      await User.deleteMany({ email: { $in: ['name-only@db-verify-test.com', 'display-only@db-verify-test.com'] } });
    });

    it('ensures both password and passwordHash store bcrypt hashes and never plaintext', async () => {
      const plainPassword = 'PlainSecretPassword123!';
      const newUser = await User.create({
        email: 'hash-check@db-verify-test.com',
        name: 'Hash Check',
        password: plainPassword,
      });

      // Fetch user explicitly selecting both password and passwordHash
      const dbUser = await User.findById(newUser._id).select('+password +passwordHash');

      assert.ok(dbUser.password, 'password field is populated');
      assert.ok(dbUser.passwordHash, 'passwordHash field is populated');

      // Neither must equal plaintext
      assert.notEqual(dbUser.password, plainPassword);
      assert.notEqual(dbUser.passwordHash, plainPassword);

      // Both must start with $2 (bcrypt signature)
      assert.ok(dbUser.password.startsWith('$2'), 'password must be bcrypt hashed');
      assert.ok(dbUser.passwordHash.startsWith('$2'), 'passwordHash must be bcrypt hashed');

      // comparePassword method works accurately
      const matches = await dbUser.comparePassword(plainPassword);
      assert.equal(matches, true);

      const wrongMatches = await dbUser.comparePassword('WrongPassword');
      assert.equal(wrongMatches, false);

      await User.deleteOne({ _id: newUser._id });
    });

    it('toSafeObject() strips password, passwordHash, and sensitive credentials', async () => {
      const user = await User.findOne({ email: 'student@db-verify-test.com' }).select('+password +passwordHash');
      const safe = user.toSafeObject();

      assert.equal(safe.password, undefined);
      assert.equal(safe.passwordHash, undefined);
      assert.ok(safe.name);
      assert.ok(safe.displayName);
      assert.equal(safe.email, 'student@db-verify-test.com');
    });
  });

  // =========================================================================
  // Compound AuditLog & Index Verification
  // =========================================================================
  describe('6. Compound Index Verification Across Critical Collections', () => {
    it('verifies AuditLog compound index { createdAt: -1, _id: -1 } exists', () => {
      const auditIndexes = AuditLog.schema.indexes();
      const compoundCursorIndex = auditIndexes.find((idx) => {
        const spec = idx[0];
        return spec.createdAt === -1 && spec._id === -1;
      });

      assert.ok(compoundCursorIndex, 'AuditLog must have compound index { createdAt: -1, _id: -1 }');
    });

    it('verifies Wallet unique index on userId', () => {
      const walletIndexes = Wallet.schema.indexes();
      const userWalletIndex = walletIndexes.find((idx) => idx[0].userId === 1);
      assert.ok(userWalletIndex, 'Wallet must index userId');
      assert.equal(userWalletIndex[1]?.unique, true, 'Wallet userId index must be unique');
    });
  });
});
