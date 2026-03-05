import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaMobileAlt,
  FaSearch,
  FaShieldAlt,
  FaSignInAlt,
  FaStore,
} from "react-icons/fa";
import "./AuthShell.css";

function normalizePath(pathname) {
  const raw = String(pathname || "");
  if (!raw || raw === "/") return "/register";
  return raw;
}

function AuthShell({ children, hideHeader = false }) {
  const location = useLocation();
  const currentPath = normalizePath(location?.pathname);

  const navLinks = useMemo(
    () => [
      { to: "/login", label: "Sign in", Icon: FaSignInAlt },
      { to: "/dealer/login", label: "Dealer", Icon: FaStore },
      { to: "/admin/login", label: "Admin", Icon: FaShieldAlt },
    ],
    []
  );

  return (
    <div className={`dashboard auth-dashboard ${hideHeader ? "auth-headerless" : ""}`}>
      {!hideHeader && (
        <nav className="top-nav auth-top-nav">
          <div className="nav-container">
            <div className="nav-left">
              <Link className="logo" to="/register">
                <span className="logo-icon">
                  <FaMobileAlt />
                </span>
                <span className="logo-text">
                  Phone<span>Hub</span>
                </span>
              </Link>
            </div>

            <div className="nav-center">
              <form
                className="search-bar auth-search"
                onSubmit={(e) => e.preventDefault()}
                role="search"
              >
                <input type="text" placeholder="Search phones..." disabled />
                <button type="button" className="search-btn" aria-label="Search" disabled>
                  <FaSearch />
                </button>
              </form>
            </div>

            <div className="nav-right">
              {navLinks.map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  className={`nav-icon-btn auth-nav-icon ${normalizePath(to) === currentPath ? "active" : ""}`}
                  to={to}
                  aria-label={label}
                  title={label}
                >
                  <Icon />
                </Link>
              ))}
            </div>
          </div>
        </nav>
      )}

      <div className="auth-layout">
        <main className="auth-main">{children}</main>
      </div>
    </div>
  );
}

export default AuthShell;
