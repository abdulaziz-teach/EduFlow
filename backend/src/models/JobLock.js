import mongoose from 'mongoose';

/**
 * Distributed Job Lock Schema
 *
 * Implements an atomic lease-based distributed locking mechanism for background workers
 * and schedulers across horizontally scaled instances without requiring Redis or ZooKeeper.
 */
const jobLockSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      description: 'Unique job/sweep identifier, e.g. sweep:notifications',
    },
    lockedBy: {
      type: String,
      required: true,
      description: 'Identifier of the worker or host process holding the lock',
    },
    lockedAt: {
      type: Date,
      default: Date.now,
    },
    leaseExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    executionCount: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/**
 * Attempt to acquire an exclusive distributed lease for a job.
 *
 * @param {string} jobName Name of the job to lock
 * @param {number} leaseDurationMs How long the lease is valid before auto-expiring (default: 60s)
 * @param {string} workerId Unique worker/process identifier
 * @returns {Promise<{acquired: boolean, lock?: Object}>}
 */
jobLockSchema.statics.acquireLease = async function (
  jobName,
  leaseDurationMs = 60000,
  workerId = `pid_${process.pid}_${Math.random().toString(36).substring(2, 8)}`
) {
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);

  try {
    // 1. Try to take over an existing expired lease or refresh own lease
    const updated = await this.findOneAndUpdate(
      {
        _id: jobName,
        $or: [
          { leaseExpiresAt: { $lt: now } },
          { lockedBy: workerId },
        ],
      },
      {
        $set: {
          lockedBy: workerId,
          lockedAt: now,
          leaseExpiresAt,
        },
        $inc: { executionCount: 1 },
      },
      { returnDocument: 'after' }
    );

    if (updated) {
      return { acquired: true, lock: updated, workerId };
    }

    // 2. If document did not exist at all, attempt atomic insert
    const created = await this.create({
      _id: jobName,
      lockedBy: workerId,
      lockedAt: now,
      leaseExpiresAt,
      executionCount: 1,
    });

    return { acquired: true, lock: created, workerId };
  } catch (err) {
    // Duplicate key (code 11000) means another worker acquired it simultaneously
    if (err.code === 11000) {
      return { acquired: false, workerId };
    }
    console.warn(`[JobLock] Error acquiring lock for '${jobName}':`, err.message);
    return { acquired: false, workerId };
  }
};

/**
 * Release an acquired lease early upon successful job completion.
 *
 * @param {string} jobName Name of the job
 * @param {string} workerId Worker identifier that acquired the lock
 */
jobLockSchema.statics.releaseLease = async function (jobName, workerId) {
  try {
    await this.deleteOne({
      _id: jobName,
      lockedBy: workerId,
    });
    return true;
  } catch (err) {
    console.warn(`[JobLock] Error releasing lock for '${jobName}':`, err.message);
    return false;
  }
};

const JobLock = mongoose.model('JobLock', jobLockSchema);

export default JobLock;
