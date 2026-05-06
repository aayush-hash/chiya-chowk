import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import { AuthProvider, useAuth } from "./context/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import KitchenPage from "./pages/KitchenPage";
import LoginPage from "./pages/LoginPage";
import MenuPage from "./pages/MenuPage";
import POSPage from "./pages/POSPage";
import QRMenuPage from "./pages/QRMenuPage";
import {
  AdminPage,
  ReportsPage,
  TransactionsPage,
} from "./pages/ReportsAdminPage";
import { TablesPage, OrdersPage} from "./pages/TablesOrdersPage";
import "./styles/globals.css";

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ width: 40, height: 40 }} />
        <p style={{ color: "var(--text3)", fontSize: 14 }}>Loading...</p>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role))
    return <Navigate to="/dashboard" replace />;
  return children;
};

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-wrapper">
        <Topbar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="content-area">
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pos"
              element={
                <ProtectedRoute>
                  <POSPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tables"
              element={
                <ProtectedRoute>
                  <TablesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/menu"
              element={
                <ProtectedRoute roles={["admin", "manager"]}>
                  <MenuPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute roles={["admin", "manager"]}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <TransactionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <InventoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kitchen"
              element={
                <ProtectedRoute>
                  <KitchenPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1c1814",
              color: "#f0e8dc",
              border: "1px solid #3d332c",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
            },
            success: {
              iconTheme: { primary: "#4caf88", secondary: "#0d0a08" },
            },
            error: { iconTheme: { primary: "#e05c5c", secondary: "#0d0a08" } },
          }}
        />
        <Routes>
          {/* PUBLIC — customer QR ordering page, no login needed */}
          <Route path="/menu/:token" element={<QRMenuPage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRouteWrapper>
                <AppLayout />
              </ProtectedRouteWrapper>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

const ProtectedRouteWrapper = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default App;
