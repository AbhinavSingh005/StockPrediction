import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Verify from "./pages/Verify";
import Dashboard from "./pages/Dashboard";
import Portfolio from "./pages/Portfolio";
import Predictions from "./pages/Predictions";
import Screener from "./pages/Screener";
import Transactions from "./pages/Transactions";
import StockDetails from "./pages/StockDetails";

// Private Route Guard
function PrivateRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Private dashboard routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="predictions" element={<Predictions />} />
          <Route path="screener" element={<Screener />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="stock/:ticker" element={<StockDetails />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
