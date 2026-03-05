import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./App.css";
import { fetchApiWithFallback } from "./api";
import { FaEnvelope, FaLock, FaMobileAlt } from 'react-icons/fa';
import AuthShell from "./AuthShell";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please fill in email and password");
      setIsLoading(false);
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetchApiWithFallback("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      }, 2, 400, 7000);

      let data = {};
      const contentType = res.headers.get("content-type");
      
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch (parseError) {
          setError("Server returned invalid response. Check backend logs.");
          setIsLoading(false);
          return;
        }
      } else {
        const text = await res.text();
        setError(`Server error (${res.status}). ${text.substring(0, 100)}`);
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.message || `Login failed (${res.status})`);
        setIsLoading(false);
        return;
      }

      if (data.token) localStorage.setItem("token", data.token);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(
        "Server is not reachable. Please make sure backend is running and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell hideHeader>
      <div className="card">
        <div className="card-header">
          <FaMobileAlt className="header-icon" />
          <h1>PhoneHub Login</h1>
          <p>Sign in to manage orders, wishlist and profile</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <FaEnvelope className="input-icon" />
            <input 
              name="email"
              placeholder="Email" 
              value={formData.email}
              onChange={handleChange}
              type="email"
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

          <button 
            type="submit" 
            className={isLoading ? 'loading' : ''}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <FaMobileAlt className="btn-icon" />
              </>
            )}
          </button>

        </form>

        <p className="login-link">
          New customer? <Link to="/">Create Account</Link>
        </p>
        <p className="login-link">
          Admin? <Link to="/admin/login">Admin Login</Link>
        </p>
        <p className="login-link">
          Dealer? <Link to="/dealer/login">Dealer Login</Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default Login;
