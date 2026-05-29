import { Chart, registerables } from "chart.js";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { orderAPI, userAPI } from "../services/api";

Chart.register(...registerables);

const CHART_COLORS = [
  "#d4862a", "#4caf88", "#5b9bd5", "#9b7ed4",
  "#e05c5c", "#ffc864", "#3a7ed4", "#27a86e",
];

// ===== REPORTS PAGE =====
export const ReportsPage = () => {
  const [report, setReport]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [itemRows, setItemRows]       = useState([]);
  const [itemLoading, setItemLoading] = useState(false);
  const [sortBy, setSortBy]           = useState("qty");
  const [activeTab, setActiveTab]     = useState("overview"); // "overview" | "items"
  const [startDate, setStartDate]     = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const lineRef       = useRef(null);
  const doughnutRef   = useRef(null);
  const barRef        = useRef(null);
  const catPieRef     = useRef(null);
  const lineChart     = useRef(null);
  const doughnutChart = useRef(null);
  const barChart      = useRef(null);
  const catPieChart   = useRef(null);

  useEffect(() => { fetchReport(); }, []);

  // Overview charts
  useEffect(() => {
    if (!report) return;
    lineChart.current?.destroy();
    doughnutChart.current?.destroy();

    if (lineRef.current) {
      const days = report.dailyStats;
      lineChart.current = new Chart(lineRef.current, {
        type: "line",
        data: {
          labels: days.map((d) => d._id?.slice(5) || d._id),
          datasets: [{
            label: "Revenue",
            data: days.map((d) => d.revenue),
            borderColor: "#d4862a",
            backgroundColor: "rgba(212,134,42,0.1)",
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: "#d4862a",
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#7a6a5a", font: { size: 10 } } },
            y: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#7a6a5a", font: { size: 10 } } },
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
          datasets: [{
            data: cs.map((c) => c.revenue),
            backgroundColor: CHART_COLORS.map((c) => c + "b3"),
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { position: "bottom", labels: { color: "#b8a898", font: { size: 11 } } } },
          cutout: "60%",
        },
      });
    }
  }, [report]);

  // Item charts
  useEffect(() => {
    barChart.current?.destroy();
    catPieChart.current?.destroy();

    if (!itemRows.length) return;

    const summaryMap = buildSummaryMap(itemRows);
    const summaryArr = Object.values(summaryMap);

    const top6 = [...summaryArr].sort((a, b) => b.qty - a.qty).slice(0, 6);

    const catMap = {};
    summaryArr.forEach((it) => { catMap[it.category] = (catMap[it.category] || 0) + it.rev; });
    const cats    = Object.keys(catMap);
    const catVals = cats.map((c) => catMap[c]);

    if (barRef.current && top6.length) {
      barChart.current = new Chart(barRef.current, {
        type: "bar",
        data: {
          labels: top6.map((it) => `${it.emoji} ${it.name}`),
          datasets: [{
            label: "Qty sold",
            data: top6.map((it) => it.qty),
            backgroundColor: top6.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + "cc"),
            borderColor:     top6.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
            borderWidth: 1,
            borderRadius: 4,
          }],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} plates` } },
          },
          scales: {
            x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#7a6a5a", font: { size: 10 } } },
            y: { grid: { display: false }, ticks: { color: "#9a8a7a", font: { size: 11 } } },
          },
        },
      });
    }

    if (catPieRef.current && cats.length) {
      catPieChart.current = new Chart(catPieRef.current, {
        type: "doughnut",
        data: {
          labels: cats,
          datasets: [{
            data: catVals,
            backgroundColor: cats.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + "cc"),
            borderColor:     cats.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
            borderWidth: 1.5,
            hoverOffset: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "62%",
          plugins: {
            legend: { position: "bottom", labels: { color: "#b8a898", font: { size: 11 }, boxWidth: 10, padding: 10 } },
            tooltip: { callbacks: { label: (ctx) => ` Rs. ${ctx.raw.toLocaleString()}` } },
          },
        },
      });
    }
  }, [itemRows]);

  useEffect(() => () => {
    lineChart.current?.destroy();
    doughnutChart.current?.destroy();
    barChart.current?.destroy();
    catPieChart.current?.destroy();
  }, []);

  // Build per-item summary map from raw line rows
  const buildSummaryMap = (rows) => {
    const map = {};
    for (const r of rows) {
      if (!map[r.item]) {
        map[r.item] = {
          name: r.item, emoji: r.emoji || "",
          category: r.category || "—", unitPrice: r.unitPrice,
          qty: 0, orders: 0, rev: 0,
        };
      }
      map[r.item].qty    += r.qty;
      map[r.item].orders += 1;
      map[r.item].rev    += r.totalRev;
    }
    return map;
  };

  const fetchReport = async () => {
    setLoading(true);
    setItemLoading(true);

    try {
      const { data } = await orderAPI.getReport({ startDate, endDate });
      setReport(data.report);
    } catch {
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }

    try {
      const { data: ordersData } = await orderAPI.getAll({ startDate, endDate, limit: 5000 });
      const rows = [];
      for (const order of ordersData.orders) {
        if (order.paymentStatus !== "paid") continue;
        const dateStr = new Date(order.createdAt).toLocaleString("en-NP", {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit",
        });
        for (const item of order.items) {
          rows.push({
            orderId:   order.orderId,
            date:      dateStr,
            table:     order.tableNumber ? `T${order.tableNumber}` : order.orderType,
            item:      item.name,
            emoji:     item.emoji || "",
            category:  item.category || "—",
            unitPrice: item.price,
            qty:       item.qty,
            totalRev:  item.subtotal ?? item.price * item.qty,
            cashier:   order.cashierName || "—",
          });
        }
      }
      setItemRows(rows);
    } catch {
      toast.error("Failed to load item data");
    } finally {
      setItemLoading(false);
    }
  };

  // Excel export — two sheets: line items + per-item summary
  const exportItemsExcel = () => {
    if (!itemRows.length) { toast.error("No item data to export"); return; }

    const wb = XLSX.utils.book_new();

    // Sheet 1: line items
    const lineData = [
      ["Order ID", "Date & Time", "Table", "Item Name", "Category", "Unit Price (Rs.)", "Qty Sold", "Total Revenue (Rs.)", "Cashier"],
      ...itemRows.map((r) => [
        r.orderId, r.date, r.table,
        `${r.emoji} ${r.item}`.trim(),
        r.category, r.unitPrice, r.qty, r.totalRev, r.cashier,
      ]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(lineData);
    ws1["!cols"] = [
      { wch: 16 }, { wch: 20 }, { wch: 10 }, { wch: 28 },
      { wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 20 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "Item Line Items");

    // Sheet 2: per-item summary
    const summaryMap  = buildSummaryMap(itemRows);
    const summaryRows = Object.values(summaryMap).sort((a, b) => b.rev - a.rev);
    const totalQty    = summaryRows.reduce((s, r) => s + r.qty, 0);
    const totalRev    = summaryRows.reduce((s, r) => s + r.rev, 0);
    const totalOrders = summaryRows.reduce((s, r) => s + r.orders, 0);

    const summaryData = [
      ["Item Name", "Category", "Unit Price (Rs.)", "Orders", "Qty Sold", "Total Revenue (Rs.)"],
      ...summaryRows.map((r) => [`${r.emoji} ${r.name}`.trim(), r.category, r.unitPrice, r.orders, r.qty, r.rev]),
      [],
      ["TOTAL", "", "", totalOrders, totalQty, totalRev],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
    ws2["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Item Summary");

    XLSX.writeFile(wb, `item-sales-${startDate}-to-${endDate}.xlsx`);
    toast.success("Excel exported!");
  };

  // Computed item summary
  const summaryMap   = buildSummaryMap(itemRows);
  const summaryArr   = Object.values(summaryMap);
  const totalItemQty = summaryArr.reduce((s, r) => s + r.qty, 0);
  const totalItemRev = summaryArr.reduce((s, r) => s + r.rev, 0);
  const totalItemOrd = summaryArr.reduce((s, r) => s + r.orders, 0);
  const topItem      = [...summaryArr].sort((a, b) => b.qty - a.qty)[0];
  const maxRev       = Math.max(...summaryArr.map((r) => r.rev), 1);

  const sorted = [...summaryArr].sort((a, b) => {
    if (sortBy === "qty")    return b.qty - a.qty;
    if (sortBy === "rev")    return b.rev - a.rev;
    if (sortBy === "orders") return b.orders - a.orders;
    return a.name.localeCompare(b.name);
  });

  const s = report?.summary || {};

  return (
    <div className="animate-fadeIn">
      {/* ── Header ── */}
      <div className="page-header">
        <h2 className="page-title">Analytics Reports</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" className="form-control" value={startDate}
            onChange={(e) => setStartDate(e.target.value)} style={{ width: "auto" }} />
          <span style={{ color: "var(--text3)", fontSize: 12 }}>to</span>
          <input type="date" className="form-control" value={endDate}
            onChange={(e) => setEndDate(e.target.value)} style={{ width: "auto" }} />
          <button className="btn btn-primary btn-sm" onClick={fetchReport} disabled={loading || itemLoading}>
            {loading || itemLoading ? "..." : "Generate"}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {[
          { key: "overview", label: "Overview" },
          { key: "items",    label: "Item Sales" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "8px 16px", fontSize: 13, fontWeight: 600,
              color: activeTab === tab.key ? "var(--amber)" : "var(--text3)",
              borderBottom: activeTab === tab.key ? "2px solid var(--amber)" : "2px solid transparent",
              marginBottom: -1, transition: "all .15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════ */}
      {activeTab === "overview" && report && (
        <>
          <div className="stats-grid mb-24" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            {[
              { label: "Total Revenue",  val: `Rs. ${(s.totalRevenue || 0).toLocaleString()}`, cls: "" },
              { label: "Cash Collected", val: `Rs. ${(s.totalCash    || 0).toLocaleString()}`, cls: "green" },
              { label: "QR / eSewa",     val: `Rs. ${(s.totalQR      || 0).toLocaleString()}`, cls: "blue" },
              { label: "Unpaid Bills",   val: `Rs. ${(s.totalUnpaid  || 0).toLocaleString()}`, cls: "red" },
              { label: "Total Orders",   val: s.totalOrders || 0,                               cls: "purple" },
              { label: "Avg Order",      val: `Rs. ${s.paidOrders ? Math.round((s.totalRevenue || 0) / s.paidOrders).toLocaleString() : 0}`, cls: "" },
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

          <div className="card mb-24">
            <div className="card-title mb-16">Daily Breakdown</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th><th>Orders</th><th>Revenue</th><th>Cash</th><th>QR</th><th>Avg</th>
                </tr>
              </thead>
              <tbody>
                {[...report.dailyStats].reverse().map((d) => (
                  <tr key={d._id}>
                    <td style={{ fontFamily: "DM Mono", fontSize: 12 }}>{d._id}</td>
                    <td>{d.orders}</td>
                    <td style={{ fontFamily: "DM Mono", color: "var(--amber)" }}>Rs. {(d.revenue || 0).toLocaleString()}</td>
                    <td style={{ fontFamily: "DM Mono", color: "var(--green)" }}>Rs. {(d.cashRevenue || 0).toLocaleString()}</td>
                    <td style={{ fontFamily: "DM Mono", color: "var(--blue)" }}>Rs. {(d.qrRevenue || 0).toLocaleString()}</td>
                    <td style={{ fontFamily: "DM Mono" }}>
                      Rs. {d.orders ? Math.round((d.revenue || 0) / d.orders).toLocaleString() : 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          TAB: ITEM SALES
      ══════════════════════════════════════════ */}
      {activeTab === "items" && (
        <>
          {/* Metric cards */}
          <div className="stats-grid mb-24" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            {[
              { label: "Item Revenue",     val: `Rs. ${totalItemRev.toLocaleString()}`,   cls: "" },
              { label: "Plates / Servings", val: totalItemQty.toLocaleString(),            cls: "blue" },
              { label: "Order Lines",      val: totalItemOrd.toLocaleString(),             cls: "purple" },
              { label: "Menu Items Sold",  val: summaryArr.length,                         cls: "" },
              {
                label: "Best Seller",
                val: topItem ? `${topItem.emoji} ${topItem.name}` : "—",
                sub: topItem ? `${topItem.qty} sold` : "",
                cls: "green",
              },
              {
                label: "Avg Rev / Item",
                val: summaryArr.length ? `Rs. ${Math.round(totalItemRev / summaryArr.length).toLocaleString()}` : "—",
                cls: "",
              },
            ].map((c) => (
              <div key={c.label} className={`stat-card ${c.cls}`}>
                <div className="stat-label">{c.label}</div>
                <div className="stat-value mono" style={{ fontSize: c.label === "Best Seller" ? 14 : undefined }}>
                  {c.val}
                </div>
                {c.sub && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{c.sub}</div>}
              </div>
            ))}
          </div>

          {/* Charts */}
          {summaryArr.length > 0 && (
            <div className="grid-2 mb-24">
              <div className="card">
                <div className="card-title mb-16">Top items by quantity sold</div>
                <div style={{ position: "relative", height: 240 }}>
                  <canvas ref={barRef} />
                </div>
              </div>
              <div className="card">
                <div className="card-title mb-16">Revenue by category</div>
                <div style={{ position: "relative", height: 240 }}>
                  <canvas ref={catPieRef} />
                </div>
              </div>
            </div>
          )}

          {/* Per-item table */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div className="card-title">Per-item breakdown</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>
                  {itemLoading
                    ? "Loading items..."
                    : `${summaryArr.length} items · ${totalItemQty.toLocaleString()} qty sold · Rs. ${totalItemRev.toLocaleString()} revenue`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  className="form-control"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ fontSize: 12, height: 32, padding: "0 8px", width: "auto" }}
                >
                  <option value="qty">Sort: Qty sold</option>
                  <option value="rev">Sort: Revenue</option>
                  <option value="orders">Sort: Orders</option>
                  <option value="name">Sort: Name</option>
                </select>
                <button
                  className="btn btn-sm"
                  onClick={exportItemsExcel}
                  disabled={itemLoading || !itemRows.length}
                  style={{
                    background: "rgba(76,175,136,0.15)",
                    border: "1px solid rgba(76,175,136,0.35)",
                    color: "var(--green)", fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <span style={{ fontSize: 15 }}>&#8595;</span> Export Excel
                </button>
              </div>
            </div>

            {itemLoading ? (
              <div className="flex-center" style={{ padding: 40 }}><div className="spinner" /></div>
            ) : sorted.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "var(--text3)", fontSize: 13 }}>
                No paid item data for this period
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}>#</th>
                      <th>Item name</th>
                      <th>Category</th>
                      <th style={{ textAlign: "right" }}>Orders</th>
                      <th style={{ textAlign: "right" }}>Plates sold</th>
                      <th style={{ textAlign: "right" }}>Unit price</th>
                      <th style={{ textAlign: "right" }}>Revenue</th>
                      <th style={{ textAlign: "right" }}>% of total</th>
                      <th style={{ width: 90 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((it, i) => (
                      <tr key={it.name}>
                        <td style={{ fontFamily: "DM Mono", fontSize: 11, color: "var(--text3)" }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>
                          <span style={{ marginRight: 5 }}>{it.emoji}</span>{it.name}
                        </td>
                        <td>
                          <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, background: "var(--card2)", color: "var(--text2)" }}>
                            {it.category}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "DM Mono", fontSize: 12 }}>{it.orders}</td>
                        <td style={{ textAlign: "right", fontFamily: "DM Mono", fontSize: 13, fontWeight: 700, color: "var(--amber)" }}>
                          {it.qty}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "DM Mono", fontSize: 12 }}>
                          Rs. {it.unitPrice.toLocaleString()}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "DM Mono", color: "var(--amber)", fontWeight: 600 }}>
                          Rs. {it.rev.toLocaleString()}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "DM Mono", fontSize: 11, color: "var(--text3)" }}>
                          {totalItemRev > 0 ? ((it.rev / totalItemRev) * 100).toFixed(1) + "%" : "—"}
                        </td>
                        <td>
                          <div style={{ background: "var(--card2)", borderRadius: 3, height: 5, overflow: "hidden" }}>
                            <div style={{
                              height: 5, borderRadius: 3, background: "var(--amber)",
                              width: `${Math.round((it.rev / maxRev) * 100)}%`,
                              transition: "width .4s",
                            }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "var(--card2)", borderTop: "2px solid var(--border)" }}>
                      <td colSpan={3} style={{ fontWeight: 700, color: "var(--amber)", padding: "10px 12px" }}>TOTAL</td>
                      <td style={{ textAlign: "right", fontFamily: "DM Mono", fontWeight: 700 }}>{totalItemOrd}</td>
                      <td style={{ textAlign: "right", fontFamily: "DM Mono", fontWeight: 700, color: "var(--amber)" }}>{totalItemQty}</td>
                      <td />
                      <td style={{ textAlign: "right", fontFamily: "DM Mono", color: "var(--amber)", fontWeight: 700 }}>
                        Rs. {totalItemRev.toLocaleString()}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "DM Mono", fontSize: 11 }}>100%</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ===== ADMIN PAGE =====
export const AdminPage = () => {
  const [users, setUsers]       = useState([]);
  const [settings, setSettings] = useState(null);
  const [newUser, setNewUser]   = useState({ name: "", username: "", password: "", role: "staff" });
  const [saving, setSaving]     = useState(false);

  useEffect(() => { fetchUsers(); fetchSettings(); }, []);

  const fetchUsers = async () => {
    try { const { data } = await userAPI.getAll(); setUsers(data.users); } catch (_) {}
  };

  const fetchSettings = async () => {
    try { const { data } = await userAPI.getSettings(); setSettings(data.settings); } catch (_) {}
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
    try { await userAPI.delete(id); toast.success(`${name} deactivated`); fetchUsers(); }
    catch { toast.error("Failed"); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try { await userAPI.updateSettings(settings); toast.success("Settings saved!"); }
    catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2 className="page-title">Admin Panel</h2>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title mb-16">Staff Management</div>
          <div style={{ marginBottom: 16 }}>
            {users.map((u) => (
              <div key={u._id} className="staff-row">
                <div className="user-avatar-sm">{u.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>@{u.username}</div>
                </div>
                <span className={`badge badge-${u.role}`}>{u.role}</span>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: u.isActive ? "var(--green)" : "var(--red)" }} />
                <button className="btn btn-xs btn-danger" onClick={() => removeUser(u._id, u.name)}>&#10005;</button>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="card-title mb-16" style={{ fontSize: 14 }}>Add Staff Member</div>
          <form onSubmit={addUser}>
            <div className="grid-2" style={{ gap: 8 }}>
              <input className="form-control" placeholder="Full name" value={newUser.name}
                onChange={(e) => setNewUser((f) => ({ ...f, name: e.target.value }))} required />
              <input className="form-control" placeholder="Username" value={newUser.username}
                onChange={(e) => setNewUser((f) => ({ ...f, username: e.target.value }))} required />
            </div>
            <div className="grid-2" style={{ gap: 8, marginTop: 8 }}>
              <input type="password" className="form-control" placeholder="Password" value={newUser.password}
                onChange={(e) => setNewUser((f) => ({ ...f, password: e.target.value }))} required />
              <select className="form-control" value={newUser.role}
                onChange={(e) => setNewUser((f) => ({ ...f, role: e.target.value }))}>
                <option value="staff">Staff</option>
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 10 }}>
              + Add Member
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-title mb-16">Business Settings</div>
          {settings && (
            <>
              {[
                { label: "Cafe Name",          key: "cafeName",          type: "text" },
                { label: "Address",            key: "address",           type: "text" },
                { label: "Phone",              key: "phone",             type: "text" },
                { label: "Email",              key: "email",             type: "email" },
                { label: "Service Charge (%)", key: "serviceChargeRate", type: "number" },
              ].map((f) => (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <input type={f.type} className="form-control" value={settings[f.key] || ""}
                    onChange={(e) => setSettings((prev) => ({
                      ...prev,
                      [f.key]: f.type === "number" ? parseFloat(e.target.value) : e.target.value,
                    }))} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Receipt Footer Message</label>
                <textarea className="form-control" rows={2} value={settings.receiptFooter || ""}
                  onChange={(e) => setSettings((prev) => ({ ...prev, receiptFooter: e.target.value }))}
                  style={{ resize: "none" }} />
              </div>
              <button className="btn btn-primary btn-full" onClick={saveSettings} disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .staff-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px; background: var(--card2);
          border: 1px solid var(--border); border-radius: var(--radius2); margin-bottom: 7px;
        }
        .user-avatar-sm {
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--amber-dim); border: 1px solid var(--amber-glow);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; color: var(--amber); font-weight: 700; flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

// ===== TRANSACTIONS PAGE =====
export const TransactionsPage = () => {
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => { fetchOrders(); }, [dateFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await orderAPI.getAll({ date: dateFilter, limit: 200 });
      setOrders(data.orders);
    } catch { toast.error("Failed to load transactions"); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    const headers = ["Order ID", "Table", "Items", "Subtotal", "Total", "Payment", "Status", "Time", "Cashier"];
    const rows = orders.map((o) => [
      o.orderId, o.tableNumber || o.orderType,
      o.items.map((i) => `${i.name}x${i.qty}`).join(";"),
      o.subtotal, o.total, o.paymentMethod, o.paymentStatus,
      new Date(o.createdAt).toLocaleString(), o.cashierName,
    ]);
    const csv  = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `txn-${dateFilter}.csv`; a.click();
    toast.success("Exported!");
  };

  const paid     = orders.filter((o) => o.paymentStatus === "paid");
  const totalRev = paid.reduce((s, o) => s + o.total, 0);
  const cashRev  = paid.filter((o) => o.paymentMethod === "cash").reduce((s, o) => s + o.total, 0);
  const qrRev    = paid.filter((o) => o.paymentMethod === "qr").reduce((s, o) => s + o.total, 0);
  const unpaid   = orders.filter((o) => o.paymentStatus === "unpaid").reduce((s, o) => s + o.total, 0);

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2 className="page-title">Transactions</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="date" className="form-control" value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)} style={{ width: "auto" }} />
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>&#8595; CSV</button>
        </div>
      </div>

      <div className="stats-grid mb-24" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {[
          { label: "Collected", val: totalRev, cls: "" },
          { label: "Cash",      val: cashRev,  cls: "green" },
          { label: "QR/eSewa",  val: qrRev,    cls: "blue" },
          { label: "Unpaid",    val: unpaid,    cls: "red" },
        ].map((c) => (
          <div key={c.label} className={`stat-card ${c.cls}`}>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value mono" style={{ fontSize: 20 }}>Rs. {c.val.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        {loading ? (
          <div className="flex-center" style={{ padding: 40 }}><div className="spinner" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th><th>Table</th><th>Amount</th>
                <th>Method</th><th>Status</th><th>Time</th><th>Cashier</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--text3)", padding: 30 }}>
                    No transactions
                  </td>
                </tr>
              ) : orders.map((o) => (
                <tr key={o._id}>
                  <td><span style={{ fontFamily: "DM Mono", fontSize: 11, color: "var(--amber)" }}>{o.orderId}</span></td>
                  <td>{o.tableNumber ? `T${o.tableNumber}` : o.orderType}</td>
                  <td><span style={{ fontFamily: "DM Mono", color: "var(--amber)", fontWeight: 600 }}>Rs. {o.total.toLocaleString()}</span></td>
                  <td><span className={`badge badge-${o.paymentMethod}`}>{o.paymentMethod?.toUpperCase()}</span></td>
                  <td><span className={`badge badge-${o.paymentStatus}`}>{o.paymentStatus?.toUpperCase()}</span></td>
                  <td style={{ fontSize: 11, fontFamily: "DM Mono", color: "var(--text3)" }}>{new Date(o.createdAt).toLocaleTimeString()}</td>
                  <td style={{ fontSize: 12, color: "var(--text3)" }}>{o.cashierName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
