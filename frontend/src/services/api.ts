import axios from "axios";

// Create Axios client with base configuration
const api = axios.create({
  baseURL: "/api", // Proxied locally to http://localhost:8000
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("stock_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authorization errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect if unauthorized
      localStorage.removeItem("stock_token");
      // Optional: window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
