import mongoose from 'mongoose';

/**
 * Universal Production-Hardened MongoDB Transaction Helper
 *
 * Runs workFn within a MongoDB ACID transaction.
 *
 * PRODUCTION SAFETY RULE:
 * In production and staging environments (`NODE_ENV === 'production' || 'staging'`),
 * transactions are MANDATORY. Silent fallback to non-transactional execution (`workFn(null)`)
 * is strictly prohibited to prevent financial inconsistency, double-spending, and partial writes.
 * If transactions are unavailable, it fails fast with TRANSACTION_REPLICA_SET_REQUIRED.
 *
 * In local development, if standalone MongoDB is active, it allows fallback with an explicit
 * logged warning to avoid impeding developer setup.
 *
 * @param {Function} workFn - Async callback accepting (session)
 * @param {Object} options - Options { strict?: boolean }
 */
export const withTransaction = async (workFn, options = {}) => {
  const isStrict =
    options.strict === true ||
    process.env.REQUIRE_TRANSACTIONS === 'true' ||
    ['production', 'staging'].includes(process.env.NODE_ENV);

  let session = null;
  try {
    session = await mongoose.startSession();
  } catch (startErr) {
    if (isStrict) {
      const err = new Error(
        'MongoDB transaction session initialization failed: Multi-document operations in production/staging require a MongoDB Replica Set or MongoDB Atlas cluster. Fallback execution is prohibited for data integrity.'
      );
      err.errorCode = 'TRANSACTION_REPLICA_SET_REQUIRED';
      err.cause = startErr;
      throw err;
    }
    console.warn(
      '[TRANSACTION WARNING] Unable to start session (standalone MongoDB). Executing without transaction in development mode.'
    );
    return workFn(null);
  }

  try {
    session.startTransaction();
    const result = await workFn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        console.error('Error aborting transaction:', abortErr.message);
      }
    }

    // Check if error is due to standalone MongoDB lacking replica set support
    const isReplicaSetError =
      err.message &&
      (err.message.includes('replica set') ||
        err.message.includes('Transaction numbers are only allowed') ||
        err.message.includes('This MongoDB deployment does not support retryable writes'));

    if (isReplicaSetError) {
      if (isStrict) {
        const strictErr = new Error(
          'MongoDB transaction failed: Transactions require a MongoDB Replica Set or MongoDB Atlas deployment. Fallback execution is strictly prohibited in production/staging environments.'
        );
        strictErr.errorCode = 'TRANSACTION_REPLICA_SET_REQUIRED';
        strictErr.cause = err;
        throw strictErr;
      }

      console.warn(
        '[TRANSACTION WARNING] Standalone MongoDB detected. Falling back to non-transactional execution in local development only. This is prohibited in production.'
      );
      return workFn(null);
    }

    throw err;
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch {
        // Session end cleanup
      }
    }
  }
};

export default withTransaction;

