require('dotenv').config();
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

    // Drop all indexes on orders to avoid stale unique constraints
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

    // Create menu items
    const menuItems = await MenuItem.insertMany([
      { name: 'Masala Chiya', category: 'Tea', price: 60, emoji: '🍵', description: 'Spiced milk tea with cardamom', createdBy: adminUser._id },
      { name: 'Ginger Chiya', category: 'Tea', price: 55, emoji: '🫚', description: 'Fresh ginger tea', createdBy: adminUser._id },
      { name: 'Lemon Tea', category: 'Tea', price: 50, emoji: '🍋', description: 'Fresh lemon tea', createdBy: adminUser._id },
      { name: 'Black Tea', category: 'Tea', price: 40, emoji: '🫖', description: 'Plain black tea', createdBy: adminUser._id },
      { name: 'Green Tea', category: 'Tea', price: 70, emoji: '🌿', description: 'Organic green tea', createdBy: adminUser._id },
      { name: 'Cardamom Tea', category: 'Tea', price: 65, emoji: '🌸', description: 'Cardamom infused tea', createdBy: adminUser._id },
      { name: 'Black Coffee', category: 'Coffee', price: 100, emoji: '☕', description: 'Strong black coffee', createdBy: adminUser._id },
      { name: 'Cappuccino', category: 'Coffee', price: 180, emoji: '🥛', description: 'Espresso with milk foam', createdBy: adminUser._id },
      { name: 'Americano', category: 'Coffee', price: 120, emoji: '🫗', description: 'Diluted espresso', createdBy: adminUser._id },
      { name: 'Cold Coffee', category: 'Coffee', price: 200, emoji: '🧊', description: 'Iced coffee blend', createdBy: adminUser._id },
      { name: 'Samosa', category: 'Snacks', price: 30, emoji: '🥟', description: 'Crispy fried samosa', createdBy: adminUser._id },
      { name: 'Momo', category: 'Snacks', price: 150, emoji: '🥘', description: 'Steamed dumplings', createdBy: adminUser._id },
      { name: 'Bread Toast', category: 'Snacks', price: 80, emoji: '🍞', description: 'Toasted bread with butter', createdBy: adminUser._id },
      { name: 'Pakoda', category: 'Snacks', price: 120, emoji: '🍳', description: 'Mixed veggie pakoda', createdBy: adminUser._id },
      { name: 'Noodles', category: 'Food', price: 180, emoji: '🍜', description: 'Wai wai noodles', createdBy: adminUser._id },
      { name: 'Chowmein', category: 'Food', price: 200, emoji: '🍝', description: 'Stir fried noodles', createdBy: adminUser._id },
      { name: 'Fried Rice', category: 'Food', price: 220, emoji: '🍚', description: 'Veg fried rice', createdBy: adminUser._id },
      { name: 'Lassi', category: 'Drinks', price: 100, emoji: '🥛', description: 'Sweet yogurt drink', createdBy: adminUser._id },
      { name: 'Cold Drink', category: 'Drinks', price: 80, emoji: '🥤', description: 'Soft drink can', createdBy: adminUser._id },
      { name: 'Juice', category: 'Drinks', price: 120, emoji: '🧃', description: 'Fresh fruit juice', createdBy: adminUser._id },
      { name: 'Cake Slice', category: 'Desserts', price: 150, emoji: '🎂', description: 'Chocolate cake slice', createdBy: adminUser._id },
      { name: 'Cookies', category: 'Desserts', price: 80, emoji: '🍪', description: 'Assorted cookies', createdBy: adminUser._id },
    ]);
    console.log(`🍽️  ${menuItems.length} Menu items created`);

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
      vatRate: 13,
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