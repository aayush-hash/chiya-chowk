import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { menuAPI } from "../services/api";

const CATEGORIES = [
  "Tea",
  "Coffee",
  "Tea Alternatives",
  "Lassi",
  "Hookah",
  "Veg Snacks",
  "Non-Veg Snacks",
  "Breakfast",
  "Sandwich",
  "Burger",
  "Fried Rice",
  "Chowmein",
  "Momo",
  "Other",
];

const CAT_EMOJI = {
  Tea: "🍵",
  Coffee: "☕",
  "Tea Alternatives": "🍹",
  Lassi: "🥛",
  Hookah: "💨",
  "Veg Snacks": "🥗",
  "Non-Veg Snacks": "🍗",
  Breakfast: "🍳",
  Sandwich: "🥪",
  Burger: "🍔",
  "Fried Rice": "🍚",
  Chowmein: "🍜",
  Momo: "🥟",
  Other: "🍽️",
};

const MenuPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const { isManager } = useAuth();

  // Add form state
  const [form, setForm] = useState({
    name: "",
    category: "Tea",
    price: "",
    emoji: "🍵",
    description: "",
    costPrice: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Edit modal state
  const [editItem, setEditItem] = useState(null); // null = closed, object = open
  const [editForm, setEditForm] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data } = await menuAPI.getAll();
      setItems(data.items);
    } catch (err) {
      toast.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) {
      toast.error("Name and price required");
      return;
    }
    setSubmitting(true);
    try {
      await menuAPI.create({
        ...form,
        price: parseFloat(form.price),
        costPrice: parseFloat(form.costPrice) || 0,
      });
      toast.success(`${form.name} added to menu!`);
      setForm({
        name: "",
        category: "Tea",
        price: "",
        emoji: "🍵",
        description: "",
        costPrice: "",
      });
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add item");
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit modal pre-filled with item data
  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({
      name: item.name,
      category: item.category,
      price: item.price,
      emoji: item.emoji || "🍽️",
      description: item.description || "",
      costPrice: item.costPrice || "",
    });
  };

  const closeEdit = () => {
    setEditItem(null);
    setEditForm({});
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.price) {
      toast.error("Name and price required");
      return;
    }
    setEditSubmitting(true);
    try {
      await menuAPI.update(editItem._id, {
        ...editForm,
        price: parseFloat(editForm.price),
        costPrice: parseFloat(editForm.costPrice) || 0,
      });
      toast.success(`${editForm.name} updated!`);
      closeEdit();
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update item");
    } finally {
      setEditSubmitting(false);
    }
  };

  const toggleItem = async (id) => {
    try {
      const { data } = await menuAPI.toggle(id);
      toast.success(data.message);
      fetchItems();
    } catch (err) {
      toast.error("Failed to toggle");
    }
  };

  const deleteItem = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await menuAPI.delete(id);
      toast.success(`${name} deleted`);
      fetchItems();
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const group = items.filter((i) => i.category === cat);
    if (group.length) acc[cat] = group;
    return acc;
  }, {});
  const knownCats = new Set(CATEGORIES);
  items.forEach((i) => {
    if (!knownCats.has(i.category) && i.category) {
      if (!grouped[i.category]) grouped[i.category] = [];
      grouped[i.category].push(i);
    }
  });

  const displayGroups =
    activeFilter === "All"
      ? Object.entries(grouped)
      : Object.entries(grouped).filter(([cat]) => cat === activeFilter);

  const filterCats = ["All", ...Object.keys(grouped)];

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2 className="page-title">🍽️ Menu Management</h2>
        <span style={{ fontSize: 12, color: "var(--text3)" }}>
          {items.length} items · {Object.keys(grouped).length} categories
        </span>
      </div>

      {/* Category filter chips */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 20,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {filterCats.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
              cursor: "pointer",
              fontFamily: "DM Sans",
              border: `1px solid ${activeFilter === cat ? "var(--amber)" : "var(--border2)"}`,
              background:
                activeFilter === cat ? "var(--amber-dim)" : "var(--card)",
              color: activeFilter === cat ? "var(--amber)" : "var(--text3)",
              transition: "var(--transition)",
            }}
          >
            {CAT_EMOJI[cat] || "🍽️"} {cat}
            {cat !== "All" && grouped[cat] && (
              <span style={{ marginLeft: 5, opacity: 0.7 }}>
                ({grouped[cat].length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="menu-mgmt-layout">
        <div>
          {loading ? (
            <div className="flex-center" style={{ height: 200 }}>
              <div className="spinner" />
            </div>
          ) : displayGroups.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🍽️</div>
              <p>No items found</p>
            </div>
          ) : (
            displayGroups.map(([cat, catItems]) => (
              <div key={cat} className="menu-category-section">
                <div className="cat-header">
                  <span className="cat-name">
                    {CAT_EMOJI[cat] || "🍽️"} {cat}
                  </span>
                  <span className="cat-count">
                    {catItems.length} item{catItems.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {catItems.map((item) => (
                  <div
                    key={item._id}
                    className={`menu-list-item ${!item.isAvailable ? "unavailable" : ""}`}
                  >
                    <div
                      style={{
                        fontSize: 28,
                        minWidth: 36,
                        textAlign: "center",
                      }}
                    >
                      {item.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          marginBottom: 2,
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text3)" }}>
                        <span
                          style={{
                            color: "var(--amber)",
                            fontFamily: "DM Mono",
                            fontWeight: 600,
                          }}
                        >
                          Rs. {item.price}
                        </span>
                        {item.description ? ` · ${item.description}` : ""}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text3)",
                          marginTop: 2,
                        }}
                      >
                        Sold: {item.soldCount || 0}
                        {!item.isAvailable && (
                          <span style={{ color: "var(--red)", marginLeft: 8 }}>
                            ● Unavailable
                          </span>
                        )}
                      </div>
                    </div>
                    {isManager && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {/* ✏️ Edit button */}
                        <button
                          className="btn btn-xs btn-edit"
                          onClick={() => openEdit(item)}
                          title="Edit item"
                        >
                          ✏️
                        </button>
                        <button
                          className={`btn btn-xs ${item.isAvailable ? "btn-success" : "btn-secondary"}`}
                          onClick={() => toggleItem(item._id)}
                          title={
                            item.isAvailable
                              ? "Mark unavailable"
                              : "Mark available"
                          }
                        >
                          {item.isAvailable ? "✅" : "❌"}
                        </button>
                        <button
                          className="btn btn-xs btn-danger"
                          onClick={() => deleteItem(item._id, item.name)}
                          title="Delete"
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {isManager && (
          <div className="add-item-card card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>
              ➕ Add New Item
            </h3>
            <div className="form-group">
              <label className="form-label">Item Name *</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Masala Chiya"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-control"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CAT_EMOJI[c]} {c}
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div className="form-group">
                <label className="form-label">Price (NPR) *</label>
                <input
                  className="form-control"
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  placeholder="150"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cost Price</label>
                <input
                  className="form-control"
                  type="number"
                  value={form.costPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, costPrice: e.target.value }))
                  }
                  placeholder="80"
                  min="0"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Emoji Icon</label>
              <input
                className="form-control"
                value={form.emoji}
                onChange={(e) =>
                  setForm((f) => ({ ...f, emoji: e.target.value }))
                }
                placeholder="☕"
                style={{ fontSize: 20 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Short description..."
                style={{ resize: "none" }}
              />
            </div>
            <button
              className="btn btn-primary btn-full"
              disabled={submitting}
              onClick={handleAdd}
            >
              {submitting ? "Adding..." : "+ Add to Menu"}
            </button>
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editItem && (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">✏️ Edit Item</h3>
              <button className="modal-close" onClick={closeEdit}>
                ✕
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Item Name *</label>
              <input
                className="form-control"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Item name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-control"
                value={editForm.category}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, category: e.target.value }))
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CAT_EMOJI[c]} {c}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div className="form-group">
                <label className="form-label">Price (NPR) *</label>
                <input
                  className="form-control"
                  type="number"
                  value={editForm.price}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, price: e.target.value }))
                  }
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cost Price</label>
                <input
                  className="form-control"
                  type="number"
                  value={editForm.costPrice}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, costPrice: e.target.value }))
                  }
                  min="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Emoji Icon</label>
              <input
                className="form-control"
                value={editForm.emoji}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, emoji: e.target.value }))
                }
                style={{ fontSize: 20 }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows={2}
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Short description..."
                style={{ resize: "none" }}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={closeEdit}
                disabled={editSubmitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleEdit}
                disabled={editSubmitting}
              >
                {editSubmitting ? "Saving..." : "💾 Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .menu-mgmt-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 16px;
          align-items: start;
        }
        .menu-category-section { margin-bottom: 20px; }
        .cat-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 16px; background: var(--card2); border: 1px solid var(--border);
          border-bottom: none; border-radius: var(--radius) var(--radius) 0 0;
        }
        .cat-name { font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 600; }
        .cat-count { font-size: 11px; color: var(--text3); }
        .menu-list-item {
          display: flex; align-items: center; gap: 12px; padding: 13px 16px;
          background: var(--card); border: 1px solid var(--border); border-top: none;
          transition: var(--transition);
        }
        .menu-list-item:last-child { border-radius: 0 0 var(--radius) var(--radius); }
        .menu-list-item:hover { background: var(--card2); }
        .menu-list-item.unavailable { opacity: 0.55; }
        .add-item-card { position: sticky; top: calc(var(--topbar-height, 64px) + 24px); }

        /* Edit button style */
        .btn-edit {
          background: var(--card2);
          border: 1px solid var(--border2);
          color: var(--text2);
          transition: var(--transition);
        }
        .btn-edit:hover {
          border-color: var(--amber);
          color: var(--amber);
          background: var(--amber-dim);
        }

        /* Modal */
        .modal-backdrop {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.55);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: fadeIn 0.15s ease;
        }
        .modal-box {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          width: 100%; max-width: 440px;
          padding: 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          animation: slideUp 0.2s ease;
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 18px;
        }
        .modal-title {
          font-size: 16px; font-weight: 700; margin: 0;
        }
        .modal-close {
          background: none; border: none; cursor: pointer;
          font-size: 16px; color: var(--text3); padding: 4px 8px;
          border-radius: 6px; line-height: 1;
          transition: var(--transition);
        }
        .modal-close:hover { background: var(--card2); color: var(--text1); }
        .modal-actions {
          display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;
        }

        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

        @media (max-width: 900px) {
          .menu-mgmt-layout { grid-template-columns: 1fr; }
          .add-item-card { position: static; }
        }
      `}</style>
    </div>
  );
};

export default MenuPage;
