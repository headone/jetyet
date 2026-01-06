import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Login } from "@/pages/Login";
import { Nodes } from "@/pages/Nodes";
import { Users } from "@/pages/Users";
import { Dashboard } from "@/pages/Dashboard";
import { Settings } from "@/pages/Settings";
import "./index.css";

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuth = !!localStorage.getItem("authToken");
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    // { label: "Dashboard", href: "/dashboard" },
    { label: "Users", href: "/users" },
    { label: "Nodes", href: "/nodes" },
    // { label: "Settings", href: "/settings" },
  ];

  return <Layout navItems={navItems}>{children}</Layout>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route index element={<Navigate to="/users" replace />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="nodes"
          element={
            <ProtectedRoute>
              <Nodes />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}
