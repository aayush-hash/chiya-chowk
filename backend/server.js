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
  origin: function (origin, callback) {

    // allow mobile apps / postman
    if (!origin) return callback(null, true);

    const allowed = [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    // allow exact + any Vercel preview URL
    const isAllowed =
      allowed.includes(origin) ||
      origin.endsWith('.vercel.app');

    if (isAllowed) {
      return callback(null, true);
    }

    console.log('❌ Blocked CORS origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },

  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// IMPORTANT for preflight requests
app.options('/*', cors());

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

app.get('/', (req, res) => {
  res.json({ message: "Chiya Chowk API Running" });
});



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


// TEMPORARY - REMOVE AFTER USE
app.get('/seed-full', async (req, res) => {
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

    try { await mongoose.connection.collection('orders').dropIndexes(); } catch(e) {}

    const adminUser = await User.create({ name: 'Admin', username: 'admin', password: 'admin123', role: 'admin', email: 'admin@chiyachowk.com' });
    await User.create({ name: 'Sita Shrestha', username: 'staff', password: 'staff123', role: 'staff' });
    await User.create({ name: 'Ram Bahadur', username: 'cashier1', password: 'cashier123', role: 'cashier' });

    const menuItems = await MenuItem.insertMany([
      { name: 'Black Tea', category: 'Tea', price: 20, emoji: '🫖', description: 'Classic plain black tea', createdBy: adminUser._id },
      { name: 'Milk Tea', category: 'Tea', price: 25, emoji: '🍵', description: 'Smooth milk tea', createdBy: adminUser._id },
      { name: 'Masala Black Tea', category: 'Tea', price: 30, emoji: '🌶️', description: 'Spiced black tea with masala', createdBy: adminUser._id },
      { name: 'Lemon Tea', category: 'Tea', price: 30, emoji: '🍋', description: 'Refreshing lemon tea', createdBy: adminUser._id },
      { name: 'Masala Milk Tea', category: 'Tea', price: 35, emoji: '🫚', description: 'Rich masala milk tea', createdBy: adminUser._id },
      { name: 'Coconut Tea', category: 'Tea', price: 45, emoji: '🥥', description: 'Tea with coconut flavour', createdBy: adminUser._id },
      { name: 'Ginger Tea', category: 'Tea', price: 45, emoji: '🌿', description: 'Fresh ginger infused tea', createdBy: adminUser._id },
      { name: 'Black Coffee', category: 'Coffee', price: 75, emoji: '☕', description: 'Strong black coffee', createdBy: adminUser._id },
      { name: 'Milk Coffee', category: 'Coffee', price: 125, emoji: '🥛', description: 'Coffee with fresh milk', createdBy: adminUser._id },
      { name: 'Cold Coffee with Milk', category: 'Coffee', price: 140, emoji: '🧊', description: 'Iced cold coffee with milk', createdBy: adminUser._id },
      { name: 'Cold Coffee w/o Milk', category: 'Coffee', price: 90, emoji: '🧋', description: 'Iced cold coffee without milk', createdBy: adminUser._id },
      { name: 'Hot Lemon', category: 'Tea Alternatives', price: 80, emoji: '🍋', description: 'Hot lemon drink', createdBy: adminUser._id },
      { name: 'Hot Lemon with Honey', category: 'Tea Alternatives', price: 140, emoji: '🍯', description: 'Hot lemon with honey', createdBy: adminUser._id },
      { name: 'Cold Drinks', category: 'Tea Alternatives', price: 85, emoji: '🥤', description: 'Coke, Fanta or Sprite', createdBy: adminUser._id },
      { name: 'Masala Coke/Sprite', category: 'Tea Alternatives', price: 100, emoji: '🌶️', description: 'Cold drink with masala twist', createdBy: adminUser._id },
      { name: 'Lemonade', category: 'Tea Alternatives', price: 140, emoji: '🍹', description: 'Fresh squeezed lemonade', createdBy: adminUser._id },
      { name: 'Mohito', category: 'Tea Alternatives', price: 160, emoji: '🫙', description: 'Refreshing mocktail mohito', createdBy: adminUser._id },
      { name: 'Plain Lassi', category: 'Lassi', price: 100, emoji: '🥛', description: 'Classic plain yogurt lassi', createdBy: adminUser._id },
      { name: 'Sweet Lassi', category: 'Lassi', price: 120, emoji: '🍬', description: 'Sweet yogurt lassi', createdBy: adminUser._id },
      { name: 'Banana Lassi', category: 'Lassi', price: 140, emoji: '🍌', description: 'Creamy banana lassi', createdBy: adminUser._id },
      { name: 'Mixed Lassi', category: 'Lassi', price: 180, emoji: '🍓', description: 'Mixed fruit lassi', createdBy: adminUser._id },
      { name: 'Hookah Normal', category: 'Hookah', price: 350, emoji: '💨', description: 'Standard hookah session', createdBy: adminUser._id },
      { name: 'Hookah Kaloud', category: 'Hookah', price: 500, emoji: '🔥', description: 'Premium kaloud hookah session', createdBy: adminUser._id },
      { name: 'Coal (extra)', category: 'Hookah', price: 50, emoji: '⬛', description: 'Extra coal for hookah', createdBy: adminUser._id },
      { name: 'Aalu Stick', category: 'Veg Snacks', price: 50, emoji: '🥔', description: 'Crispy potato sticks', createdBy: adminUser._id },
      { name: 'Chiura', category: 'Veg Snacks', price: 50, emoji: '🌾', description: 'Beaten rice snack', createdBy: adminUser._id },
      { name: 'Mushroom Stick', category: 'Veg Snacks', price: 60, emoji: '🍄', description: 'Crispy mushroom sticks', createdBy: adminUser._id },
      { name: 'Wai Wai Sadheko', category: 'Veg Snacks', price: 100, emoji: '🍜', description: 'Spicy Wai Wai noodle salad', createdBy: adminUser._id },
      { name: 'Chatpate', category: 'Veg Snacks', price: 120, emoji: '🌶️', description: 'Tangy spicy street snack', createdBy: adminUser._id },
      { name: 'French Fries', category: 'Veg Snacks', price: 160, emoji: '🍟', description: 'Crispy golden fries', createdBy: adminUser._id },
      { name: 'Mushroom Choila', category: 'Veg Snacks', price: 160, emoji: '🍄', description: 'Spiced mushroom choila', createdBy: adminUser._id },
      { name: 'Pakoda', category: 'Veg Snacks', price: 160, emoji: '🍘', description: 'Mixed veggie pakoda', createdBy: adminUser._id },
      { name: 'Peanuts Sadheko', category: 'Veg Snacks', price: 180, emoji: '🥜', description: 'Spicy seasoned peanuts', createdBy: adminUser._id },
      { name: 'Bhatmas Sadheko', category: 'Veg Snacks', price: 200, emoji: '🫘', description: 'Seasoned soybeans', createdBy: adminUser._id },
      { name: 'Timmure Aalu', category: 'Veg Snacks', price: 200, emoji: '🥔', description: 'Timmure spiced potato', createdBy: adminUser._id },
      { name: 'Chips Chilly', category: 'Veg Snacks', price: 220, emoji: '🌶️', description: 'Crispy chips with chilli', createdBy: adminUser._id },
      { name: 'Paneer Chilly', category: 'Veg Snacks', price: 280, emoji: '🧀', description: 'Paneer tossed in chilli sauce', createdBy: adminUser._id },
      { name: 'Paneer Pakoda', category: 'Veg Snacks', price: 340, emoji: '🧀', description: 'Deep fried paneer pakoda', createdBy: adminUser._id },
      { name: 'Chicken Sausage', category: 'Non-Veg Snacks', price: 60, emoji: '🌭', description: 'Grilled chicken sausage', createdBy: adminUser._id },
      { name: 'Sausage Chilly', category: 'Non-Veg Snacks', price: 180, emoji: '🌶️', description: 'Sausage tossed in chilli sauce', createdBy: adminUser._id },
      { name: 'Anda Chiura', category: 'Non-Veg Snacks', price: 160, emoji: '🥚', description: 'Egg with beaten rice', createdBy: adminUser._id },
      { name: 'Chicken Sadheko', category: 'Non-Veg Snacks', price: 280, emoji: '🍗', description: 'Spiced chicken salad', createdBy: adminUser._id },
      { name: 'Chicken Drumstick', category: 'Non-Veg Snacks', price: 320, emoji: '🍗', description: 'Crispy chicken drumstick', createdBy: adminUser._id },
      { name: 'Timmure Chicken', category: 'Non-Veg Snacks', price: 320, emoji: '🌶️', description: 'Timmure spiced chicken', createdBy: adminUser._id },
      { name: 'Chicken Choila', category: 'Non-Veg Snacks', price: 320, emoji: '🍖', description: 'Spiced grilled chicken choila', createdBy: adminUser._id },
      { name: 'Chicken Chilly (Bone)', category: 'Non-Veg Snacks', price: 320, emoji: '🌶️', description: 'Chicken chilly with bone', createdBy: adminUser._id },
      { name: 'Chicken Chilly (Boneless)', category: 'Non-Veg Snacks', price: 360, emoji: '🌶️', description: 'Chicken chilly boneless', createdBy: adminUser._id },
      { name: 'Hot Wings', category: 'Non-Veg Snacks', price: 380, emoji: '🔥', description: 'Spicy hot chicken wings', createdBy: adminUser._id },
      { name: 'Plain Omelette', category: 'Breakfast', price: 80, emoji: '🍳', description: 'Simple plain omelette', createdBy: adminUser._id },
      { name: 'Masala Omelette', category: 'Breakfast', price: 100, emoji: '🌶️', description: 'Spiced masala omelette', createdBy: adminUser._id },
      { name: 'Bread Omelette', category: 'Breakfast', price: 150, emoji: '🍞', description: 'Omelette with bread', createdBy: adminUser._id },
      { name: 'Boiled Egg (2 pcs)', category: 'Breakfast', price: 90, emoji: '🥚', description: 'Two boiled eggs', createdBy: adminUser._id },
      { name: 'Chana', category: 'Breakfast', price: 60, emoji: '🫘', description: 'Spiced chickpeas', createdBy: adminUser._id },
      { name: 'Aalu', category: 'Breakfast', price: 80, emoji: '🥔', description: 'Spiced potato', createdBy: adminUser._id },
      { name: 'Breakfast Set', category: 'Breakfast', price: 250, emoji: '🍽️', description: 'Bread, aalu, chana, sausage, omelette', createdBy: adminUser._id },
      { name: 'Veg Sandwich', category: 'Sandwich', price: 160, emoji: '🥪', description: 'Fresh veggie sandwich', createdBy: adminUser._id },
      { name: 'Chicken Sandwich', category: 'Sandwich', price: 200, emoji: '🥪', description: 'Grilled chicken sandwich', createdBy: adminUser._id },
      { name: 'Veg Burger', category: 'Burger', price: 160, emoji: '🍔', description: 'Crispy veg burger', createdBy: adminUser._id },
      { name: 'Chicken Burger', category: 'Burger', price: 200, emoji: '🍔', description: 'Juicy chicken burger', createdBy: adminUser._id },
      { name: 'Veg Fried Rice', category: 'Fried Rice', price: 130, emoji: '🍚', description: 'Stir fried veg rice', createdBy: adminUser._id },
      { name: 'Egg Fried Rice', category: 'Fried Rice', price: 150, emoji: '🍳', description: 'Fried rice with egg', createdBy: adminUser._id },
      { name: 'Chicken Fried Rice', category: 'Fried Rice', price: 160, emoji: '🍗', description: 'Fried rice with chicken', createdBy: adminUser._id },
      { name: 'Mixed Fried Rice', category: 'Fried Rice', price: 180, emoji: '🍚', description: 'Fried rice with mixed toppings', createdBy: adminUser._id },
      { name: 'Veg Chowmein', category: 'Chowmein', price: 120, emoji: '🍝', description: 'Stir fried veg noodles', createdBy: adminUser._id },
      { name: 'Egg Chowmein', category: 'Chowmein', price: 140, emoji: '🍳', description: 'Noodles with egg', createdBy: adminUser._id },
      { name: 'Chicken Chowmein', category: 'Chowmein', price: 160, emoji: '🍗', description: 'Noodles with chicken', createdBy: adminUser._id },
      { name: 'Mixed Chowmein', category: 'Chowmein', price: 180, emoji: '🍜', description: 'Mixed topping chowmein', createdBy: adminUser._id },
      { name: 'Veg Steam Momo', category: 'Momo', price: 140, emoji: '🥟', description: 'Steamed veg dumplings', createdBy: adminUser._id },
      { name: 'Veg Fried Momo', category: 'Momo', price: 160, emoji: '🥟', description: 'Fried veg dumplings', createdBy: adminUser._id },
      { name: 'Veg Chilly Momo', category: 'Momo', price: 170, emoji: '🌶️', description: 'Veg momo tossed in chilli sauce', createdBy: adminUser._id },
      { name: 'Veg Jhol Momo', category: 'Momo', price: 170, emoji: '🍲', description: 'Veg momo in jhol soup', createdBy: adminUser._id },
      { name: 'Chicken Steam Momo', category: 'Momo', price: 160, emoji: '🥟', description: 'Steamed chicken dumplings', createdBy: adminUser._id },
      { name: 'Chicken Fried Momo', category: 'Momo', price: 180, emoji: '🥟', description: 'Fried chicken dumplings', createdBy: adminUser._id },
      { name: 'Chicken Chilly Momo', category: 'Momo', price: 190, emoji: '🌶️', description: 'Chicken momo in chilli sauce', createdBy: adminUser._id },
      { name: 'Chicken Jhol Momo', category: 'Momo', price: 190, emoji: '🍲', description: 'Chicken momo in jhol soup', createdBy: adminUser._id },
    ]);

    await Table.insertMany([
      ...Array.from({ length: 4 }, (_, i) => ({ number: i + 1, seats: 2, location: 'indoor' })),
      ...Array.from({ length: 5 }, (_, i) => ({ number: i + 5, seats: 4, location: 'indoor' })),
      { number: 10, seats: 4, location: 'outdoor' },
      { number: 11, seats: 6, location: 'outdoor' },
      { number: 12, seats: 6, location: 'vip' },
    ]);

    await Settings.create({
      cafeName: 'Chiya Chowk',
      address: 'Thamel, Kathmandu, Nepal',
      phone: '+977-01-4412345',
      email: 'info@chiyachowk.com',
      serviceChargeRate: 10,
      receiptFooter: 'Thank you for visiting Chiya Chowk!',
    });

    res.json({
      success: true,
      message: '✅ Full database seeded!',
      data: {
        users: 3,
        menuItems: menuItems.length,
        tables: 12,
      },
      login: { username: 'admin', password: 'admin123' },
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
