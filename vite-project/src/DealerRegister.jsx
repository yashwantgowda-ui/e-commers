import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaBuilding, FaEnvelope, FaLock, FaPhoneAlt, FaStore, FaUser } from "react-icons/fa";
import { fetchApiWithFallback } from "./api";
import "./App.css";
import AuthShell from "./AuthShell";

function DealerRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
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

    const name = String(formData.name || "").trim();
    const email = String(formData.email || "").trim();
    const password = String(formData.password || "");
    const confirmPassword = String(formData.confirmPassword || "");

    if (!name || !email || !password) {
      setError("Name, email and password are required.");
      setIsLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setIsLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetchApiWithFallback(
        "/dealer/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            company: String(formData.company || "").trim(),
            phone: String(formData.phone || "").trim(),
            email,
            password,
          }),
        },
        2,
        400,
        7000
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || `Dealer registration failed (${res.status})`);
        setIsLoading(false);
        return;
      }

      if (data.token) {
        localStorage.setItem("dealer_token", data.token);
        if (data.dealer) localStorage.setItem("dealer_user", JSON.stringify(data.dealer));
        navigate("/dealer/dashboard");
      } else {
        navigate("/dealer/login");
      }
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
          <h1>Dealer Register</h1>
          <p>Create your dealer account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <FaUser className="input-icon" />
            <input
              name="name"
              placeholder="Dealer name"
              value={formData.name}
              onChange={onField}
              type="text"
            />
          </div>

          <div className="input-wrapper">
            <FaBuilding className="input-icon" />
            <input
              name="company"
              placeholder="Company (optional)"
              value={formData.company}
              onChange={onField}
              type="text"
            />
          </div>

          <div className="input-wrapper">
            <FaPhoneAlt className="input-icon" />
            <input
              name="phone"
              placeholder="Phone (optional)"
              value={formData.phone}
              onChange={onField}
              type="tel"
            />
          </div>

          <div className="input-wrapper">
            <FaEnvelope className="input-icon" />
            <input
              name="email"
              placeholder="Dealer email"
              value={formData.email}
              onChange={onField}
              type="email"
            />
          </div>

          <div className="input-wrapper">
            <FaLock className="input-icon" />
            <input
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={onField}
              type="password"
            />
          </div>

          <div className="input-wrapper">
            <FaLock className="input-icon" />
            <input
              name="confirmPassword"
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={onField}
              type="password"
            />
          </div>

          <button type="submit" className={isLoading ? "loading" : ""} disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="spinner" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Create Dealer Account</span>
                <FaStore className="btn-icon" />
              </>
            )}
          </button>
        </form>

        <p className="login-link">
          Already a dealer? <Link to="/dealer/login">Dealer Sign In</Link>
        </p>
        <p className="login-link">
          Customer register? <Link to="/register">User Register</Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default DealerRegister;
