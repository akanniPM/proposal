import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "/api";

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Auth
export const register = (data) => api.post("/auth/register", data);
export const login = (data) => api.post("/auth/login", data);

// Proposals
export const generateProposal = (data) => api.post("/proposals/generate", data);
export const getProposals = (page = 1, limit = 20) => api.get(`/proposals?page=${page}&limit=${limit}`);
export const getProposal = (id) => api.get(`/proposals/${id}`);
export const updateProposal = (id, data) => api.put(`/proposals/${id}`, data);
export const deleteProposal = (id) => api.delete(`/proposals/${id}`);
export const sendProposal = (id) => api.post(`/proposals/${id}/send`);
export const refineSection = (id, data) => api.post(`/proposals/${id}/refine`, data);

// Invoices
export const createInvoiceFromProposal = (proposalId, data) =>
  api.post(`/invoices/from-proposal/${proposalId}`, data);
export const createInvoice = (data) => api.post("/invoices", data);
export const getInvoices = (page = 1, limit = 20) => api.get(`/invoices?page=${page}&limit=${limit}`);
export const getInvoice = (id) => api.get(`/invoices/${id}`);
export const updateInvoice = (id, data) => api.put(`/invoices/${id}`, data);
export const sendInvoice = (id) => api.post(`/invoices/${id}/send`);

// Billing
export const createCheckout = (plan) => api.post("/billing/checkout", { plan });

export default api;
