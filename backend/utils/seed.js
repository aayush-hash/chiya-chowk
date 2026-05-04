require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const Settings = require('../models/Settings');
const Order = require('../models/Order');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🌱 Connected to MongoDB for seeding...');

    // Clear existing data
    await Promise.all([
      User.deleteMany(),
      MenuItem.deleteMany(),
      Table.deleteMany(),
      Settings.deleteMany(),
      Order.deleteMany(),
    ]);

    await mongoose.connection.collection('orders').dropIndexes();
    console.log('🗑️  Cleared existing data');

    // Create users
    const adminUser = await User.create({
      name: 'Admin',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      email: 'admin@chiyachowk.com',
    });
    await User.create({ name: 'Sita Shrestha', username: 'staff', password: 'staff123', role: 'staff' });
    await User.create({ name: 'Ram Bahadur', username: 'cashier1', password: 'cashier123', role: 'cashier' });
    console.log('👥 Users created');

    // ===== REAL MENU from actual cafe menu PDF =====
    const menuItems = await MenuItem.insertMany([

      // ── TEA ──
      { name: 'Black Tea',          category: 'Tea', price: 20,  emoji: '🫖', description: 'Classic plain black tea',                    createdBy: adminUser._id },
      { name: 'Milk Tea',           category: 'Tea', price: 25,  emoji: '🍵', description: 'Smooth milk tea',                            createdBy: adminUser._id },
      { name: 'Masala Black Tea',   category: 'Tea', price: 30,  emoji: '🌶️', description: 'Spiced black tea with masala',               createdBy: adminUser._id },
      { name: 'Lemon Tea',          category: 'Tea', price: 30,  emoji: '🍋', description: 'Refreshing lemon tea',                       createdBy: adminUser._id },
      { name: 'Masala Milk Tea',    category: 'Tea', price: 35,  emoji: '🫚', description: 'Rich masala milk tea',                       createdBy: adminUser._id },
      { name: 'Coconut Tea',        category: 'Tea', price: 45,  emoji: '🥥', description: 'Tea with coconut flavour',                   createdBy: adminUser._id },
      { name: 'Ginger Tea',         category: 'Tea', price: 45,  emoji: '🌿', description: 'Fresh ginger infused tea',                   createdBy: adminUser._id },

      // ── COFFEE ──
      { name: 'Black Coffee',       category: 'Coffee', price: 75,  emoji: '☕', description: 'Strong black coffee',                     createdBy: adminUser._id },
      { name: 'Milk Coffee',        category: 'Coffee', price: 125, emoji: '🥛', description: 'Coffee with fresh milk',                  createdBy: adminUser._id },
      { name: 'Cold Coffee with Milk',   category: 'Coffee', price: 140, emoji: '🧊', description: 'Iced cold coffee with milk',         createdBy: adminUser._id },
      { name: 'Cold Coffee w/o Milk',    category: 'Coffee', price: 90,  emoji: '🧋', description: 'Iced cold coffee without milk',      createdBy: adminUser._id },

      // ── TEA ALTERNATIVES ──
      { name: 'Hot Lemon',          category: 'Tea Alternatives', price: 80,  emoji: '🍋', description: 'Hot lemon drink',               createdBy: adminUser._id },
      { name: 'Hot Lemon with Honey', category: 'Tea Alternatives', price: 140, emoji: '🍯', description: 'Hot lemon with honey',        createdBy: adminUser._id },
      { name: 'Cold Drinks',        category: 'Tea Alternatives', price: 85,  emoji: '🥤', description: 'Coke, Fanta or Sprite',         createdBy: adminUser._id },
      { name: 'Masala Coke/Sprite', category: 'Tea Alternatives', price: 100, emoji: '🌶️', description: 'Cold drink with masala twist',  createdBy: adminUser._id },
      { name: 'Lemonade',           category: 'Tea Alternatives', price: 140, emoji: '🍹', description: 'Fresh squeezed lemonade',       createdBy: adminUser._id },
      { name: 'Mohito',             category: 'Tea Alternatives', price: 160, emoji: '🫙', description: 'Refreshing mocktail mohito',    createdBy: adminUser._id },

      // ── LASSI ──
      { name: 'Plain Lassi',        category: 'Lassi', price: 100, emoji: '🥛', description: 'Classic plain yogurt lassi',              createdBy: adminUser._id },
      { name: 'Sweet Lassi',        category: 'Lassi', price: 120, emoji: '🍬', description: 'Sweet yogurt lassi',                      createdBy: adminUser._id },
      { name: 'Banana Lassi',       category: 'Lassi', price: 140, emoji: '🍌', description: 'Creamy banana lassi',                     createdBy: adminUser._id },
      { name: 'Mixed Lassi',        category: 'Lassi', price: 180, emoji: '🍓', description: 'Mixed fruit lassi',                       createdBy: adminUser._id },

      // ── HOOKAH ──
      { name: 'Hookah Normal',      category: 'Hookah', price: 350, emoji: '💨', description: 'Standard hookah session',                createdBy: adminUser._id },
      { name: 'Hookah Kaloud',      category: 'Hookah', price: 500, emoji: '🔥', description: 'Premium kaloud hookah session',          createdBy: adminUser._id },
      { name: 'Coal (extra)',       category: 'Hookah', price: 50,  emoji: '⬛', description: 'Extra coal for hookah',                  createdBy: adminUser._id },

      // ── VEG SNACKS ──
      { name: 'Aalu Stick',         category: 'Veg Snacks', price: 50,  emoji: '🥔', description: 'Crispy potato sticks',               createdBy: adminUser._id },
      { name: 'Chiura',             category: 'Veg Snacks', price: 50,  emoji: '🌾', description: 'Beaten rice snack',                  createdBy: adminUser._id },
      { name: 'Mushroom Stick',     category: 'Veg Snacks', price: 60,  emoji: '🍄', description: 'Crispy mushroom sticks',             createdBy: adminUser._id },
      { name: 'Wai Wai Sadheko',    category: 'Veg Snacks', price: 100, emoji: '🍜', description: 'Spicy Wai Wai noodle salad',         createdBy: adminUser._id },
      { name: 'Chatpate',           category: 'Veg Snacks', price: 120, emoji: '🌶️', description: 'Tangy spicy street snack',           createdBy: adminUser._id },
      { name: 'French Fries',       category: 'Veg Snacks', price: 160, emoji: '🍟', description: 'Crispy golden fries',                createdBy: adminUser._id },
      { name: 'Mushroom Choila',    category: 'Veg Snacks', price: 160, emoji: '🍄', description: 'Spiced mushroom choila',             createdBy: adminUser._id },
      { name: 'Pakoda',             category: 'Veg Snacks', price: 160, emoji: '🍘', description: 'Mixed veggie pakoda',                createdBy: adminUser._id },
      { name: 'Peanuts Sadheko',    category: 'Veg Snacks', price: 180, emoji: '🥜', description: 'Spicy seasoned peanuts',             createdBy: adminUser._id },
      { name: 'Bhatmas Sadheko',    category: 'Veg Snacks', price: 200, emoji: '🫘', description: 'Seasoned soybeans',                  createdBy: adminUser._id },
      { name: 'Timmure Aalu',       category: 'Veg Snacks', price: 200, emoji: '🥔', description: 'Timmure spiced potato',              createdBy: adminUser._id },
      { name: 'Chips Chilly',       category: 'Veg Snacks', price: 220, emoji: '🌶️', description: 'Crispy chips with chilli',           createdBy: adminUser._id },
      { name: 'Paneer Chilly',      category: 'Veg Snacks', price: 280, emoji: '🧀', description: 'Paneer tossed in chilli sauce',      createdBy: adminUser._id },
      { name: 'Paneer Pakoda',      category: 'Veg Snacks', price: 340, emoji: '🧀', description: 'Deep fried paneer pakoda',           createdBy: adminUser._id },

      // ── NON VEG SNACKS ──
      { name: 'Chicken Sausage',    category: 'Non-Veg Snacks', price: 60,  emoji: '🌭', description: 'Grilled chicken sausage',        createdBy: adminUser._id },
      { name: 'Sausage Chilly',     category: 'Non-Veg Snacks', price: 180, emoji: '🌶️', description: 'Sausage tossed in chilli sauce', createdBy: adminUser._id },
      { name: 'Anda Chiura',        category: 'Non-Veg Snacks', price: 160, emoji: '🥚', description: 'Egg with beaten rice',           createdBy: adminUser._id },
      { name: 'Chicken Sadheko',    category: 'Non-Veg Snacks', price: 280, emoji: '🍗', description: 'Spiced chicken salad',           createdBy: adminUser._id },
      { name: 'Chicken Drumstick',  category: 'Non-Veg Snacks', price: 320, emoji: '🍗', description: 'Crispy chicken drumstick',       createdBy: adminUser._id },
      { name: 'Timmure Chicken',    category: 'Non-Veg Snacks', price: 320, emoji: '🌶️', description: 'Timmure spiced chicken',         createdBy: adminUser._id },
      { name: 'Chicken Choila',     category: 'Non-Veg Snacks', price: 320, emoji: '🍖', description: 'Spiced grilled chicken choila',  createdBy: adminUser._id },
      { name: 'Chicken Chilly (Bone)', category: 'Non-Veg Snacks', price: 320, emoji: '🌶️', description: 'Chicken chilly with bone',   createdBy: adminUser._id },
      { name: 'Chicken Chilly (Boneless)', category: 'Non-Veg Snacks', price: 360, emoji: '🌶️', description: 'Chicken chilly boneless', createdBy: adminUser._id },
      { name: 'Hot Wings',          category: 'Non-Veg Snacks', price: 380, emoji: '🔥', description: 'Spicy hot chicken wings',        createdBy: adminUser._id },

      // ── BREAKFAST ──
      { name: 'Plain Omelette',     category: 'Breakfast', price: 80,  emoji: '🍳', description: 'Simple plain omelette',              createdBy: adminUser._id },
      { name: 'Masala Omelette',    category: 'Breakfast', price: 100, emoji: '🌶️', description: 'Spiced masala omelette',             createdBy: adminUser._id },
      { name: 'Bread Omelette',     category: 'Breakfast', price: 150, emoji: '🍞', description: 'Omelette with bread',                createdBy: adminUser._id },
      { name: 'Boiled Egg (2 pcs)', category: 'Breakfast', price: 90,  emoji: '🥚', description: 'Two boiled eggs',                    createdBy: adminUser._id },
      { name: 'Chana',              category: 'Breakfast', price: 60,  emoji: '🫘', description: 'Spiced chickpeas',                   createdBy: adminUser._id },
      { name: 'Aalu',               category: 'Breakfast', price: 80,  emoji: '🥔', description: 'Spiced potato',                     createdBy: adminUser._id },
      { name: 'Breakfast Set',      category: 'Breakfast', price: 250, emoji: '🍽️', description: 'Bread, aalu, chana, sausage, omelette', createdBy: adminUser._id },

      // ── SANDWICH ──
      { name: 'Veg Sandwich',       category: 'Sandwich', price: 160, emoji: '🥪', description: 'Fresh veggie sandwich',               createdBy: adminUser._id },
      { name: 'Chicken Sandwich',   category: 'Sandwich', price: 200, emoji: '🥪', description: 'Grilled chicken sandwich',            createdBy: adminUser._id },

      // ── BURGER ──
      { name: 'Veg Burger',         category: 'Burger', price: 160, emoji: '🍔', description: 'Crispy veg burger',                    createdBy: adminUser._id },
      { name: 'Chicken Burger',     category: 'Burger', price: 200, emoji: '🍔', description: 'Juicy chicken burger',                  createdBy: adminUser._id },

      // ── FRIED RICE ──
      { name: 'Veg Fried Rice',     category: 'Fried Rice', price: 130, emoji: '🍚', description: 'Stir fried veg rice',              createdBy: adminUser._id },
      { name: 'Egg Fried Rice',     category: 'Fried Rice', price: 150, emoji: '🍳', description: 'Fried rice with egg',              createdBy: adminUser._id },
      { name: 'Chicken Fried Rice', category: 'Fried Rice', price: 160, emoji: '🍗', description: 'Fried rice with chicken',          createdBy: adminUser._id },
      { name: 'Mixed Fried Rice',   category: 'Fried Rice', price: 180, emoji: '🍚', description: 'Fried rice with mixed toppings',   createdBy: adminUser._id },

      // ── CHOWMEIN ──
      { name: 'Veg Chowmein',       category: 'Chowmein', price: 120, emoji: '🍝', description: 'Stir fried veg noodles',             createdBy: adminUser._id },
      { name: 'Egg Chowmein',       category: 'Chowmein', price: 140, emoji: '🍳', description: 'Noodles with egg',                   createdBy: adminUser._id },
      { name: 'Chicken Chowmein',   category: 'Chowmein', price: 160, emoji: '🍗', description: 'Noodles with chicken',               createdBy: adminUser._id },
      { name: 'Mixed Chowmein',     category: 'Chowmein', price: 180, emoji: '🍜', description: 'Mixed topping chowmein',             createdBy: adminUser._id },

      // ── MOMO ──
      { name: 'Veg Steam Momo',     category: 'Momo', price: 140, emoji: '🥟', description: 'Steamed veg dumplings',                  createdBy: adminUser._id },
      { name: 'Veg Fried Momo',     category: 'Momo', price: 160, emoji: '🥟', description: 'Fried veg dumplings',                   createdBy: adminUser._id },
      { name: 'Veg Chilly Momo',    category: 'Momo', price: 170, emoji: '🌶️', description: 'Veg momo tossed in chilli sauce',       createdBy: adminUser._id },
      { name: 'Veg Jhol Momo',      category: 'Momo', price: 170, emoji: '🍲', description: 'Veg momo in jhol soup',                  createdBy: adminUser._id },
      { name: 'Chicken Steam Momo', category: 'Momo', price: 160, emoji: '🥟', description: 'Steamed chicken dumplings',              createdBy: adminUser._id },
      { name: 'Chicken Fried Momo', category: 'Momo', price: 180, emoji: '🥟', description: 'Fried chicken dumplings',               createdBy: adminUser._id },
      { name: 'Chicken Chilly Momo',category: 'Momo', price: 190, emoji: '🌶️', description: 'Chicken momo in chilli sauce',          createdBy: adminUser._id },
      { name: 'Chicken Jhol Momo',  category: 'Momo', price: 190, emoji: '🍲', description: 'Chicken momo in jhol soup',              createdBy: adminUser._id },
    ]);
    console.log(`🍽️  ${menuItems.length} menu items created from real menu`);

    // Create tables
    const tableDefs = [
      ...Array.from({ length: 4 }, (_, i) => ({ number: i + 1, seats: 2, location: 'indoor' })),
      ...Array.from({ length: 5 }, (_, i) => ({ number: i + 5, seats: 4, location: 'indoor' })),
      { number: 10, seats: 4, location: 'outdoor' },
      { number: 11, seats: 6, location: 'outdoor' },
      { number: 12, seats: 6, location: 'vip' },
    ];
    await Table.insertMany(tableDefs);
    console.log('🪑 12 Tables created');

    // Create settings
    await Settings.create({
      cafeName: 'Chiya Chowk',
      address: 'Thamel, Kathmandu, Nepal',
      phone: '+977-01-4412345',
      email: 'info@chiyachowk.com',
      // vatRate: 13,
      serviceChargeRate: 10,
      receiptFooter: 'Thank you for visiting Chiya Chowk! चिया पिउनु भयो, मुस्कान ल्याउनु भयो 😊',
    });
    console.log('⚙️  Settings created');

    // Seed some sample orders (last 7 days)
    const tables = await Table.find();
    const now = new Date();
    const sampleOrders = [];

    for (let i = 0; i < 30; i++) {
      const orderTime = new Date(now - Math.random() * 7 * 86400000);
      const orderItems = [];
      const count = Math.floor(Math.random() * 4) + 1;
      let subtotal = 0;

      for (let j = 0; j < count; j++) {
        const mi = menuItems[Math.floor(Math.random() * menuItems.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        const itemSub = mi.price * qty;
        subtotal += itemSub;
        orderItems.push({
          menuItem: mi._id,
          name: mi.name,
          emoji: mi.emoji,
          category: mi.category,
          price: mi.price,
          qty,
          subtotal: itemSub,
        });
      }

      const taxAmount = Math.round(subtotal * 0.13);
      const total = subtotal + taxAmount;
      const isPaid = Math.random() > 0.2;
      const method = Math.random() > 0.4 ? 'cash' : 'qr';

      sampleOrders.push({
        orderId: `ORD-${String(i + 1001).padStart(4, '0')}`,
        table: tables[Math.floor(Math.random() * tables.length)]._id,
        tableNumber: Math.floor(Math.random() * 12) + 1,
        orderType: 'dine-in',
        items: orderItems,
        subtotal,
        discount: 0,
        taxRate: 13,
        taxAmount,
        serviceCharge: 0,
        total,
        paymentMethod: isPaid ? method : 'pending',
        paymentStatus: isPaid ? 'paid' : 'unpaid',
        orderStatus: isPaid ? 'completed' : 'pending',
        cashier: adminUser._id,
        cashierName: adminUser.name,
        paidAt: isPaid ? orderTime : null,
        createdAt: orderTime,
        updatedAt: orderTime,
      });
    }

    await Order.insertMany(sampleOrders, { timestamps: false });
    console.log('📋 30 Sample orders seeded');

    console.log('\n✅ Database seeded successfully!');
    console.log('\n🔐 Login credentials:');
    console.log('   Admin:    admin / admin123');
    console.log('   Staff:    staff / staff123');
    console.log('   Cashier:  cashier1 / cashier123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seed();