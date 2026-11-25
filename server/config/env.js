const PLACEHOLDER_SECRET = 'your_super_secret_jwt_key_here_change_in_production';

/**
 * Returns a list of human-readable problems with the environment.
 * An empty list means the server is safe to start.
 */
function getEnvProblems(env = process.env) {
  const problems = [];

  if (!env.MONGO_URI) {
    problems.push('MONGO_URI is missing.');
  }

  if (!env.JWT_SECRET) {
    problems.push('JWT_SECRET is missing. Set a long random string in server/.env.');
  } else if (env.JWT_SECRET.length < 16) {
    problems.push('JWT_SECRET is too short. Use at least 16 characters (32+ recommended).');
  } else if (env.NODE_ENV === 'production' && env.JWT_SECRET === PLACEHOLDER_SECRET) {
    problems.push('JWT_SECRET is still the example value. Generate a unique secret before deploying.');
  }

  return problems;
}

module.exports = { getEnvProblems };
