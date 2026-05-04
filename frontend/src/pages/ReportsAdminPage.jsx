import { Chart, registerables } from "chart.js";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { orderAPI, userAPI } from "../services/api";

Chart.register(...registerables);

// ===== REPORTS PAGE =====
export const ReportsPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const lineRef = useRef(null);
  const doughnutRef = useRef(null);
  const lineChart = useRef(null);
  const doughnutChart = useRef(null);

  useEffect(() => {
    fetchReport();
  }, []);

  useEffect(() => {
    if (!report) return;
    if (lineChart.current) lineChart.current.destroy();
    if (doughnutChart.current) doughnutChart.current.destroy();

    if (lineRef.current) {
      const days = report.dailyStats;
      lineChart.current = new Chart(lineRef.current, {
        type: "line",
        data: {
          labels: days.map((d) => d._id?.slice(5) || d._id),
          datasets: [
            {
              label: "Revenue",
              data: days.map((d) => d.revenue),
              borderColor: "#d4862a",
              backgroundColor: "rgba(212,134,42,0.1)",
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: "#d4862a",
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { color: "rgba(255,255,255,0.03)" },
              ticks: { color: "#7a6a5a", font: { size: 10 } },
            },
            y: {
              grid: { color: "rgba(255,255,255,0.03)" },
              ticks: { color: "#7a6a5a", font: { size: 10 } },
            },
          },
        },
      });
    }
    if (doughnutRef.current && report.categoryStats?.length) {
      const cs = report.categoryStats;
      doughnutChart.current = new Chart(doughnutRef.current, {
        type: "doughnut",
        data: {
          labels: cs.map((c) => c._id),
          datasets: [
            {
              data: cs.map((c) => c.revenue),
              backgroundColor: [
                "rgba(212,134,42,0.7)",
                "rgba(76,175,136,0.7)",
                "rgba(91,155,213,0.7)",
                "rgba(155,126,212,0.7)",
                "rgba(224,92,92,0.7)",
                "rgba(255,200,100,0.7)",
              ],
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: "#b8a898", font: { size: 11 } },
            },
          },
          cutout: "60%",
        },
      });
    }
  }, [report]);

  useEffect(
    () => () => {
      lineChart.current?.destroy();
      doughnutChart.current?.destroy();
    },
    [],
  );

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data } = await orderAPI.getReport({ startDate, endDate });
      setReport(data.report);
    } catch (err) {
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const s = report?.summary || {};

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2 className="page-title">📈 Sales Reports</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: "auto" }}
          />
          <span style={{ color: "var(--text3)", fontSize: 12 }}>to</span>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: "auto" }}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={fetchReport}
            disabled={loading}
          >
            {loading ? "..." : "Generate"}
          </button>
        </div>
      </div>

      {report && (
        <>
          <div
            className="stats-grid mb-24"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            {[
              {
                label: "Total Revenue",
                val: `Rs. ${(s.totalRevenue || 0).toLocaleString()}`,
                cls: "",
              },
              {
                label: "Cash Collected",
                val: `Rs. ${(s.totalCash || 0).toLocaleString()}`,
                cls: "green",
              },
              {
                label: "QR / eSewa",
                val: `Rs. ${(s.totalQR || 0).toLocaleString()}`,
                cls: "blue",
              },
              {
                label: "Unpaid Bills",
                val: `Rs. ${(s.totalUnpaid || 0).toLocaleString()}`,
                cls: "red",
              },
              { label: "Total Orders", val: s.totalOrders || 0, cls: "purple" },
              {
                label: "Avg Order",
                val: `Rs. ${s.paidOrders ? Math.round((s.totalRevenue || 0) / s.paidOrders).toLocaleString() : 0}`,
                cls: "",
              },
            ].map((c) => (
              <div key={c.label} className={`stat-card ${c.cls}`}>
                <div className="stat-label">{c.label}</div>
                <div className="stat-value mono">{c.val}</div>
              </div>
            ))}
          </div>
          <div className="grid-2 mb-24">
            <div className="card">
              <div className="card-title mb-16">Revenue Trend</div>
              <canvas ref={lineRef} style={{ maxHeight: 220 }} />
            </div>
            <div className="card">
              <div className="card-title mb-16">Category Breakdown</div>
              <canvas ref={doughnutRef} style={{ maxHeight: 220 }} />
            </div>
          </div>
          <div className="card">
            <div className="card-title mb-16">Daily Breakdown</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                  <th>Cash</th>
                  <th>QR</th>
                  <th>Avg</th>
                </tr>
              </thead>
              <tbody>
                {[...report.dailyStats].reverse().map((d) => (
                  <tr key={d._id}>
                    <td style={{ fontFamily: "DM Mono", fontSize: 12 }}>
                      {d._id}
                    </td>
                    <td>{d.orders}</td>
                    <td
                      style={{ fontFamily: "DM Mono", color: "var(--amber)" }}
                    >
                      Rs. {(d.revenue || 0).toLocaleString()}
                    </td>
                    <td
                      style={{ fontFamily: "DM Mono", color: "var(--green)" }}
                    >
                      Rs. {(d.cashRevenue || 0).toLocaleString()}
                    </td>
                    <td style={{ fontFamily: "DM Mono", color: "var(--blue)" }}>
                      Rs. {(d.qrRevenue || 0).toLocaleString()}
                    </td>
                    <td style={{ fontFamily: "DM Mono" }}>
                      Rs.{" "}
                      {d.orders
                        ? Math.round(
                            (d.revenue || 0) / d.orders,
                          ).toLocaleString()
                        : 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

// ===== ADMIN PAGE =====
export const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [newUser, setNewUser] = useState({
    name: "",
    username: "",
    password: "",
    role: "staff",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchSettings();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await userAPI.getAll();
      setUsers(data.users);
    } catch (_) {}
  };

  const fetchSettings = async () => {
    try {
      const { data } = await userAPI.getSettings();
      setSettings(data.settings);
    } catch (_) {}
  };

  const addUser = async (e) => {
    e.preventDefault();
    try {
      await userAPI.create(newUser);
      toast.success(`${newUser.name} added as ${newUser.role}`);
      setNewUser({ name: "", username: "", password: "", role: "staff" });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add user");
    }
  };

  const removeUser = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}?`)) return;
    try {
      await userAPI.delete(id);
      toast.success(`${name} deactivated`);
      fetchUsers();
    } catch (err) {
      toast.error("Failed");
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await userAPI.updateSettings(settings);
      toast.success("Settings saved!");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2 className="page-title">⚙️ Admin Panel</h2>
      </div>
      <div className="grid-2">
        {/* STAFF MANAGEMENT */}
        <div className="card">
          <div className="card-title mb-16">👥 Staff Management</div>
          <div style={{ marginBottom: 16 }}>
            {users.map((u) => (
              <div key={u._id} className="staff-row">
                <div className="user-avatar-sm">{u.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>
                    @{u.username}
                  </div>
                </div>
                <span className={`badge badge-${u.role}`}>{u.role}</span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: u.isActive ? "var(--green)" : "var(--red)",
                  }}
                />
                <button
                  className="btn btn-xs btn-danger"
                  onClick={() => removeUser(u._id, u.name)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="card-title mb-16" style={{ fontSize: 14 }}>
            Add Staff Member
          </div>
          <form onSubmit={addUser}>
            <div className="grid-2" style={{ gap: 8 }}>
              <input
                className="form-control"
                placeholder="Full name"
                value={newUser.name}
                onChange={(e) =>
                  setNewUser((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
              <input
                className="form-control"
                placeholder="Username"
                value={newUser.username}
                onChange={(e) =>
                  setNewUser((f) => ({ ...f, username: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid-2" style={{ gap: 8, marginTop: 8 }}>
              <input
                type="password"
                className="form-control"
                placeholder="Password"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser((f) => ({ ...f, password: e.target.value }))
                }
                required
              />
              <select
                className="form-control"
                value={newUser.role}
                onChange={(e) =>
                  setNewUser((f) => ({ ...f, role: e.target.value }))
                }
              >
                <option value="staff">Staff</option>
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              style={{ marginTop: 10 }}
            >
              + Add Member
            </button>
          </form>
        </div>

        {/* BUSINESS SETTINGS — VAT Rate field removed */}
        <div className="card">
          <div className="card-title mb-16">🏪 Business Settings</div>
          {settings && (
            <>
              {[
                { label: "Cafe Name", key: "cafeName", type: "text" },
                { label: "Address", key: "address", type: "text" },
                { label: "Phone", key: "phone", type: "text" },
                { label: "Email", key: "email", type: "email" },
                {
                  label: "Service Charge (%)",
                  key: "serviceChargeRate",
                  type: "number",
                },
              ].map((f) => (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <input
                    type={f.type}
                    className="form-control"
                    value={settings[f.key] || ""}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        [f.key]:
                          f.type === "number"
                            ? parseFloat(e.target.value)
                            : e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Receipt Footer Message</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={settings.receiptFooter || ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      receiptFooter: e.target.value,
                    }))
                  }
                  style={{ resize: "none" }}
                />
              </div>
              <button
                className="btn btn-primary btn-full"
                onClick={saveSettings}
                disabled={saving}
              >
                {saving ? "Saving..." : "💾 Save Settings"}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .staff-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: var(--card2);
          border: 1px solid var(--border);
          border-radius: var(--radius2);
          margin-bottom: 7px;
        }
        .user-avatar-sm {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: var(--amber-dim);
          border: 1px solid var(--amber-glow);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
          color: var(--amber);
          font-weight: 700;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

// ===== TRANSACTIONS PAGE =====
export const TransactionsPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(
    new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    fetchOrders();
  }, [dateFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await orderAPI.getAll({ date: dateFilter, limit: 200 });
      setOrders(data.orders);
    } catch (err) {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      "Order ID",
      "Table",
      "Items",
      "Subtotal",
      "Total",
      "Payment",
      "Status",
      "Time",
      "Cashier",
    ];
    const rows = orders.map((o) => [
      o.orderId,
      o.tableNumber || o.orderType,
      o.items.map((i) => `${i.name}x${i.qty}`).join(";"),
      o.subtotal,
      o.total,
      o.paymentMethod,
      o.paymentStatus,
      new Date(o.createdAt).toLocaleString(),
      o.cashierName,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `txn-${dateFilter}.csv`;
    a.click();
    toast.success("Exported!");
  };

  const paid = orders.filter((o) => o.paymentStatus === "paid");
  const totalRev = paid.reduce((s, o) => s + o.total, 0);
  const cashRev = paid
    .filter((o) => o.paymentMethod === "cash")
    .reduce((s, o) => s + o.total, 0);
  const qrRev = paid
    .filter((o) => o.paymentMethod === "qr")
    .reduce((s, o) => s + o.total, 0);
  const unpaid = orders
    .filter((o) => o.paymentStatus === "unpaid")
    .reduce((s, o) => s + o.total, 0);

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2 className="page-title">💰 Transactions</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="date"
            className="form-control"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ width: "auto" }}
          />
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
            ↓ CSV
          </button>
        </div>
      </div>
      <div
        className="stats-grid mb-24"
        style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
      >
        <div className="stat-card">
          <div className="stat-label">Collected</div>
          <div className="stat-value mono" style={{ fontSize: 20 }}>
            Rs. {totalRev.toLocaleString()}
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Cash</div>
          <div className="stat-value mono" style={{ fontSize: 20 }}>
            Rs. {cashRev.toLocaleString()}
          </div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">QR/eSewa</div>
          <div className="stat-value mono" style={{ fontSize: 20 }}>
            Rs. {qrRev.toLocaleString()}
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Unpaid</div>
          <div className="stat-value mono" style={{ fontSize: 20 }}>
            Rs. {unpaid.toLocaleString()}
          </div>
        </div>
      </div>
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div className="flex-center" style={{ padding: 40 }}>
            <div className="spinner" />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Table</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Time</th>
                <th>Cashier</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      color: "var(--text3)",
                      padding: 30,
                    }}
                  >
                    No transactions
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o._id}>
                    <td>
                      <span
                        style={{
                          fontFamily: "DM Mono",
                          fontSize: 11,
                          color: "var(--amber)",
                        }}
                      >
                        {o.orderId}
                      </span>
                    </td>
                    <td>{o.tableNumber ? `T${o.tableNumber}` : o.orderType}</td>
                    <td>
                      <span
                        style={{
                          fontFamily: "DM Mono",
                          color: "var(--amber)",
                          fontWeight: 600,
                        }}
                      >
                        Rs. {o.total.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${o.paymentMethod}`}>
                        {o.paymentMethod?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${o.paymentStatus}`}>
                        {o.paymentStatus?.toUpperCase()}
                      </span>
                    </td>
                    <td
                      style={{
                        fontSize: 11,
                        fontFamily: "DM Mono",
                        color: "var(--text3)",
                      }}
                    >
                      {new Date(o.createdAt).toLocaleTimeString()}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text3)" }}>
                      {o.cashierName}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
