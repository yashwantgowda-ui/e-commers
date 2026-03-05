import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaShieldAlt } from "react-icons/fa";
import { clearAdminApiCache, fetchAdminApi, probeBackendHealth } from "./adminApi";
import "./App.css";
import AuthShell from "./AuthShell";

function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginRequest = () =>
    fetchAdminApi(
      "/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: formData.identifier,
          password: formData.password,
        }),
      },
      1,
      250,
      7000
    );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!formData.identifier || !formData.password) {
      setError("Please enter admin username/email and password");
      setIsLoading(false);
      return;
    }

    try {
      let res = await loginRequest();
      if (res.status === 404) {
        clearAdminApiCache();
        res = await loginRequest();
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || `Admin login failed (${res.status})`);
        setIsLoading(false);
        return;
      }

      if (data.token) localStorage.setItem("admin_token", data.token);
      if (data.admin) localStorage.setItem("admin_user", JSON.stringify(data.admin));

      navigate("/admin/dashboard");
    } catch (err) {
      const isTimeout =
        String(err?.name || "") === "AbortError" ||
        /timeout|abort/i.test(String(err?.message || ""));
      if (!isTimeout) {
        setError("Admin server is not reachable. Please check backend and try again.");
      } else {
        const health = await probeBackendHealth(2000);
        if (!health.reachable) {
          setError("Backend is not running on port 5001. Run .\\start.cmd and retry.");
        } else {
          setError(
            "Backend is up but admin login is blocked. Restart backend and ensure MongoDB is running."
          );
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="card">
        <div className="card-header">
          <FaShieldAlt className="header-icon" />
          <h1>Admin Login</h1>
          <p>Manage products, inventory and catalog visibility</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <FaEnvelope className="input-icon" />
            <input
              name="identifier"
              placeholder="Username or email"
              type="text"
              value={formData.identifier}
              onChange={handleChange}
            />
          </div>

          <div className="input-wrapper">
            <FaLock className="input-icon" />
            <input
              name="password"
              placeholder="Password"
              type="password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className={isLoading ? "loading" : ""} disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="spinner" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Admin Sign In</span>
                <FaShieldAlt className="btn-icon" />
              </>
            )}
          </button>
        </form>

        <p className="login-link">
          Customer login? <Link to="/login">Go to User Login</Link>
        </p>
        <p className="login-link">
          Dealer login? <Link to="/dealer/login">Go to Dealer Login</Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default AdminLogin;
