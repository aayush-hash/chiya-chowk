import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // ✅ Initialize user safely from localStorage
  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(false);

  // ✅ Login function
  const login = useCallback(async (username, password) => {
    try {
      setLoading(true);

      const { data } = await authAPI.login({
        username,
        password,
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setUser(data.user);

      toast.success("Login successful");

      return data.user;
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Login failed"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Logout function
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {}

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);

    toast.success("Logged out successfully");
  }, []);

  // ✅ Role helpers
  const isAdmin = user?.role === "admin";
  const isManager = ["admin", "manager"].includes(user?.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        isAdmin,
        isManager,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx;
};