// Add this to frontend/src/services/api.js
// (paste inside the existing api.js file after the userAPI block)

export const inventoryAPI = {
  getAll: (params) => api.get('/inventory', { params }),
  getById: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  restock: (id, data) => api.post(`/inventory/${id}/restock`, data),
  adjust: (id, data) => api.patch(`/inventory/${id}/adjust`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
  getTodayUsage: () => api.get('/inventory/stats/today'),
  getReport: (params) => api.get('/inventory/stats/report', { params }),
  getMenuItemsForLinking: () => api.get('/inventory/menu-items'),
};