/**
 * SuperMemo-2 (SM-2) Spaced Repetition Engine
 *
 * All scheduling calculations are executed server-side.
 * The client only submits a recall rating from 0 to 5.
 */

export const calculateNextReview = ({
  rating, // 0 = complete blackout, 1 = incorrect, 2 = incorrect with recall, 3 = correct with difficulty, 4 = good, 5 = perfect
  previousEaseFactor = 2.5,
  previousInterval = 0,
  previousRepetitions = 0,
  previousLapses = 0,
}) => {
  // Validate rating
  const grade = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));

  let repetitions = previousRepetitions;
  let interval = previousInterval;
  let lapses = previousLapses;
  let easeFactor = previousEaseFactor;

  if (grade >= 3) {
    // Successful recall
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Failed recall (lapse)
    repetitions = 0;
    interval = 1;
    lapses += 1;
  }

  // Calculate new ease factor according to SM-2 formula
  easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }
  // Round to 2 decimal places for clean precision
  easeFactor = Math.round(easeFactor * 100) / 100;

  // Calculate next due date
  const now = Date.now();
  const dueAt = new Date(now + interval * 24 * 60 * 60 * 1000);

  return {
    easeFactor,
    interval,
    repetitions,
    lapses,
    dueAt,
    lastReviewedAt: new Date(now),
  };
};

export default { calculateNextReview };
