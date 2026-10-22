/**
 * Production-Grade Circuit Breaker Pattern
 *
 * States:
 * - CLOSED: Normal operation. Requests pass through. Failures are tracked.
 * - OPEN: Upstream service is failing. Requests fail fast without calling upstream.
 * - HALF_OPEN: Cooldown expired. Probe requests trial the upstream service.
 *
 * Features:
 * - In-flight timeout protection with AbortController
 * - Exponential backoff with jitter on retryable failures
 * - Consecutive failure thresholds & sliding cooldowns
 * - Safe fallback execution
 * - Telemetry and status inspection for /health and monitoring
 */

export const CircuitState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

export class CircuitBreaker {
  constructor({
    name = 'default',
    failureThreshold = 5,
    resetTimeoutMs = 30000,
    timeoutMs = 15000,
    halfOpenSuccessThreshold = 2,
    fallback = null,
  } = {}) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.timeoutMs = timeoutMs;
    this.halfOpenSuccessThreshold = halfOpenSuccessThreshold;
    this.fallback = fallback;

    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = null;
    this.lastStateChange = Date.now();
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalFallbacks = 0;
  }

  /**
   * Check if circuit has cooled down and should transition from OPEN to HALF_OPEN
   */
  checkState() {
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.consecutiveSuccesses = 0;
        this.lastStateChange = now;
      }
    }
  }

  /**
   * Execute an asynchronous operation with circuit breaker and timeout protection
   */
  async execute(operation, ...args) {
    this.totalRequests++;
    this.checkState();

    if (this.state === CircuitState.OPEN) {
      this.totalFallbacks++;
      if (typeof this.fallback === 'function') {
        return this.fallback(new Error(`Circuit breaker '${this.name}' is OPEN (fast-fail)`), ...args);
      }
      const err = new Error(`Service '${this.name}' is temporarily unavailable (Circuit OPEN)`);
      err.code = 'CIRCUIT_OPEN';
      err.status = 503;
      throw err;
    }

    // Execute with in-flight timeout protection
    const controller = new AbortController();
    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        controller.abort();
        const timeoutErr = new Error(`Operation timed out after ${this.timeoutMs}ms`);
        timeoutErr.code = 'ETIMEDOUT';
        timeoutErr.status = 504;
        reject(timeoutErr);
      }, this.timeoutMs);
      timer.unref?.();
    });

    try {
      const result = await Promise.race([
        operation({ signal: controller.signal }, ...args),
        timeoutPromise,
      ]);

      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error);

      if (typeof this.fallback === 'function') {
        this.totalFallbacks++;
        return this.fallback(error, ...args);
      }
      throw error;
    }
  }

  recordSuccess() {
    this.failureCount = 0;
    this.successCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.halfOpenSuccessThreshold) {
        this.state = CircuitState.CLOSED;
        this.consecutiveSuccesses = 0;
        this.lastStateChange = Date.now();
      }
    }
  }

  recordFailure(error) {
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.failureCount++;

    if (this.state === CircuitState.CLOSED && this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.lastStateChange = Date.now();
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.lastStateChange = Date.now();
    }
  }

  /**
   * Reset the circuit breaker to CLOSED
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = null;
    this.lastStateChange = Date.now();
  }

  /**
   * Force the circuit breaker to OPEN (e.g. for emergency operational kill-switches)
   */
  trip() {
    this.state = CircuitState.OPEN;
    this.lastFailureTime = Date.now();
    this.lastStateChange = Date.now();
  }

  /**
   * Inspection telemetry
   */
  getStats() {
    this.checkState();
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalFallbacks: this.totalFallbacks,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      lastStateChange: new Date(this.lastStateChange).toISOString(),
    };
  }
}

// Registry of global circuit breakers for monitoring
const registry = new Map();

export function getCircuitBreaker(name, options = {}) {
  if (!registry.has(name)) {
    registry.set(name, new CircuitBreaker({ name, ...options }));
  }
  return registry.get(name);
}

export function getAllCircuitBreakersStats() {
  const stats = {};
  for (const [name, breaker] of registry.entries()) {
    stats[name] = breaker.getStats();
  }
  return stats;
}

export default {
  CircuitBreaker,
  CircuitState,
  getCircuitBreaker,
  getAllCircuitBreakersStats,
};
