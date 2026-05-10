const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const tableRoutes = require('./routes/tables');
const userRoutes = require('./routes/users');
const inventoryRoutes = require('./routes/inventory');
const qrRoutes = require('./routes/qr');

const app = express();

// ===== CONNECT DB =====
connectDB();

// Trust proxy
app.set('trust proxy', 1);

// CORS
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    const allowed = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://chiya-chowk.vercel.app',
      process.env.FRONTEND_URL,
    ];

    if (
      allowed.includes(origin) ||
      origin.endsWith('.vercel.app')        // ← allows ALL vercel preview URLs
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// ===== RATE LIMITING =====
// Disabled in development — only active in production
if (process.env.NODE_ENV === 'production') {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many login attempts. Please wait 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  });
  app.use('/api/auth/login', authLimiter);

  const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 300,
    message: { success: false, message: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => ['/api/qr/orders/live', '/api/orders/stats/dashboard'].some(p => req.path.includes(p)),
  });
  app.use('/api/', generalLimiter);
}

// ===== BODY PARSING =====
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ===== NOSQL INJECTION SANITIZER =====
// Only strip keys that start with $ at top level — don't touch arrays or nested objects
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitizeShallow = (obj) => {
      if (Array.isArray(obj)) {
        obj.forEach(item => sanitizeShallow(item));
      } else if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
          if (key.startsWith('$')) {
            delete obj[key];
          } else {
            sanitizeShallow(obj[key]);
          }
        }
      }
    };
    sanitizeShallow(req.body);
  }
  next();
});

// ===== COMPRESSION =====
app.use(compression());

// ===== LOGGING =====
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
app.use('/api/inventory', inventoryRoutes);
app.use('/api/qr', qrRoutes);



// TEMPORARY SEED ROUTE - REMOVE AFTER USE
app.get('/seed-now', async (req, res) => {
  try {
    const User = require('./models/User');
    const MenuItem = require('./models/MenuItem');
    const Table = require('./models/Table');
    const Settings = require('./models/Settings');
    const Order = require('./models/Order');

    await Promise.all([
      User.deleteMany(),
      MenuItem.deleteMany(),
      Table.deleteMany(),
      Settings.deleteMany(),
      Order.deleteMany(),
    ]);

    const adminUser = await User.create({
      name: 'Admin',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      email: 'admin@chiyachowk.com',
    });

    await User.create({ name: 'Sita Shrestha', username: 'staff', password: 'staff123', role: 'staff' });
    await User.create({ name: 'Ram Bahadur', username: 'cashier1', password: 'cashier123', role: 'cashier' });

    res.json({ 
      success: true, 
      message: '✅ Database seeded!',
      login: { username: 'admin', password: 'admin123' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
  if (process.env.NODE_ENV === 'production') process.exit(1);
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
