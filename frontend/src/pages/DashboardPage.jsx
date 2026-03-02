import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../services/api';
import { Chart, registerables } from 'chart.js';
import toast from 'react-hot-toast';

Chart.register(...registerables);

const StatCard = ({ label, value, change, changeType, icon, colorClass }) => (
  <div className={`stat-card ${colorClass || ''}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-label">{label}</div>
    <div className="stat-value mono">{value}</div>
    {change && <div className={`stat-change ${changeType || 'neutral'}`}>{change}</div>}
  </div>
);

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const revenueRef = useRef(null);
  const paymentRef = useRef(null);
  const revenueChart = useRef(null);
  const paymentChart = useRef(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await orderAPI.getDashboard();
      setStats(data.stats);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!stats) return;
    renderCharts();
  }, [stats]);

  const renderCharts = () => {
    if (!stats) return;

    // Revenue chart
    if (revenueChart.current) revenueChart.current.destroy();
    if (revenueRef.current) {
      const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
      const hourlyMap = {};
      stats.hourlyData?.forEach(h => { hourlyMap[h._id] = h.revenue; });
      const data = hours.map((_, i) => hourlyMap[i] || 0);

      revenueChart.current = new Chart(revenueRef.current, {
        type: 'bar',
        data: {
          labels: hours.filter((_, i) => i >= 6 && i <= 22),
          datasets: [{
            label: 'Revenue (Rs.)',
            data: data.filter((_, i) => i >= 6 && i <= 22),
            backgroundColor: 'rgba(212,134,42,0.28)',
            borderColor: '#d4862a',
            borderWidth: 2,
            borderRadius: 5,
            hoverBackgroundColor: 'rgba(212,134,42,0.5)',
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#7a6a5a', font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#7a6a5a', font: { size: 10 }, callback: v => 'Rs.' + v } },
          },
        },
      });
    }

    // Payment chart
    if (paymentChart.current) paymentChart.current.destroy();
    if (paymentRef.current) {
      const cash = stats.today?.cashRevenue || 1;
      const qr = stats.today?.qrRevenue || 0;
      paymentChart.current = new Chart(paymentRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Cash', 'QR/eSewa'],
          datasets: [{
            data: [cash, qr],
            backgroundColor: ['rgba(76,175,136,0.7)', 'rgba(91,155,213,0.7)'],
            borderColor: ['#4caf88', '#5b9bd5'],
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom', labels: { color: '#b8a898', font: { size: 11 } } } },
          cutout: '65%',
        },
      });
    }
  };

  useEffect(() => {
    return () => {
      if (revenueChart.current) revenueChart.current.destroy();
      if (paymentChart.current) paymentChart.current.destroy();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: 300 }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  const t = stats?.today || {};
  const tables = stats?.tables || {};
  const revenueChange = parseFloat(t.revenueChange || 0);

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2 className="page-title">☕ Today's Overview</h2>
        <button className="btn btn-secondary btn-sm" onClick={fetchStats}>↻ Refresh</button>
      </div>

      <div className="stats-grid mb-24">
        <StatCard label="Today's Revenue" value={`Rs. ${(t.revenue || 0).toLocaleString()}`}
          change={`${revenueChange >= 0 ? '↑' : '↓'} ${Math.abs(revenueChange)}% vs yesterday`}
          changeType={revenueChange >= 0 ? 'up' : 'down'} icon="💰" />
        <StatCard label="Orders Today" value={t.orders || 0}
          change={`${t.unpaidOrders || 0} pending`} changeType="neutral" icon="📋" colorClass="green" />
        <StatCard label="Tables Occupied" value={`${tables.occupied || 0}/${tables.total || 0}`}
          change={`${tables.available || 0} available`} changeType="neutral" icon="🪑" colorClass="blue" />
        <StatCard label="Unpaid Bills" value={`Rs. ${(t.unpaidAmount || 0).toLocaleString()}`}
          change={`${t.unpaidOrders || 0} orders pending`} changeType="down" icon="💸" colorClass="red" />
        <StatCard label="Avg Order Value" value={`Rs. ${(t.avgOrderValue || 0).toLocaleString()}`}
          change="Per paid order today" changeType="neutral" icon="🏆" colorClass="purple" />
        <StatCard label="Paid Bills" value={`Rs. ${(t.revenue || 0).toLocaleString()}`}
          change={`${t.paidOrders || 0} orders paid`} changeType="up" icon="✅" />
      </div>

      <div className="charts-row mb-24">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue Overview</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Hourly sales today</div>
            </div>
          </div>
          <canvas ref={revenueRef} style={{ maxHeight: 220 }} />
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Payment Split</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Cash vs QR</div>
            </div>
          </div>
          <canvas ref={paymentRef} style={{ maxHeight: 220 }} />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title mb-16" style={{ marginBottom: 14 }}>🏆 Top Selling Items</div>
          {stats?.topItems?.length > 0 ? stats.topItems.map((item, i) => (
            <div key={item._id} className="top-item-row">
              <span className="rank">#{i + 1}</span>
              <span style={{ fontSize: 18 }}>{item.emoji}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{item.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'DM Mono' }}>{item.totalQty}x</span>
              <span style={{ fontFamily: 'DM Mono', fontSize: 13, color: 'var(--amber)' }}>Rs.{(item.totalRevenue || 0).toLocaleString()}</span>
            </div>
          )) : <div className="empty-state"><p>No sales data yet</p></div>}
        </div>
        <div className="card">
          <div className="card-title mb-16" style={{ marginBottom: 14 }}>📊 Table Status</div>
          {[
            { label: 'Available', count: tables.available || 0, color: 'var(--green)', pct: tables.total ? Math.round((tables.available || 0) / tables.total * 100) : 0 },
            { label: 'Occupied', count: tables.occupied || 0, color: 'var(--amber)', pct: tables.total ? Math.round((tables.occupied || 0) / tables.total * 100) : 0 },
            { label: 'Reserved', count: tables.reserved || 0, color: 'var(--blue)', pct: tables.total ? Math.round((tables.reserved || 0) / tables.total * 100) : 0 },
            { label: 'Needs Cleaning', count: tables.dirty || 0, color: 'var(--red)', pct: tables.total ? Math.round((tables.dirty || 0) / tables.total * 100) : 0 },
          ].map(row => (
            <div key={row.label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 5 }}>
                <span style={{ color: row.color }}>{row.label}</span>
                <span>{row.count} tables ({row.pct}%)</span>
              </div>
              <div style={{ height: 6, background: 'var(--border2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: 3, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          ))}
          <div className="divider" />
          <Link to="/tables" className="btn btn-secondary btn-sm btn-full">View Tables →</Link>
        </div>
      </div>

      <style>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 14px;
        }
        .charts-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 14px;
        }
        .top-item-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 0;
          border-bottom: 1px solid var(--border);
        }
        .top-item-row:last-child { border-bottom: none; }
        .rank {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: var(--amber);
          font-weight: 700;
          width: 22px;
        }
        @media (max-width: 900px) {
          .charts-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;