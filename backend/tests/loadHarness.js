import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

import connectDB, { disconnectDB } from '../src/config/db.js';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Conversation from '../src/models/Conversation.js';
import Message from '../src/models/Message.js';
import AIUsageLog from '../src/models/AIUsageLog.js';
import { generateAccessToken } from '../src/services/sessionService.js';
import { aiCircuitBreaker } from '../src/services/aiService.js';

// Parse CLI flags
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    users: 10,
    duration: 30, // seconds
    rate: 'normal', // 'light' | 'normal' | 'burst'
    mode: 'mock', // 'mock' | 'real'
    simulatedLatency: 1000, // ms
    target: 'http://127.0.0.1:5000',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--users' && args[i + 1]) {
      options.users = parseInt(args[++i], 10);
    } else if (arg === '--duration' && args[i + 1]) {
      options.duration = parseInt(args[++i], 10);
    } else if (arg === '--rate' && args[i + 1]) {
      options.rate = args[++i].toLowerCase();
    } else if (arg === '--mode' && args[i + 1]) {
      options.mode = args[++i].toLowerCase();
    } else if (arg === '--simulated-latency' && args[i + 1]) {
      options.simulatedLatency = parseInt(args[++i], 10);
    } else if (arg === '--target' && args[i + 1]) {
      options.target = args[++i];
    }
  }

  return options;
}

// Safety validation
function enforceSafetyGuards(options) {
  const allowedHosts = ['localhost', '127.0.0.1'];
  let parsedUrl;
  try {
    parsedUrl = new URL(options.target);
  } catch {
    console.error(`[SAFETY ERROR] Invalid target URL: ${options.target}`);
    process.exit(1);
  }

  if (!allowedHosts.includes(parsedUrl.hostname)) {
    console.error(`[SAFETY VIOLATION] Target host '${parsedUrl.hostname}' rejected. Only local testing (localhost, 127.0.0.1) is permitted.`);
    process.exit(1);
  }

  if (options.mode === 'real') {
    console.error('[SAFETY SHIELD] Real-OpenAI test mode cannot be run without explicit confirmation.');
    process.exit(1);
  }

  const validUsers = [10, 25, 50, 100, 500];
  if (!validUsers.includes(options.users)) {
    console.warn(`[WARN] Concurrency ${options.users} is not in standard set (${validUsers.join(', ')}). Proceeding cautiously.`);
  }
}

// Measure Event Loop Lag
let maxEventLoopLag = 0;
let lastLoopCheck = performance.now();
const lagInterval = setInterval(() => {
  const now = performance.now();
  const lag = Math.max(0, now - lastLoopCheck - 100);
  if (lag > maxEventLoopLag) maxEventLoopLag = lag;
  lastLoopCheck = now;
}, 100);
lagInterval.unref();

// Calculate percentiles helper
function calculatePercentile(sortedValues, percentile) {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

async function runLoadTest() {
  const options = parseArgs();
  enforceSafetyGuards(options);

  console.log('\n==================================================');
  console.log('🚀 EduFlow AI Mentor Load Test Harness');
  console.log('==================================================');
  console.log(`Concurrency:       ${options.users} virtual users`);
  console.log(`Duration:          ${options.duration}s`);
  console.log(`Traffic Pattern:   ${options.rate.toUpperCase()}`);
  console.log(`AI Mode:           ${options.mode.toUpperCase()}`);
  console.log(`Simulated Latency: ${options.simulatedLatency}ms`);
  console.log(`Target:            ${options.target}`);
  console.log('==================================================\n');

  // Enforce mock key in mock mode to guarantee no external API calls
  if (options.mode === 'mock') {
    process.env.AI_API_KEY = 'your_openai_api_key_bench';
    process.env.OPENAI_API_KEY = 'your_openai_api_key_bench';
  }

  // Set simulated latency in process.env for the mock mode
  process.env.MOCK_AI_LATENCY_MS = String(options.simulatedLatency);

  // Reset circuit breaker so prior test state does not carry over
  aiCircuitBreaker.reset();

  // 1. Connect to MongoDB
  console.log('[1/5] Connecting to MongoDB...');
  await connectDB();

  // 2. Start in-process HTTP server if port 5000 is not yet listening, or bind port
  let serverInstance = null;
  let targetBaseUrl = options.target;

  const isServerRunning = await fetch(`${targetBaseUrl}/health`)
    .then((r) => r.ok)
    .catch(() => false);

  if (!isServerRunning) {
    console.log('[2/5] Target server not detected. Starting in-process HTTP server on port 5000...');
    const urlObj = new URL(options.target);
    const port = parseInt(urlObj.port, 10) || 5000;
    serverInstance = http.createServer(app);
    await new Promise((resolve, reject) => {
      serverInstance.listen(port, '127.0.0.1', () => {
        console.log(`In-process HTTP server listening at http://127.0.0.1:${port}`);
        targetBaseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
      serverInstance.on('error', reject);
    });
  } else {
    console.log(`[2/5] Attached to existing server at ${targetBaseUrl}`);
  }

  // 3. Create isolated virtual users and tokens
  console.log(`[3/5] Provisioning ${options.users} distinct authenticated virtual users in MongoDB...`);
  await User.deleteMany({ email: /@benchmark\.internal$/ });
  const testBatchId = Date.now().toString(36);
  const virtualUsers = [];

  for (let i = 1; i <= options.users; i++) {
    const randomSuffix = Math.random().toString(36).slice(2, 6);
    const userDoc = await User.create({
      email: `u_${testBatchId}_${i}_${randomSuffix}@benchmark.internal`,
      username: `u_${testBatchId}_${i}_${randomSuffix}`,
      name: `Virtual Learner ${i}`,
      displayName: `Learner ${i}`,
      role: 'user',
      status: 'active',
      level: 'intermediate',
      subjects: ['Computer Science', 'Mathematics'],
    });

    const token = generateAccessToken(userDoc._id);
    virtualUsers.push({
      id: userDoc._id.toString(),
      token,
      conversationId: null,
      requestCount: 0,
    });
  }

  console.log(`Provisioned ${virtualUsers.length} test users with distinct JWT tokens.\n`);

  // 4. Determine pacing per virtual user
  // LIGHT:  ~1 request/user/minute -> interval = ~60s
  // NORMAL: ~2 requests/user/minute -> interval = ~30s
  // BURST:  rapid requests with short think-time -> interval = ~3s
  let userIntervalMs = 30000;
  if (options.rate === 'light') userIntervalMs = 60000;
  if (options.rate === 'burst') userIntervalMs = 3000;

  // Stagger start to avoid artificial instant-stampede
  const staggerStepMs = Math.min(2000, Math.floor(userIntervalMs / options.users));

  // Metrics tracking
  const metrics = {
    total: 0,
    success: 0,
    status2xx: 0,
    status4xx: 0,
    status429: 0,
    status5xx: 0,
    failed: 0,
    connectionErrors: 0,
    latencies: [],
    startTime: performance.now(),
    endTime: null,
  };

  console.log(`[4/5] Running ${options.duration}-second benchmark test...`);
  const testEndTime = Date.now() + options.duration * 1000;
  let activeWorkers = 0;
  let abortEarly = false;
  let abortReason = '';

  const sendMentorRequest = async (virtualUser) => {
    const reqStart = performance.now();
    try {
      const payload = {
        message: `Hello mentor, please explain algorithm step ${virtualUser.requestCount + 1} for my exam.`,
        mode: 'explain',
        subject: 'Computer Science',
      };
      if (virtualUser.conversationId) {
        payload.conversationId = virtualUser.conversationId;
      }

      const res = await fetch(`${targetBaseUrl}/api/mentor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${virtualUser.token}`,
        },
        body: JSON.stringify(payload),
      });

      const reqEnd = performance.now();
      const latency = reqEnd - reqStart;
      metrics.latencies.push(latency);
      metrics.total++;
      virtualUser.requestCount++;

      if (res.status >= 200 && res.status < 300) {
        metrics.success++;
        metrics.status2xx++;
        const data = await res.json().catch(() => null);
        if (data?.conversation?.id) {
          virtualUser.conversationId = data.conversation.id;
        }
      } else {
        if (res.status === 429) metrics.status429++;
        if (res.status >= 400 && res.status < 500) metrics.status4xx++;
        if (res.status >= 500) metrics.status5xx++;
        metrics.failed++;
      }

      // Safety check: abort if error rate > 5% after minimum 20 requests
      if (metrics.total >= 20 && metrics.failed / metrics.total > 0.05) {
        abortEarly = true;
        abortReason = `Error rate exceeded 5% (${((metrics.failed / metrics.total) * 100).toFixed(1)}%). Safety guard triggered.`;
      }
    } catch (netErr) {
      metrics.total++;
      metrics.failed++;
      metrics.connectionErrors++;
      if (metrics.total >= 10 && metrics.connectionErrors >= 5) {
        abortEarly = true;
        abortReason = `Multiple connection failures (${metrics.connectionErrors}). Safety guard triggered.`;
      }
    }
  };

  // Virtual User simulation loops
  const userPromises = virtualUsers.map(async (vUser, idx) => {
    activeWorkers++;
    // Initial stagger delay
    await new Promise((r) => setTimeout(r, idx * staggerStepMs));

    while (Date.now() < testEndTime && !abortEarly) {
      await sendMentorRequest(vUser);
      // Wait for next scheduled interval or finish
      const remainingTime = testEndTime - Date.now();
      if (remainingTime <= 0 || abortEarly) break;
      const sleepTime = Math.min(remainingTime, userIntervalMs);
      await new Promise((r) => setTimeout(r, sleepTime));
    }
    activeWorkers--;
  });

  await Promise.all(userPromises);
  metrics.endTime = performance.now();
  const testDurationSec = (metrics.endTime - metrics.startTime) / 1000;

  // 5. Cleanup test artifacts from MongoDB
  console.log('\n[5/5] Cleaning up virtual test users and generated test data...');
  const userIds = virtualUsers.map((u) => u.id);
  await User.deleteMany({ _id: { $in: userIds } });
  await Conversation.deleteMany({ userId: { $in: userIds } });
  await Message.deleteMany({ userId: { $in: userIds } });
  await AIUsageLog.deleteMany({ userId: { $in: userIds } });
  console.log('Cleanup completed cleanly.');

  // Check Circuit Breaker stats
  const cbStats = aiCircuitBreaker.getStats ? aiCircuitBreaker.getStats() : { state: aiCircuitBreaker.state };

  // Calculate statistics
  metrics.latencies.sort((a, b) => a - b);
  const avgLatency = metrics.latencies.length > 0 ? metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length : 0;
  const p50 = calculatePercentile(metrics.latencies, 50);
  const p75 = calculatePercentile(metrics.latencies, 75);
  const p90 = calculatePercentile(metrics.latencies, 90);
  const p95 = calculatePercentile(metrics.latencies, 95);
  const p99 = calculatePercentile(metrics.latencies, 99);
  const maxLat = metrics.latencies.length > 0 ? metrics.latencies[metrics.latencies.length - 1] : 0;
  const rps = testDurationSec > 0 ? (metrics.total / testDurationSec).toFixed(2) : 0;
  const errorRate = metrics.total > 0 ? ((metrics.failed / metrics.total) * 100).toFixed(2) : 0;
  const rate429 = metrics.total > 0 ? ((metrics.status429 / metrics.total) * 100).toFixed(2) : 0;
  const rate5xx = metrics.total > 0 ? ((metrics.status5xx / metrics.total) * 100).toFixed(2) : 0;

  // Output structured report
  console.log('\n==================================================');
  console.log('📊 BENCHMARK TEST RESULTS');
  console.log('==================================================');
  if (abortEarly) {
    console.log(`⚠️  TEST ABORTED EARLY: ${abortReason}`);
  }

  console.log('\n| Users | Requests | RPS | Avg | P50 | P95 | P99 | Errors | 429 | 5xx |');
  console.log('|------:|---------:|----:|----:|----:|----:|----:|-------:|----:|----:|');
  console.log(
    `| ${options.users} | ${metrics.total} | ${rps} | ${avgLatency.toFixed(1)}ms | ${p50.toFixed(1)}ms | ${p95.toFixed(1)}ms | ${p99.toFixed(1)}ms | ${errorRate}% | ${rate429}% | ${rate5xx}% |`
  );

  console.log('\nDetailed Metrics:');
  console.log(`- Total Requests:      ${metrics.total}`);
  console.log(`- Successful (2xx):    ${metrics.status2xx}`);
  console.log(`- Client Errors (4xx): ${metrics.status4xx} (429 Rate-limits: ${metrics.status429})`);
  console.log(`- Server Errors (5xx): ${metrics.status5xx}`);
  console.log(`- Latency P50:         ${p50.toFixed(1)}ms`);
  console.log(`- Latency P75:         ${p75.toFixed(1)}ms`);
  console.log(`- Latency P90:         ${p90.toFixed(1)}ms`);
  console.log(`- Latency P95:         ${p95.toFixed(1)}ms`);
  console.log(`- Latency P99:         ${p99.toFixed(1)}ms`);
  console.log(`- Latency Max:         ${maxLat.toFixed(1)}ms`);
  console.log(`- Max Event Loop Lag:  ${maxEventLoopLag.toFixed(2)}ms`);
  console.log(`- Circuit Breaker:     ${cbStats.state || 'CLOSED'}`);
  console.log(`- Mongo Connection:    ${mongoose.connection.readyState === 1 ? 'Healthy (Connected)' : 'Degraded'}`);

  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
    console.log('In-process HTTP server shut down.');
  }

  await disconnectDB();
  console.log('==================================================\n');
}

runLoadTest().catch((err) => {
  console.error('Fatal load test harness failure:', err);
  process.exit(1);
});
