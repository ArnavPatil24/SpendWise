require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { getEnvProblems } = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const isProduction = process.env.NODE_ENV === 'production';
const envProblems = getEnvProblems();

// Fail fast when running as a normal Node process. On serverless platforms the
// problem is reported on every API call instead, so it is visible in the browser.
if (envProblems.length && require.main === module) {
  console.error('\nSpendWise cannot start:\n' + envProblems.map(p => `  - ${p}`).join('\n') + '\n');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // correct client IPs behind Vercel / Render proxies

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = (process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : [])
  .map(url => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // curl, Postman, server-to-server
    const clean = origin.replace(/\/+$/, '');
    const isLocal = clean.startsWith('http://localhost:') || clean.startsWith('http://127.0.0.1:');
    if (allowedOrigins.includes(clean) || (!isProduction && isLocal)) return callback(null, true);
    return callback(new Error(`CORS blocked: Origin ${origin} is not permitted.`));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

const dbState = () => (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected');

app.get('/', (req, res) => {
  res.json({ success: true, message: 'SpendWise API is running.', database: dbState() });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: dbState() === 'connected' ? 'SpendWise API and Database are healthy.' : 'SpendWise API is running. Database is not connected.',
    database: dbState()
  });
});

app.use('/api', (req, res, next) => {
  if (!envProblems.length) return next();
  return res.status(500).json({ message: `Server is misconfigured: ${envProblems.join(' ')}` });
});

app.use('/api', apiLimiter);

app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    res.status(503).json({
      message: 'Database unavailable. Please check your MongoDB Atlas connection string and Network Access settings.'
    });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/recurring', require('./routes/recurring'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/income', require('./routes/income'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`SpendWise API running on port ${PORT}`));
}

module.exports = app;
