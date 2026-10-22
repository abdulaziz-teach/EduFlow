import Wallet from '../models/Wallet.js';
import WalletTransaction from '../models/WalletTransaction.js';

const VALID_CURRENCIES = ['coins', 'gems', 'tickets'];

/**
 * Get or create wallet for user with default balance (100 coins, 0 gems, 5 tickets)
 */
export const getOrCreateWallet = async (userId, session = null) => {
  const options = session ? { session } : {};
  let wallet = await Wallet.findOne({ userId }, null, options);
  if (!wallet) {
    try {
      wallet = await Wallet.create(
        [
          {
            userId,
            coins: 100,
            gems: 0,
            tickets: 5,
          },
        ],
        options
      );
      wallet = wallet[0];
    } catch (err) {
      // Catch potential race condition if created concurrently
      if (err.code === 11000) {
        wallet = await Wallet.findOne({ userId }, null, options);
      } else {
        throw err;
      }
    }
  }
  return wallet;
};

/**
 * Credit currency to user's wallet with concurrency safety and idempotency
 */
export const creditBalance = async ({
  userId,
  currency,
  amount,
  type = 'earn',
  referenceType = 'system',
  referenceId = null,
  idempotencyKey = null,
  metadata = {},
  session = null,
}) => {
  if (!VALID_CURRENCIES.includes(currency)) {
    throw new Error(`Invalid currency: ${currency}`);
  }
  if (typeof amount !== 'number' || amount <= 0 || !Number.isFinite(amount)) {
    throw new Error('Credit amount must be a positive finite number');
  }

  const queryOptions = session ? { session } : {};

  // 1. Idempotency check: if transaction exists with this key, return it without duplicate credit
  if (idempotencyKey) {
    const existingTx = await WalletTransaction.findOne({ idempotencyKey }, null, queryOptions);
    if (existingTx) {
      const wallet = await Wallet.findOne({ userId }, null, queryOptions);
      return { wallet, transaction: existingTx, duplicate: true };
    }
  }

  // 2. Ensure wallet exists
  await getOrCreateWallet(userId, session);

  // 3. Atomically increment balance
  const updatedWallet = await Wallet.findOneAndUpdate(
    { userId },
    { $inc: { [currency]: amount } },
    { new: true, ...queryOptions }
  );

  const balanceAfter = updatedWallet[currency];
  const balanceBefore = balanceAfter - amount;

  // 4. Record transaction log
  const txData = {
    userId,
    walletId: updatedWallet._id,
    type,
    currency,
    amount,
    balanceBefore,
    balanceAfter,
    referenceType,
    referenceId,
    ...(idempotencyKey ? { idempotencyKey } : {}),
    metadata,
  };

  const transactionDocs = await WalletTransaction.create(
    [txData],
    queryOptions
  );

  return { wallet: updatedWallet, transaction: transactionDocs[0], duplicate: false };
};

/**
 * Debit currency from user's wallet with strict precondition check against race conditions
 */
export const debitBalance = async ({
  userId,
  currency,
  amount,
  type = 'spend',
  referenceType = 'shop',
  referenceId = null,
  idempotencyKey = null,
  metadata = {},
  session = null,
}) => {
  if (!VALID_CURRENCIES.includes(currency)) {
    throw new Error(`Invalid currency: ${currency}`);
  }
  if (typeof amount !== 'number' || amount <= 0 || !Number.isFinite(amount)) {
    throw new Error('Debit amount must be a positive finite number');
  }

  const queryOptions = session ? { session } : {};

  // 1. Idempotency check
  if (idempotencyKey) {
    const existingTx = await WalletTransaction.findOne({ idempotencyKey }, null, queryOptions);
    if (existingTx) {
      const wallet = await Wallet.findOne({ userId }, null, queryOptions);
      return { wallet, transaction: existingTx, duplicate: true };
    }
  }

  // 2. Ensure wallet exists
  await getOrCreateWallet(userId, session);

  // 3. Atomically decrement ONLY if current balance >= amount (concurrency safe)
  const updatedWallet = await Wallet.findOneAndUpdate(
    {
      userId,
      [currency]: { $gte: amount },
    },
    {
      $inc: { [currency]: -amount },
    },
    { new: true, ...queryOptions }
  );

  if (!updatedWallet) {
    throw new Error('INSUFFICIENT_FUNDS');
  }

  const balanceAfter = updatedWallet[currency];
  const balanceBefore = balanceAfter + amount;

  // 4. Record transaction log
  const txData = {
    userId,
    walletId: updatedWallet._id,
    type,
    currency,
    amount,
    balanceBefore,
    balanceAfter,
    referenceType,
    referenceId,
    ...(idempotencyKey ? { idempotencyKey } : {}),
    metadata,
  };

  const transactionDocs = await WalletTransaction.create(
    [txData],
    queryOptions
  );

  return { wallet: updatedWallet, transaction: transactionDocs[0], duplicate: false };
};
