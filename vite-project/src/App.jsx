// App.jsx
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import Register from "./register";
import Login from "./login";
import Dashboard from "./Dashboard";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import DealerLogin from "./DealerLogin";
import DealerRegister from "./DealerRegister";
import DealerDashboard from "./DealerDashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dealer" element={<Navigate to="/dealer/login" replace />} />
        <Route path="/dealer/login" element={<DealerLogin />} />
        <Route path="/dealer/register" element={<DealerRegister />} />
        <Route path="/dealer/dashboard" element={<DealerDashboard />} />
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
