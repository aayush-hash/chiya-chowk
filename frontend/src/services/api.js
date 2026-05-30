import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: VITE_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Network error';
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (status === 429) {
      toast.error('Too many requests. Please wait a moment.', { id: 'rate-limit' });
      return Promise.reject(error);
    }

    if (status === 423) {
      toast.error(message, { duration: 5000 });
      return Promise.reject(error);
    }

    if (status >= 500) {
      toast.error('Server error. Please try again.', { id: 'server-error' });
    }

    return Promise.reject({ ...error, message });
  }
);

// ===== AUTH =====
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ===== MENU =====
export const menuAPI = {
  getAll: (params) => api.get('/menu', { params }),
  getById: (id) => api.get(`/menu/${id}`),
  create: (data) => api.post('/menu', data),
  update: (id, data) => api.put(`/menu/${id}`, data),
  toggle: (id) => api.patch(`/menu/${id}/toggle`),
  delete: (id) => api.delete(`/menu/${id}`),
  getCategories: () => api.get('/menu/categories'),
};

// ===== ORDERS =====
export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  addItems: (id, data) => api.post(`/orders/${id}/add-items`, data),
  create: (data) => api.post('/orders', data),
  markPaid: (id, data) => api.put(`/orders/${id}/pay`, data),
    partialPay: (id, data) => api.put(`/orders/${id}/partial-pay`, data),   // ← ADD THIS
  updateCustomer: (id, data) => api.put(`/orders/${id}/customer`, data),
  cancel: (id, data) => api.put(`/orders/${id}/cancel`, data),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  getDashboard: () => api.get('/orders/stats/dashboard'),
  getReport: (params) => api.get('/orders/stats/report', { params }),
};

// ===== TABLES =====
export const tableAPI = {
  getAll: (params) => api.get('/tables', { params }),
  getById: (id) => api.get(`/tables/${id}`),
  create: (data) => api.post('/tables', data),
  update: (id, data) => api.put(`/tables/${id}`, data),
  setStatus: (id, data) => api.patch(`/tables/${id}/status`, data),
  clear: (id) => api.patch(`/tables/${id}/clear`),
  delete: (id) => api.delete(`/tables/${id}`),
};

// ===== USERS / ADMIN =====
export const userAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data),
  getSettings: () => api.get('/users/settings'),
  updateSettings: (data) => api.put('/users/settings', data),
};

export default api;
