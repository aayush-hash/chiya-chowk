const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();
console.log("FRONTEND_URL FROM ENV:", process.env.FRONTEND_URL);

const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const tableRoutes = require('./routes/tables');
const userRoutes = require('./routes/users');

const app = express();

// ===== CONNECT DB =====
connectDB();

// ===== SECURITY MIDDLEWARE =====

const http = require('http');
const descriptor = Object.getOwnPropertyDescriptor(http.IncomingMessage.prototype, 'query');
if (descriptor && !descriptor.set) {
  Object.defineProperty(http.IncomingMessage.prototype, 'query', {
    get: descriptor.get,
    set(val) { this._query = val; },
    configurable: true,
  });
}

// Trust proxy (needed for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// Rate limiting - general
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiting - stricter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);

// Body parsing with size limits (prevent payload attacks)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Safe NoSQL injection sanitizer (Node 18+ compatible)
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (/^\$/.test(key) || key.includes('.')) {
          delete obj[key];
        } else {
          sanitize(obj[key]);
        }
      }
    }
  };
  sanitize(req.body);
  sanitize(req.params);
  next();
});

// HTTP Parameter Pollution prevention (custom, Node 18+ compatible)
const hppWhitelist = ['status', 'payment', 'category', 'sort'];
app.use((req, res, next) => {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (!hppWhitelist.includes(key) && Array.isArray(req.body[key])) {
        req.body[key] = req.body[key][0];
      }
    }
  }
  next();
});

// Compression
app.use(compression());

// HTTP request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req, res) => res.statusCode < 400,
  }));
}

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    env: process.env.NODE_ENV,
  });
});

// ===== API ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/users', userRoutes);

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ===== GLOBAL ERROR HANDLER =====
app.use(errorHandler);

// ===== UNHANDLED REJECTIONS =====
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`🍵 Chiya Chowk API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close();
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app;