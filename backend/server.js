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

// Routes
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const tableRoutes = require('./routes/tables');
const userRoutes = require('./routes/users');
const inventoryRoutes = require('./routes/inventory');
const qrRoutes = require('./routes/qr');

const app = express();

// ===== DB CONNECT =====
connectDB();

// ===== TRUST PROXY (RENDER FIX) =====
app.set('trust proxy', 1);

// ===============================
// ✅ FIXED CORS (PRODUCTION SAFE)
// ===============================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chiya-chowk.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // allow server-to-server / mobile apps
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app');

    if (isAllowed) {
      return callback(null, true);
    }

    console.log("❌ CORS BLOCKED:", origin);
    return callback(null, false); // IMPORTANT: do NOT throw error
  },

  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 🔥 Handle preflight requests (VERY IMPORTANT)
app.options('*', cors());

// ===== SECURITY HEADERS =====
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

// ===== RATE LIMITING (PRODUCTION ONLY) =====
if (process.env.NODE_ENV === 'production') {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many login attempts. Try later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  });

  app.use('/api/auth/login', authLimiter);

  const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 300,
    message: { success: false, message: 'Too many requests.' },
  });

  app.use('/api/', generalLimiter);
}

// ===== BODY PARSING =====
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ===== SANITIZER =====
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const clean = (obj) => {
      if (Array.isArray(obj)) return obj.forEach(clean);
      if (obj && typeof obj === 'object') {
        for (const key in obj) {
          if (key.startsWith('$')) delete obj[key];
          else clean(obj[key]);
        }
      }
    };
    clean(req.body);
  }
  next();
});

// ===== COMPRESSION =====
app.use(compression());

// ===== LOGGING =====
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    })
  );
}

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    env: process.env.NODE_ENV,
  });
});

// ===== ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/qr', qrRoutes);

// Root
app.get('/', (req, res) => {
  res.json({ message: "Chiya Chowk API Running" });
});

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ===== ERROR HANDLER =====
app.use(errorHandler);

// ===== UNHANDLED ERRORS =====
process.on('unhandledRejection', (err) => {
  logger.error(err.message);
});

process.on('uncaughtException', (err) => {
  logger.error(err.message);
  process.exit(1);
});

// ===== SERVER START =====
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`🍵 Server running on port ${PORT}`);
});
