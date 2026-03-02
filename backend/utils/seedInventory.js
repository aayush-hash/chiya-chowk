// ============================================================
// ADD THIS TO backend/utils/seed.js inside the seed() function
// after the menu items are created, before process.exit(0)
// ============================================================

// Paste this block after "console.log('30 Sample orders seeded')"

/*
  // Create inventory items
  const Inventory = require('../models/Inventory');
  await Inventory.deleteMany();

  const teaItem = menuItems.find(m => m.name === 'Masala Chiya');
  const coffeeItem = menuItems.find(m => m.name === 'Black Coffee');
  const momoItem = menuItems.find(m => m.name === 'Momo');
  const samosaItem = menuItems.find(m => m.name === 'Samosa');

  await Inventory.insertMany([
    {
      name: 'Milk',
      category: 'Dairy',
      unit: 'liters',
      currentStock: 20,
      lowStockThreshold: 5,
      costPerUnit: 90,
      supplier: 'Local Dairy',
      notes: 'Full-fat fresh milk',
      createdBy: adminUser._id,
      lastRestockedAt: new Date(),
      usageResetDate: new Date().toISOString().slice(0, 10),
      totalUsedToday: 2.5,
      totalUsedThisMonth: 45,
      usedInMenuItems: [
        { menuItem: teaItem._id, menuItemName: teaItem.name, quantityPerServing: 0.15 },
        { menuItem: coffeeItem._id, menuItemName: coffeeItem.name, quantityPerServing: 0.1 },
      ],
      restockHistory: [{ quantity: 20, addedBy: adminUser._id, addedByName: 'Admin', costPerUnit: 90, totalCost: 1800, note: 'Initial stock' }],
    },
    {
      name: 'Tea Leaves (CTC)',
      category: 'Tea & Coffee',
      unit: 'kg',
      currentStock: 3.5,
      lowStockThreshold: 1,
      costPerUnit: 600,
      supplier: 'Ilam Tea Co.',
      notes: 'Premium CTC tea from Ilam',
      createdBy: adminUser._id,
      lastRestockedAt: new Date(),
      usageResetDate: new Date().toISOString().slice(0, 10),
      totalUsedToday: 0.08,
      totalUsedThisMonth: 1.2,
      usedInMenuItems: [
        { menuItem: teaItem._id, menuItemName: teaItem.name, quantityPerServing: 0.005 },
      ],
      restockHistory: [{ quantity: 3.5, addedBy: adminUser._id, addedByName: 'Admin', costPerUnit: 600, totalCost: 2100, note: 'Initial stock' }],
    },
    {
      name: 'Sugar',
      category: 'Spices',
      unit: 'kg',
      currentStock: 8,
      lowStockThreshold: 2,
      costPerUnit: 80,
      supplier: 'Local Market',
      createdBy: adminUser._id,
      lastRestockedAt: new Date(),
      usageResetDate: new Date().toISOString().slice(0, 10),
      totalUsedToday: 0.3,
      totalUsedThisMonth: 5.5,
      restockHistory: [{ quantity: 8, addedBy: adminUser._id, addedByName: 'Admin', costPerUnit: 80, totalCost: 640, note: 'Initial stock' }],
    },
    {
      name: 'Coffee Beans',
      category: 'Tea & Coffee',
      unit: 'kg',
      currentStock: 2,
      lowStockThreshold: 0.5,
      costPerUnit: 1200,
      supplier: 'Nepal Coffee Co.',
      createdBy: adminUser._id,
      lastRestockedAt: new Date(),
      usageResetDate: new Date().toISOString().slice(0, 10),
      totalUsedToday: 0.05,
      totalUsedThisMonth: 0.8,
      usedInMenuItems: [
        { menuItem: coffeeItem._id, menuItemName: coffeeItem.name, quantityPerServing: 0.015 },
      ],
      restockHistory: [{ quantity: 2, addedBy: adminUser._id, addedByName: 'Admin', costPerUnit: 1200, totalCost: 2400, note: 'Initial stock' }],
    },
    {
      name: 'Cardamom',
      category: 'Spices',
      unit: 'g',
      currentStock: 400,
      lowStockThreshold: 100,
      costPerUnit: 2,
      supplier: 'Spice Market',
      createdBy: adminUser._id,
      lastRestockedAt: new Date(),
      usageResetDate: new Date().toISOString().slice(0, 10),
      totalUsedToday: 15,
      totalUsedThisMonth: 220,
      usedInMenuItems: [
        { menuItem: teaItem._id, menuItemName: teaItem.name, quantityPerServing: 1 },
      ],
      restockHistory: [{ quantity: 400, addedBy: adminUser._id, addedByName: 'Admin', costPerUnit: 2, totalCost: 800, note: 'Initial stock' }],
    },
    {
      name: 'Maida (All-purpose flour)',
      category: 'Flour & Grains',
      unit: 'kg',
      currentStock: 10,
      lowStockThreshold: 3,
      costPerUnit: 55,
      supplier: 'Local Market',
      createdBy: adminUser._id,
      lastRestockedAt: new Date(),
      usageResetDate: new Date().toISOString().slice(0, 10),
      totalUsedToday: 0.5,
      totalUsedThisMonth: 8,
      usedInMenuItems: [
        { menuItem: samosaItem._id, menuItemName: samosaItem.name, quantityPerServing: 0.05 },
      ],
      restockHistory: [{ quantity: 10, addedBy: adminUser._id, addedByName: 'Admin', costPerUnit: 55, totalCost: 550, note: 'Initial stock' }],
    },
    {
      name: 'Mineral Water Bottles',
      category: 'Beverages',
      unit: 'pieces',
      currentStock: 4,       // intentionally low to trigger alert
      lowStockThreshold: 12,
      costPerUnit: 25,
      supplier: 'Himalayan Springs',
      createdBy: adminUser._id,
      lastRestockedAt: new Date(),
      usageResetDate: new Date().toISOString().slice(0, 10),
      totalUsedToday: 8,
      totalUsedThisMonth: 90,
      restockHistory: [{ quantity: 48, addedBy: adminUser._id, addedByName: 'Admin', costPerUnit: 25, totalCost: 1200, note: 'Initial stock' }],
    },
    {
      name: 'Disposable Cups',
      category: 'Packaging',
      unit: 'pieces',
      currentStock: 0,       // intentionally out of stock
      lowStockThreshold: 50,
      costPerUnit: 3,
      supplier: 'Packaging Supplier',
      createdBy: adminUser._id,
      lastRestockedAt: new Date(),
      usageResetDate: new Date().toISOString().slice(0, 10),
      totalUsedToday: 15,
      totalUsedThisMonth: 180,
      restockHistory: [{ quantity: 200, addedBy: adminUser._id, addedByName: 'Admin', costPerUnit: 3, totalCost: 600, note: 'Initial stock' }],
    },
  ]);
  console.log('📦 Inventory items seeded');
*/

// ============================================================
// STANDALONE INVENTORY SEED SCRIPT
// Run with: node backend/utils/seedInventory.js
// ============================================================
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');

const seedInventory = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🌱 Connected for inventory seeding...');

    const admin = await User.findOne({ username: 'admin' });
    if (!admin) { console.error('❌ Run main seed first: npm run seed'); process.exit(1); }

    const findMenu = async (name) => await MenuItem.findOne({ name }).lean();

    const masalaChiya = await findMenu('Masala Chiya');
    const blackCoffee = await findMenu('Black Coffee');
    const momo = await findMenu('Momo');
    const samosa = await findMenu('Samosa');
    const cappuccino = await findMenu('Cappuccino');
    const lassi = await findMenu('Lassi');

    await Inventory.deleteMany({});

    await Inventory.insertMany([
      {
        name: 'Milk',
        category: 'Dairy',
        unit: 'liters',
        currentStock: 20,
        lowStockThreshold: 5,
        costPerUnit: 90,
        supplier: 'Local Dairy',
        notes: 'Full-fat fresh milk',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 2.5,
        totalUsedThisMonth: 45,
        usedInMenuItems: [
          ...(masalaChiya ? [{ menuItem: masalaChiya._id, menuItemName: masalaChiya.name, quantityPerServing: 0.15 }] : []),
          ...(blackCoffee ? [{ menuItem: blackCoffee._id, menuItemName: blackCoffee.name, quantityPerServing: 0.1 }] : []),
          ...(cappuccino ? [{ menuItem: cappuccino._id, menuItemName: cappuccino.name, quantityPerServing: 0.2 }] : []),
          ...(lassi ? [{ menuItem: lassi._id, menuItemName: lassi.name, quantityPerServing: 0.25 }] : []),
        ],
        restockHistory: [{ quantity: 20, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 90, totalCost: 1800, note: 'Initial stock' }],
      },
      {
        name: 'Tea Leaves (CTC)',
        category: 'Tea & Coffee',
        unit: 'kg',
        currentStock: 3.5,
        lowStockThreshold: 1,
        costPerUnit: 600,
        supplier: 'Ilam Tea Co.',
        notes: 'Premium CTC tea from Ilam',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 0.08,
        totalUsedThisMonth: 1.2,
        usedInMenuItems: masalaChiya ? [{ menuItem: masalaChiya._id, menuItemName: masalaChiya.name, quantityPerServing: 0.005 }] : [],
        restockHistory: [{ quantity: 3.5, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 600, totalCost: 2100, note: 'Initial stock' }],
      },
      {
        name: 'Sugar',
        category: 'Spices',
        unit: 'kg',
        currentStock: 8,
        lowStockThreshold: 2,
        costPerUnit: 80,
        supplier: 'Local Market',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 0.3,
        totalUsedThisMonth: 5.5,
        restockHistory: [{ quantity: 8, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 80, totalCost: 640, note: 'Initial stock' }],
      },
      {
        name: 'Coffee Beans',
        category: 'Tea & Coffee',
        unit: 'kg',
        currentStock: 2,
        lowStockThreshold: 0.5,
        costPerUnit: 1200,
        supplier: 'Nepal Coffee Co.',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 0.05,
        totalUsedThisMonth: 0.8,
        usedInMenuItems: blackCoffee ? [{ menuItem: blackCoffee._id, menuItemName: blackCoffee.name, quantityPerServing: 0.015 }] : [],
        restockHistory: [{ quantity: 2, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 1200, totalCost: 2400, note: 'Initial stock' }],
      },
      {
        name: 'Cardamom',
        category: 'Spices',
        unit: 'g',
        currentStock: 400,
        lowStockThreshold: 100,
        costPerUnit: 2,
        supplier: 'Spice Market',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 15,
        totalUsedThisMonth: 220,
        usedInMenuItems: masalaChiya ? [{ menuItem: masalaChiya._id, menuItemName: masalaChiya.name, quantityPerServing: 1 }] : [],
        restockHistory: [{ quantity: 400, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 2, totalCost: 800, note: 'Initial stock' }],
      },
      {
        name: 'Maida (All-purpose flour)',
        category: 'Flour & Grains',
        unit: 'kg',
        currentStock: 10,
        lowStockThreshold: 3,
        costPerUnit: 55,
        supplier: 'Local Market',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 0.5,
        totalUsedThisMonth: 8,
        usedInMenuItems: samosa ? [{ menuItem: samosa._id, menuItemName: samosa.name, quantityPerServing: 0.05 }] : [],
        restockHistory: [{ quantity: 10, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 55, totalCost: 550, note: 'Initial stock' }],
      },
      {
        name: 'Mineral Water Bottles',
        category: 'Beverages',
        unit: 'pieces',
        currentStock: 4,
        lowStockThreshold: 12,
        costPerUnit: 25,
        supplier: 'Himalayan Springs',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 8,
        totalUsedThisMonth: 90,
        restockHistory: [{ quantity: 48, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 25, totalCost: 1200, note: 'Initial stock' }],
      },
      {
        name: 'Disposable Cups',
        category: 'Packaging',
        unit: 'pieces',
        currentStock: 0,
        lowStockThreshold: 50,
        costPerUnit: 3,
        supplier: 'Packaging Supplier',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 15,
        totalUsedThisMonth: 180,
        restockHistory: [{ quantity: 200, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 3, totalCost: 600, note: 'Initial stock' }],
      },
      {
        name: 'Ginger',
        category: 'Spices',
        unit: 'kg',
        currentStock: 1.5,
        lowStockThreshold: 0.5,
        costPerUnit: 120,
        supplier: 'Local Market',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 0.1,
        totalUsedThisMonth: 1.8,
        restockHistory: [{ quantity: 1.5, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 120, totalCost: 180, note: 'Initial stock' }],
      },
      {
        name: 'Cooking Oil',
        category: 'Other',
        unit: 'liters',
        currentStock: 5,
        lowStockThreshold: 1,
        costPerUnit: 250,
        supplier: 'Local Market',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 0.2,
        totalUsedThisMonth: 3,
        usedInMenuItems: samosa ? [{ menuItem: samosa._id, menuItemName: samosa.name, quantityPerServing: 0.05 }] : [],
        restockHistory: [{ quantity: 5, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 250, totalCost: 1250, note: 'Initial stock' }],
      },
    ]);

    console.log('📦 10 Inventory items seeded');
    console.log('✅ Inventory seeding complete!');
    console.log('\nNote: "Mineral Water Bottles" and "Disposable Cups" are intentionally low/out of stock to demonstrate alerts\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Inventory seed error:', err.message);
    process.exit(1);
  }
};

seedInventory();