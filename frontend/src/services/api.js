import axios from 'axios'

// Create axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API service functions
export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
}

export const customerService = {
  getAll: (params = {}) => api.get('/customers/', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers/', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  search: (query) => api.get(`/customers/search?q=${query}`)
}

export const articleService = {
  getAll: (params = {}) => api.get('/articles', { params }),
  getById: (id) => api.get(`/articles/${id}`),
  create: (data) => api.post('/articles', data),
  update: (id, data) => api.put(`/articles/${id}`, data),
  delete: (id) => api.delete(`/articles/${id}`),
  search: (query) => api.get(`/articles/search?q=${query}`),
  getStats: () => api.get('/articles/stats')
}

export const quoteService = {
  getAll: (params = {}) => api.get('/quotes', { params }),
  getById: (id) => api.get(`/quotes/${id}`),
  create: (data) => api.post('/quotes', data),
  update: (id, data) => api.put(`/quotes/${id}`, data),
  delete: (id) => api.delete(`/quotes/${id}`),
  convertToWorkOrder: (id) => api.post(`/quotes/${id}/convert-to-work-order`),
  getStats: () => api.get('/quotes/stats')
}

export const workOrderService = {
  getAll: (params = {}) => api.get('/work-orders', { params }),
  getById: (id) => api.get(`/work-orders/${id}`),
  create: (data) => api.post('/work-orders', data),
  update: (id, data) => api.put(`/work-orders/${id}`, data),
  delete: (id) => api.delete(`/work-orders/${id}`),
  complete: (id) => api.patch(`/work-orders/${id}/complete`),
  getStats: () => api.get('/work-orders/stats')
}

export const invoiceService = {
  getAll: (params = {}) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  createFromWorkOrders: (workOrderIds) => api.post('/invoices/from-work-orders', { work_order_ids: workOrderIds }),
  getStats: () => api.get('/invoices/stats')
}

export const documentService = {
  getTemplates: () => api.get('/documents/templates'),
  generate: (templateType, entityId) => api.post('/documents/generate', { template_type: templateType, entity_id: entityId }),
  download: (documentId) => api.get(`/documents/download/${documentId}`, { responseType: 'blob' }),
  preview: (templateType) => api.post(`/documents/preview/${templateType}`)
}

export const excelService = {
  exportCustomers: () => api.get('/excel/customers/export', { responseType: 'blob' }),
  importCustomers: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/excel/customers/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  exportArticles: () => api.get('/excel/articles/export', { responseType: 'blob' }),
  importArticles: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/excel/articles/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getCustomerTemplate: () => api.get('/excel/templates/customers', { responseType: 'blob' }),
  getArticleTemplate: () => api.get('/excel/templates/articles', { responseType: 'blob' })
}

export const companyService = {
  getAll: () => api.get('/companies'),
  getById: (id) => api.get(`/companies/${id}`),
  update: (id, data) => api.put(`/companies/${id}`, data),
  getSettings: (id) => api.get(`/companies/${id}/settings`)
}

// Utility functions
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('nl-NL').format(new Date(date))
}

export const formatDateTime = (date) => {
  return new Intl.DateTimeFormat('nl-NL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

