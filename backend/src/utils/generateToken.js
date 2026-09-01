import jwt from 'jsonwebtoken';

/**
 * Generate a JWT containing only the minimum necessary payload.
 *
 * NOTE (future improvement): For production, consider short-lived access tokens
 * (e.g. 15 min) paired with refresh token rotation to limit exposure if a
 * token is compromised.
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

export default generateToken;
