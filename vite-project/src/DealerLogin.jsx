import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaStore } from "react-icons/fa";
import { fetchApiWithFallback } from "./api";
import "./App.css";
import AuthShell from "./AuthShell";

function DealerLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const onField = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const email = String(formData.email || "").trim();
    const password = String(formData.password || "");
    if (!email || !password) {
      setError("Please enter email and password.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetchApiWithFallback(
        "/dealer/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
        2,
        400,
        7000
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || `Dealer login failed (${res.status})`);
        setIsLoading(false);
        return;
      }

      if (data.token) localStorage.setItem("dealer_token", data.token);
      if (data.dealer) localStorage.setItem("dealer_user", JSON.stringify(data.dealer));
      navigate("/dealer/dashboard");
    } catch (_e) {
      setError("Server is not reachable. Please start backend and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="card">
        <div className="card-header">
          <FaStore className="header-icon" />
          <h1>Dealer Login</h1>
          <p>Sign in to manage your dealer account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <FaEnvelope className="input-icon" />
            <input
              name="email"
              placeholder="Dealer email"
              type="email"
              value={formData.email}
              onChange={onField}
            />
          </div>

          <div className="input-wrapper">
            <FaLock className="input-icon" />
            <input
              name="password"
              placeholder="Password"
              type="password"
              value={formData.password}
              onChange={onField}
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
                <span>Dealer Sign In</span>
                <FaStore className="btn-icon" />
              </>
            )}
          </button>
        </form>

        <p className="login-link">
          New dealer? <Link to="/dealer/register">Create Dealer Account</Link>
        </p>
        <p className="login-link">
          Customer login? <Link to="/login">User Login</Link>
        </p>
        <p className="login-link">
          Admin login? <Link to="/admin/login">Admin Login</Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default DealerLogin;
