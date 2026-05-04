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

    // Look up real menu items
    const milkTea         = await findMenu('Milk Tea');
    const masalaMilkTea   = await findMenu('Masala Milk Tea');
    const masalaBlackTea  = await findMenu('Masala Black Tea');
    const gingerTea       = await findMenu('Ginger Tea');
    const coconutTea      = await findMenu('Coconut Tea');
    const blackCoffee     = await findMenu('Black Coffee');
    const milkCoffee      = await findMenu('Milk Coffee');
    const coldCoffeeM     = await findMenu('Cold Coffee with Milk');
    const plainLassi      = await findMenu('Plain Lassi');
    const sweetLassi      = await findMenu('Sweet Lassi');
    const bananaLassi     = await findMenu('Banana Lassi');
    const mixedLassi      = await findMenu('Mixed Lassi');
    const pakoda          = await findMenu('Pakoda');
    const paneerPakoda    = await findMenu('Paneer Pakoda');
    const vegSteamMomo    = await findMenu('Veg Steam Momo');
    const chickenSteamMomo = await findMenu('Chicken Steam Momo');
    const vegFriedRice    = await findMenu('Veg Fried Rice');
    const eggFriedRice    = await findMenu('Egg Fried Rice');
    const chickenFriedRice = await findMenu('Chicken Fried Rice');
    const vegChowmein     = await findMenu('Veg Chowmein');
    const chickenChowmein = await findMenu('Chicken Chowmein');
    const vegBurger       = await findMenu('Veg Burger');
    const chickenBurger   = await findMenu('Chicken Burger');

    await Inventory.deleteMany({});

    await Inventory.insertMany([
      // ── DAIRY ──
      {
        name: 'Milk',
        category: 'Dairy',
        unit: 'liters',
        currentStock: 25,
        lowStockThreshold: 5,
        costPerUnit: 90,
        supplier: 'Local Dairy',
        notes: 'Full-fat fresh milk — used in tea, coffee, lassi',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 3,
        totalUsedThisMonth: 55,
        usedInMenuItems: [
          ...(milkTea       ? [{ menuItem: milkTea._id,       menuItemName: milkTea.name,       quantityPerServing: 0.15 }] : []),
          ...(masalaMilkTea ? [{ menuItem: masalaMilkTea._id, menuItemName: masalaMilkTea.name, quantityPerServing: 0.15 }] : []),
          ...(blackCoffee   ? [{ menuItem: blackCoffee._id,   menuItemName: blackCoffee.name,   quantityPerServing: 0.05 }] : []),
          ...(milkCoffee    ? [{ menuItem: milkCoffee._id,    menuItemName: milkCoffee.name,    quantityPerServing: 0.2  }] : []),
          ...(coldCoffeeM   ? [{ menuItem: coldCoffeeM._id,   menuItemName: coldCoffeeM.name,   quantityPerServing: 0.2  }] : []),
          ...(plainLassi    ? [{ menuItem: plainLassi._id,    menuItemName: plainLassi.name,    quantityPerServing: 0.25 }] : []),
          ...(sweetLassi    ? [{ menuItem: sweetLassi._id,    menuItemName: sweetLassi.name,    quantityPerServing: 0.25 }] : []),
          ...(bananaLassi   ? [{ menuItem: bananaLassi._id,   menuItemName: bananaLassi.name,   quantityPerServing: 0.25 }] : []),
          ...(mixedLassi    ? [{ menuItem: mixedLassi._id,    menuItemName: mixedLassi.name,    quantityPerServing: 0.25 }] : []),
        ],
        restockHistory: [{ quantity: 25, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 90, totalCost: 2250, note: 'Initial stock' }],
      },

      // ── TEA LEAVES ──
      {
        name: 'Tea Leaves (CTC)',
        category: 'Tea & Coffee',
        unit: 'kg',
        currentStock: 4,
        lowStockThreshold: 1,
        costPerUnit: 600,
        supplier: 'Ilam Tea Co.',
        notes: 'Premium CTC tea from Ilam — used in all tea variants',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 0.1,
        totalUsedThisMonth: 1.8,
        usedInMenuItems: [
          ...(milkTea        ? [{ menuItem: milkTea._id,        menuItemName: milkTea.name,        quantityPerServing: 0.005 }] : []),
          ...(masalaMilkTea  ? [{ menuItem: masalaMilkTea._id,  menuItemName: masalaMilkTea.name,  quantityPerServing: 0.005 }] : []),
          ...(masalaBlackTea ? [{ menuItem: masalaBlackTea._id, menuItemName: masalaBlackTea.name, quantityPerServing: 0.005 }] : []),
          ...(gingerTea      ? [{ menuItem: gingerTea._id,      menuItemName: gingerTea.name,      quantityPerServing: 0.005 }] : []),
        ],
        restockHistory: [{ quantity: 4, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 600, totalCost: 2400, note: 'Initial stock' }],
      },

      // ── SUGAR ──
      {
        name: 'Sugar',
        category: 'Spices',
        unit: 'kg',
        currentStock: 10,
        lowStockThreshold: 2,
        costPerUnit: 80,
        supplier: 'Local Market',
        notes: 'Used in tea, lassi, drinks',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 0.4,
        totalUsedThisMonth: 7,
        restockHistory: [{ quantity: 10, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 80, totalCost: 800, note: 'Initial stock' }],
      },

      // ── COFFEE BEANS ──
      {
        name: 'Coffee Beans',
        category: 'Tea & Coffee',
        unit: 'kg',
        currentStock: 2,
        lowStockThreshold: 0.5,
        costPerUnit: 1200,
        supplier: 'Nepal Coffee Co.',
        notes: 'Arabica blend for black and milk coffee',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 0.05,
        totalUsedThisMonth: 0.9,
        usedInMenuItems: [
          ...(blackCoffee ? [{ menuItem: blackCoffee._id, menuItemName: blackCoffee.name, quantityPerServing: 0.015 }] : []),
          ...(milkCoffee  ? [{ menuItem: milkCoffee._id,  menuItemName: milkCoffee.name,  quantityPerServing: 0.015 }] : []),
          ...(coldCoffeeM ? [{ menuItem: coldCoffeeM._id, menuItemName: coldCoffeeM.name, quantityPerServing: 0.015 }] : []),
        ],
        restockHistory: [{ quantity: 2, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 1200, totalCost: 2400, note: 'Initial stock' }],
      },

      // ── GINGER ──
      {
        name: 'Ginger',
        category: 'Spices',
        unit: 'kg',
        currentStock: 2,
        lowStockThreshold: 0.5,
        costPerUnit: 120,
        supplier: 'Local Market',
        notes: 'Fresh ginger for ginger tea and masala variants',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 0.12,
        totalUsedThisMonth: 2.0,
        usedInMenuItems: [
          ...(gingerTea      ? [{ menuItem: gingerTea._id,      menuItemName: gingerTea.name,      quantityPerServing: 0.01 }] : []),
          ...(masalaMilkTea  ? [{ menuItem: masalaMilkTea._id,  menuItemName: masalaMilkTea.name,  quantityPerServing: 0.005 }] : []),
          ...(masalaBlackTea ? [{ menuItem: masalaBlackTea._id, menuItemName: masalaBlackTea.name, quantityPerServing: 0.005 }] : []),
        ],
        restockHistory: [{ quantity: 2, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 120, totalCost: 240, note: 'Initial stock' }],
      },

      // ── CARDAMOM ──
      {
        name: 'Cardamom',
        category: 'Spices',
        unit: 'g',
        currentStock: 500,
        lowStockThreshold: 100,
        costPerUnit: 2,
        supplier: 'Spice Market',
        notes: 'For masala tea variants',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 20,
        totalUsedThisMonth: 280,
        usedInMenuItems: [
          ...(masalaMilkTea  ? [{ menuItem: masalaMilkTea._id,  menuItemName: masalaMilkTea.name,  quantityPerServing: 1 }] : []),
          ...(masalaBlackTea ? [{ menuItem: masalaBlackTea._id, menuItemName: masalaBlackTea.name, quantityPerServing: 1 }] : []),
        ],
        restockHistory: [{ quantity: 500, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 2, totalCost: 1000, note: 'Initial stock' }],
      },

      // ── COCONUT MILK ──
      {
        name: 'Coconut Milk (canned)',
        category: 'Dairy',
        unit: 'pieces',
        currentStock: 12,
        lowStockThreshold: 3,
        costPerUnit: 120,
        supplier: 'Wholesale Grocery',
        notes: 'For coconut tea',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 1,
        totalUsedThisMonth: 10,
        usedInMenuItems: [
          ...(coconutTea ? [{ menuItem: coconutTea._id, menuItemName: coconutTea.name, quantityPerServing: 0.25 }] : []),
        ],
        restockHistory: [{ quantity: 12, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 120, totalCost: 1440, note: 'Initial stock' }],
      },

      // ── YOGURT (for lassi) ──
      {
        name: 'Yogurt (Dahi)',
        category: 'Dairy',
        unit: 'kg',
        currentStock: 8,
        lowStockThreshold: 2,
        costPerUnit: 140,
        supplier: 'Local Dairy',
        notes: 'Fresh dahi for lassi',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 0.8,
        totalUsedThisMonth: 12,
        usedInMenuItems: [
          ...(plainLassi  ? [{ menuItem: plainLassi._id,  menuItemName: plainLassi.name,  quantityPerServing: 0.3 }] : []),
          ...(sweetLassi  ? [{ menuItem: sweetLassi._id,  menuItemName: sweetLassi.name,  quantityPerServing: 0.3 }] : []),
          ...(bananaLassi ? [{ menuItem: bananaLassi._id, menuItemName: bananaLassi.name, quantityPerServing: 0.3 }] : []),
          ...(mixedLassi  ? [{ menuItem: mixedLassi._id,  menuItemName: mixedLassi.name,  quantityPerServing: 0.3 }] : []),
        ],
        restockHistory: [{ quantity: 8, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 140, totalCost: 1120, note: 'Initial stock' }],
      },

      // ── COOKING OIL ──
      {
        name: 'Cooking Oil',
        category: 'Other',
        unit: 'liters',
        currentStock: 6,
        lowStockThreshold: 1,
        costPerUnit: 250,
        supplier: 'Local Market',
        notes: 'For frying — pakoda, momo, fries etc.',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 0.3,
        totalUsedThisMonth: 5,
        usedInMenuItems: [
          ...(pakoda      ? [{ menuItem: pakoda._id,      menuItemName: pakoda.name,      quantityPerServing: 0.05 }] : []),
          ...(paneerPakoda ? [{ menuItem: paneerPakoda._id, menuItemName: paneerPakoda.name, quantityPerServing: 0.06 }] : []),
        ],
        restockHistory: [{ quantity: 6, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 250, totalCost: 1500, note: 'Initial stock' }],
      },

      // ── MAIDA ──
      {
        name: 'Maida (All-purpose Flour)',
        category: 'Flour & Grains',
        unit: 'kg',
        currentStock: 10,
        lowStockThreshold: 3,
        costPerUnit: 55,
        supplier: 'Local Market',
        notes: 'For momo, pakoda, burger bun dough',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 0.6,
        totalUsedThisMonth: 10,
        usedInMenuItems: [
          ...(vegSteamMomo     ? [{ menuItem: vegSteamMomo._id,     menuItemName: vegSteamMomo.name,     quantityPerServing: 0.1 }] : []),
          ...(chickenSteamMomo ? [{ menuItem: chickenSteamMomo._id, menuItemName: chickenSteamMomo.name, quantityPerServing: 0.1 }] : []),
          ...(pakoda           ? [{ menuItem: pakoda._id,           menuItemName: pakoda.name,           quantityPerServing: 0.05 }] : []),
        ],
        restockHistory: [{ quantity: 10, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 55, totalCost: 550, note: 'Initial stock' }],
      },

      // ── RICE ──
      {
        name: 'Rice',
        category: 'Flour & Grains',
        unit: 'kg',
        currentStock: 15,
        lowStockThreshold: 4,
        costPerUnit: 85,
        supplier: 'Local Market',
        notes: 'For fried rice variants',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 1,
        totalUsedThisMonth: 18,
        usedInMenuItems: [
          ...(vegFriedRice     ? [{ menuItem: vegFriedRice._id,     menuItemName: vegFriedRice.name,     quantityPerServing: 0.2 }] : []),
          ...(eggFriedRice     ? [{ menuItem: eggFriedRice._id,     menuItemName: eggFriedRice.name,     quantityPerServing: 0.2 }] : []),
          ...(chickenFriedRice ? [{ menuItem: chickenFriedRice._id, menuItemName: chickenFriedRice.name, quantityPerServing: 0.2 }] : []),
        ],
        restockHistory: [{ quantity: 15, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 85, totalCost: 1275, note: 'Initial stock' }],
      },

      // ── NOODLES ──
      {
        name: 'Chowmein Noodles',
        category: 'Flour & Grains',
        unit: 'kg',
        currentStock: 8,
        lowStockThreshold: 2,
        costPerUnit: 120,
        supplier: 'Wholesale Grocery',
        notes: 'Dried noodles for chowmein',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 0.6,
        totalUsedThisMonth: 9,
        usedInMenuItems: [
          ...(vegChowmein     ? [{ menuItem: vegChowmein._id,     menuItemName: vegChowmein.name,     quantityPerServing: 0.15 }] : []),
          ...(chickenChowmein ? [{ menuItem: chickenChowmein._id, menuItemName: chickenChowmein.name, quantityPerServing: 0.15 }] : []),
        ],
        restockHistory: [{ quantity: 8, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 120, totalCost: 960, note: 'Initial stock' }],
      },

      // ── CHICKEN ──
      {
        name: 'Chicken',
        category: 'Meat',
        unit: 'kg',
        currentStock: 5,
        lowStockThreshold: 2,
        costPerUnit: 650,
        supplier: 'Local Butcher',
        notes: 'Fresh chicken for momo, chowmein, burger, snacks',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 0.8,
        totalUsedThisMonth: 14,
        usedInMenuItems: [
          ...(chickenSteamMomo ? [{ menuItem: chickenSteamMomo._id, menuItemName: chickenSteamMomo.name, quantityPerServing: 0.1  }] : []),
          ...(chickenChowmein  ? [{ menuItem: chickenChowmein._id,  menuItemName: chickenChowmein.name,  quantityPerServing: 0.1  }] : []),
          ...(chickenFriedRice ? [{ menuItem: chickenFriedRice._id, menuItemName: chickenFriedRice.name, quantityPerServing: 0.1  }] : []),
          ...(chickenBurger    ? [{ menuItem: chickenBurger._id,    menuItemName: chickenBurger.name,    quantityPerServing: 0.15 }] : []),
        ],
        restockHistory: [{ quantity: 5, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 650, totalCost: 3250, note: 'Initial stock' }],
      },

      // ── EGGS ──
      {
        name: 'Eggs',
        category: 'Dairy',
        unit: 'pieces',
        currentStock: 60,
        lowStockThreshold: 12,
        costPerUnit: 18,
        supplier: 'Local Market',
        notes: 'For omelette, egg fried rice, egg chowmein',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 8,
        totalUsedThisMonth: 120,
        usedInMenuItems: [
          ...(eggFriedRice ? [{ menuItem: eggFriedRice._id, menuItemName: eggFriedRice.name, quantityPerServing: 1 }] : []),
        ],
        restockHistory: [{ quantity: 60, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 18, totalCost: 1080, note: 'Initial stock' }],
      },

      // ── VEGETABLES (general) ──
      {
        name: 'Mixed Vegetables',
        category: 'Vegetables',
        unit: 'kg',
        currentStock: 5,
        lowStockThreshold: 1,
        costPerUnit: 80,
        supplier: 'Local Market',
        notes: 'Cabbage, carrot, capsicum for momo, fried rice, chowmein',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 0.5,
        totalUsedThisMonth: 9,
        usedInMenuItems: [
          ...(vegSteamMomo  ? [{ menuItem: vegSteamMomo._id,  menuItemName: vegSteamMomo.name,  quantityPerServing: 0.1 }] : []),
          ...(vegFriedRice  ? [{ menuItem: vegFriedRice._id,  menuItemName: vegFriedRice.name,  quantityPerServing: 0.1 }] : []),
          ...(vegChowmein   ? [{ menuItem: vegChowmein._id,   menuItemName: vegChowmein.name,   quantityPerServing: 0.1 }] : []),
          ...(vegBurger     ? [{ menuItem: vegBurger._id,     menuItemName: vegBurger.name,     quantityPerServing: 0.1 }] : []),
        ],
        restockHistory: [{ quantity: 5, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 80, totalCost: 400, note: 'Initial stock' }],
      },

      // ── DISPOSABLE CUPS ── (intentionally low to demo alert)
      {
        name: 'Disposable Cups',
        category: 'Packaging',
        unit: 'pieces',
        currentStock: 0,
        lowStockThreshold: 50,
        costPerUnit: 3,
        supplier: 'Packaging Supplier',
        notes: 'For takeaway orders',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 15,
        totalUsedThisMonth: 180,
        restockHistory: [{ quantity: 200, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 3, totalCost: 600, note: 'Initial stock' }],
      },

      // ── MINERAL WATER ── (intentionally low to demo alert)
      {
        name: 'Mineral Water Bottles',
        category: 'Beverages',
        unit: 'pieces',
        currentStock: 3,
        lowStockThreshold: 12,
        costPerUnit: 25,
        supplier: 'Himalayan Springs',
        notes: 'Complimentary water bottles',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 8,
        totalUsedThisMonth: 90,
        restockHistory: [{ quantity: 48, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 25, totalCost: 1200, note: 'Initial stock' }],
      },

      // ── HOOKAH SUPPLIES ──
      {
        name: 'Hookah Flavour (Molasses)',
        category: 'Hookah',
        unit: 'packs',
        currentStock: 20,
        lowStockThreshold: 5,
        costPerUnit: 200,
        supplier: 'Hookah Supplier',
        notes: 'Various flavours for hookah sessions',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 2,
        totalUsedThisMonth: 30,
        restockHistory: [{ quantity: 20, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 200, totalCost: 4000, note: 'Initial stock' }],
      },

      {
        name: 'Hookah Coal',
        category: 'Hookah',
        unit: 'pieces',
        currentStock: 80,
        lowStockThreshold: 20,
        costPerUnit: 10,
        supplier: 'Hookah Supplier',
        notes: 'Natural coconut coal for hookah',
        createdBy: admin._id,
        lastRestockedAt: new Date(),
        usageResetDate: new Date().toISOString().slice(0, 10),
        totalUsedToday: 8,
        totalUsedThisMonth: 120,
        restockHistory: [{ quantity: 80, addedBy: admin._id, addedByName: 'Admin', costPerUnit: 10, totalCost: 800, note: 'Initial stock' }],
      },
    ]);

    console.log('📦 Inventory items seeded (matched to real menu)');
    console.log('✅ Inventory seeding complete!');
    console.log('\nNote: Disposable Cups (0) and Mineral Water (3) are intentionally low to demo low-stock alerts\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Inventory seed error:', err.message);
    process.exit(1);
  }
};

seedInventory();