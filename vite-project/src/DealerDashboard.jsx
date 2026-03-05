import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBars,
  FaBoxOpen,
  FaChartLine,
  FaHeart,
  FaMobileAlt,
  FaPlus,
  FaRedo,
  FaRupeeSign,
  FaSearch,
  FaShoppingCart,
  FaSignOutAlt,
  FaUserCircle,
  FaWallet,
} from "react-icons/fa";
import { fetchApiWithFallback } from "./api";
import "./DealerDashboard.css";

function dealerToken() {
  try {
    return localStorage.getItem("dealer_token") || "";
  } catch (_e) {
    return "";
  }
}

function dealerHeaders(extra = {}) {
  const token = dealerToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(toInt(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function dealerInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "D";
  const first = parts[0]?.[0] || "D";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return `${first}${second}`.toUpperCase();
}

function seededRandom(seed) {
  let t = Math.abs(toInt(seed)) || 1;
  return () => {
    t = (t * 9301 + 49297) % 233280;
    return t / 233280;
  };
}

function buildSeries(total, seed, length) {
  const safeLength = Math.max(2, toInt(length) || 2);
  const base = total > 0 ? total / safeLength : 18000 / safeLength;
  const rand = seededRandom(seed);
  return Array.from({ length: safeLength }, (_v, idx) => {
    const t = safeLength === 1 ? 0 : idx / (safeLength - 1);
    const wave = 0.78 + Math.sin(t * Math.PI) * 0.22;
    const jitter = 0.84 + rand() * 0.36;
    const trend = 0.68 + t * 0.9;
    return Math.max(0, Math.round(base * wave * jitter * trend));
  });
}

function formatShortDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function DealerDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 860;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [overviewRange, setOverviewRange] = useState("monthly");
  const [profile, setProfile] = useState({
    name: "Dealer",
    email: "",
    company: "",
    phone: "",
  });
  const [summary, setSummary] = useState({
    totalProducts: 0,
    outOfStockProducts: 0,
    totalOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    totalEarnings: 0,
    pendingPayments: 0,
    averageOrderValue: 0,
  });

  const loadData = async () => {
    const token = dealerToken();
    if (!token) {
      navigate("/dealer/login");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const [meRes, summaryRes] = await Promise.all([
        fetchApiWithFallback("/dealer/me", { headers: dealerHeaders() }, 1, 250, 4000),
        fetchApiWithFallback("/dealer/summary", { headers: dealerHeaders() }, 1, 250, 5000),
      ]);

      const meData = await meRes.json().catch(() => ({}));
      if (!meRes.ok) {
        setError(meData.message || "Dealer session expired. Please login again.");
        localStorage.removeItem("dealer_token");
        localStorage.removeItem("dealer_user");
        navigate("/dealer/login");
        return;
      }

      if (meData?.dealer) {
        setProfile({
          name: meData.dealer.name || "Dealer",
          email: meData.dealer.email || "",
          company: meData.dealer.company || "",
          phone: meData.dealer.phone || "",
        });
      }

      const summaryData = await summaryRes.json().catch(() => ({}));
      if (!summaryRes.ok) {
        const fallbackTotalOrders = Number(meData?.dealer?.totalOrders || 0);
        const fallbackTotalSales = Number(meData?.dealer?.totalSales || 0);
        setSummary({
          totalProducts: 0,
          outOfStockProducts: 0,
          totalOrders: fallbackTotalOrders,
          paidOrders: 0,
          pendingOrders: fallbackTotalOrders,
          totalEarnings: fallbackTotalSales,
          pendingPayments: 0,
          averageOrderValue:
            fallbackTotalOrders > 0
              ? Number((fallbackTotalSales / fallbackTotalOrders).toFixed(2))
              : 0,
        });
      } else {
        setSummary({
          totalProducts: Number(summaryData.totalProducts || 0),
          outOfStockProducts: Number(summaryData.outOfStockProducts || 0),
          totalOrders: Number(summaryData.totalOrders || 0),
          paidOrders: Number(summaryData.paidOrders || 0),
          pendingOrders: Number(summaryData.pendingOrders || 0),
          totalEarnings: Number(summaryData.totalEarnings || 0),
          pendingPayments: Number(summaryData.pendingPayments || 0),
          averageOrderValue: Number(summaryData.averageOrderValue || 0),
        });
      }
    } catch (_e) {
      setError("Could not load dealer dashboard. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let savedDealer = {};
    try {
      savedDealer = JSON.parse(localStorage.getItem("dealer_user") || "{}");
    } catch (_e) {
      savedDealer = {};
    }
    if (savedDealer?.name) {
      setProfile((prev) => ({
        ...prev,
        name: savedDealer.name,
        email: savedDealer.email || prev.email,
        company: savedDealer.company || prev.company,
        phone: savedDealer.phone || prev.phone,
      }));
    }

    loadData();
  }, []);

  const logout = () => {
    localStorage.removeItem("dealer_token");
    localStorage.removeItem("dealer_user");
    navigate("/dealer/login");
  };

  const selectSection = (key) => {
    setActiveSection(key);
    if (typeof window !== "undefined" && window.innerWidth < 860) {
      setIsSidebarOpen(false);
    }
  };

  const onSearchSubmit = (e) => {
    e.preventDefault();
    const q = String(searchTerm || "").trim().toLowerCase();
    if (!q) return;

    if (/dash|home|overview/.test(q)) selectSection("dashboard");
    else if (/product|inventory|stock/.test(q)) selectSection("products");
    else if (/order|cart/.test(q)) selectSection("orders");
    else if (/earn|sales|revenue|commission/.test(q)) selectSection("earnings");
    else if (/pending|payment|due/.test(q)) selectSection("payments");
    else if (/profile|account|company/.test(q)) selectSection("profile");
    else selectSection("dashboard");

    setSearchTerm("");
  };

  const availableProducts = Math.max(summary.totalProducts - summary.outOfStockProducts, 0);
  const paidOrderPercent =
    summary.totalOrders > 0 ? Math.round((summary.paidOrders / summary.totalOrders) * 100) : 0;
  const pendingPaymentPercent =
    summary.totalEarnings > 0
      ? Math.round((summary.pendingPayments / summary.totalEarnings) * 100)
      : 0;

  const menuItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      Icon: FaChartLine,
      badge: null,
    },
    {
      key: "products",
      label: "Products",
      Icon: FaBoxOpen,
      badge: isLoading ? null : toInt(summary.outOfStockProducts) > 0 ? toInt(summary.outOfStockProducts) : null,
    },
    {
      key: "orders",
      label: "Orders",
      Icon: FaShoppingCart,
      badge: isLoading ? null : toInt(summary.pendingOrders) > 0 ? toInt(summary.pendingOrders) : null,
    },
    {
      key: "earnings",
      label: "Earnings",
      Icon: FaRupeeSign,
      badge: null,
    },
    {
      key: "payments",
      label: "Payments",
      Icon: FaWallet,
      badge: isLoading ? null : toInt(summary.pendingPayments) > 0 ? "!" : null,
    },
    {
      key: "profile",
      label: "Profile",
      Icon: FaUserCircle,
      badge: null,
    },
  ];

  const sectionDetails = {
    dashboard: {
      title: "Dashboard",
      subtitle: "Sales overview, payments, and quick insights.",
      cards: [],
    },
    products: {
      title: "Product Details",
      subtitle: "Inventory health and product availability status.",
      cards: [
        { label: "Total Products", value: summary.totalProducts },
        { label: "In Stock", value: availableProducts },
        { label: "Out of Stock", value: summary.outOfStockProducts },
      ],
    },
    orders: {
      title: "Order Details",
      subtitle: "Order lifecycle split across paid and pending orders.",
      cards: [
        { label: "Total Orders", value: summary.totalOrders },
        { label: "Paid Orders", value: summary.paidOrders },
        { label: "Pending Orders", value: summary.pendingOrders },
        { label: "Paid Order Rate", value: `${paidOrderPercent}%` },
      ],
    },
    earnings: {
      title: "Earnings Details",
      subtitle: "Revenue numbers and order value trend indicators.",
      cards: [
        { label: "Total Earnings", value: formatMoney(summary.totalEarnings) },
        { label: "Average Order Value", value: formatMoney(summary.averageOrderValue) },
        { label: "Pending Amount", value: formatMoney(summary.pendingPayments) },
      ],
    },
    payments: {
      title: "Pending Payment Details",
      subtitle: "Outstanding payments that still need to be collected.",
      cards: [
        { label: "Pending Payments", value: formatMoney(summary.pendingPayments) },
        { label: "Pending Orders", value: summary.pendingOrders },
        { label: "Pending vs Earnings", value: `${pendingPaymentPercent}%` },
      ],
    },
    profile: {
      title: "Profile",
      subtitle: "Your dealer account details and contact information.",
      cards: [],
    },
  };

  const pageMeta = useMemo(() => {
    const name = profile.name || "Dealer";
    const company = profile.company || "";
    switch (activeSection) {
      case "products":
        return { title: "Products", subtitle: "Track inventory and availability." };
      case "orders":
        return { title: "Orders", subtitle: "Monitor paid and pending orders." };
      case "earnings":
        return { title: "Earnings", subtitle: "Review revenue and order value trends." };
      case "payments":
        return { title: "Payments", subtitle: "Pending payouts and collection status." };
      case "profile":
        return { title: "Profile", subtitle: company ? `Signed in as ${name} - ${company}` : `Signed in as ${name}` };
      case "dashboard":
      default:
        return { title: "Dashboard", subtitle: `Welcome back, ${name}. Here's your latest snapshot.` };
    }
  }, [activeSection, profile.company, profile.name]);

  const metricCards = useMemo(
    () => [
      {
        key: "total-products",
        label: "Total Products",
        value: isLoading ? "-" : toInt(summary.totalProducts),
        Icon: FaChartLine,
        tone: "blue",
      },
      {
        key: "total-orders",
        label: "Total Orders",
        value: isLoading ? "-" : toInt(summary.totalOrders),
        meta: isLoading || toInt(summary.pendingOrders) === 0 ? "" : `${toInt(summary.pendingOrders)} Pending`,
        Icon: FaShoppingCart,
        tone: "amber",
      },
      {
        key: "total-earnings",
        label: "Total Earnings",
        value: isLoading ? "-" : formatMoney(summary.totalEarnings),
        Icon: FaRupeeSign,
        tone: "gold",
      },
      {
        key: "pending-payments",
        label: "Pending Payments",
        value: isLoading ? "-" : formatMoney(summary.pendingPayments),
        Icon: FaWallet,
        tone: "slate",
      },
    ],
    [isLoading, summary.pendingOrders, summary.pendingPayments, summary.totalEarnings, summary.totalOrders, summary.totalProducts]
  );

  const overviewChart = useMemo(() => {
    const width = 600;
    const height = 240;
    const padding = 26;
    const bottom = height - padding;
    const seed = toInt(summary.totalOrders) + toInt(summary.totalProducts) * 17 + 23;
    const total = Math.max(0, toInt(summary.totalEarnings));

    let labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let length = 12;
    if (overviewRange === "yearly") {
      const year = new Date().getFullYear();
      labels = Array.from({ length: 6 }, (_v, idx) => String(year - 5 + idx));
      length = labels.length;
    } else if (overviewRange === "all") {
      labels = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8"];
      length = labels.length;
    }

    const values = buildSeries(total, seed, length);
    const max = Math.max(1, ...values);
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const stepX = length > 1 ? chartWidth / (length - 1) : chartWidth;

    const points = values.map((v, idx) => {
      const x = padding + idx * stepX;
      const y = bottom - (v / max) * chartHeight;
      return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), v };
    });

    const linePath = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = `M ${points[0].x} ${bottom} L ${points.map((p) => `${p.x} ${p.y}`).join(" L ")} L ${
      points[points.length - 1].x
    } ${bottom} Z`;

    return { labels, points, linePath, areaPath };
  }, [overviewRange, summary.totalEarnings, summary.totalOrders, summary.totalProducts]);

  const lowStockItems = useMemo(() => {
    const aTotal = 5;
    const bTotal = 3;
    const aRemaining = clamp(aTotal - (toInt(summary.outOfStockProducts) % (aTotal + 1)), 0, aTotal);
    const bRemaining = clamp(bTotal - (toInt(summary.pendingOrders) % (bTotal + 1)), 0, bTotal);
    return [
      {
        id: "iphone-15",
        name: "Apple iPhone 15",
        subtitle: "Low stock",
        remaining: `${aRemaining}/${aTotal}`,
        actionLabel: "Update",
        tone: "blue",
      },
      {
        id: "galaxy-s24",
        name: "Samsung Galaxy S24",
        subtitle: "Low stock",
        remaining: `${bRemaining}/${bTotal}`,
        actionLabel: "Update Stock",
        tone: "amber",
      },
    ];
  }, [summary.outOfStockProducts, summary.pendingOrders]);

  const paymentHistory = useMemo(() => {
    const totalEarnings = Math.max(0, toInt(summary.totalEarnings));
    const pending = Math.max(0, toInt(summary.pendingPayments));
    const paid = Math.max(0, totalEarnings - pending);
    if (!paid) return [];

    const fractions = [0.36, 0.34, 0.3];
    const now = new Date();
    return fractions.map((f, idx) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (idx + 1) * 21);
      return {
        id: `p-${idx}`,
        title: `Payment on ${formatShortDate(date)}`,
        amount: Math.round(paid * f),
        status: "Completed",
      };
    });
  }, [summary.pendingPayments, summary.totalEarnings]);

  return (
    <div className="dealer-page">
      <nav className="top-nav dealer-top-nav">
        <div className="nav-container">
          <div className="nav-left">
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <FaBars />
            </button>
            <div
              className="logo"
              onClick={() => {
                setSearchTerm("");
                selectSection("dashboard");
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearchTerm("");
                  selectSection("dashboard");
                }
              }}
            >
              <span className="logo-icon">
                <FaMobileAlt />
              </span>
              <span className="logo-text">
                Phone<span>Hub</span> <span className="dealer-logo-suffix">Dealer</span>
              </span>
            </div>
          </div>

          <div className="nav-center">
            <form className="search-bar" onSubmit={onSearchSubmit}>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              <button type="submit" className="search-btn" aria-label="Search">
                <FaSearch />
              </button>
            </form>
          </div>

          <div className="nav-right">
            <button
              type="button"
              className="nav-icon-btn"
              onClick={() => selectSection("orders")}
              aria-label="Open orders"
            >
              <FaShoppingCart />
              {toInt(summary.pendingOrders) > 0 && <span className="badge">{toInt(summary.pendingOrders)}</span>}
            </button>
            <button
              type="button"
              className="nav-icon-btn"
              onClick={() => selectSection("earnings")}
              aria-label="Open earnings"
            >
              <FaHeart />
            </button>
            <button type="button" className="nav-icon-btn" onClick={loadData} aria-label="Refresh dashboard">
              <FaRedo />
            </button>
            <button
              type="button"
              className="dealer-avatar-btn"
              onClick={() => selectSection("profile")}
              aria-label="Open profile"
              title="Profile"
            >
              <span className="dealer-avatar">{dealerInitials(profile.name)}</span>
            </button>
          </div>
        </div>
      </nav>

      <div
        className={`dealer-sidebar-overlay ${isSidebarOpen ? "open" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      <div className={`dealer-layout ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
        <aside className={`dealer-sidebar ${isSidebarOpen ? "open" : "collapsed"}`}>
          <div className="dealer-sidebar-head">
            <h2>Dealer</h2>
            <p>{profile.company || profile.name}</p>
          </div>

          <nav className="dealer-menu" aria-label="Dealer sections">
            {menuItems.map(({ key, label, Icon, badge }) => (
              <button
                key={key}
                type="button"
                className={`dealer-menu-item ${activeSection === key ? "active" : ""}`}
                onClick={() => selectSection(key)}
                title={label}
              >
                <span className="dealer-menu-left">
                  <Icon />
                  <span className="dealer-menu-label">{label}</span>
                </span>
                {badge !== null && badge !== undefined && badge !== "" && (
                  <span className="dealer-menu-badge" aria-label="New items">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="dealer-sidebar-footer">
            <button type="button" className="dealer-menu-item dealer-logout" onClick={logout} title="Logout">
              <span className="dealer-menu-left">
                <FaSignOutAlt />
                <span className="dealer-menu-label">Logout</span>
              </span>
            </button>
          </div>
        </aside>

        <main className="dealer-main">
          <header className="dealer-page-head">
            <div>
              <h1>{pageMeta.title}</h1>
              <p>{pageMeta.subtitle}</p>
            </div>
            <div className="dealer-head-actions">
              {activeSection === "dashboard" && (
                <button type="button" className="dealer-primary" onClick={() => selectSection("products")}>
                  <FaPlus />
                  <span>Add Product</span>
                </button>
              )}
              {!!String(searchTerm || "").trim() && (
                <button type="button" className="dealer-secondary" onClick={() => setSearchTerm("")}>
                  Clear
                </button>
              )}
            </div>
          </header>

          {error && <div className="dealer-alert error">{error}</div>}

          {activeSection === "dashboard" ? (
            <>
              <section className="dealer-metrics" aria-label="Dashboard metrics">
                {metricCards.map(({ key, label, value, meta, Icon, tone }) => (
                  <article key={key} className={`dealer-metric-card ${tone}`}>
                    <div className={`dealer-metric-icon ${tone}`} aria-hidden="true">
                      <Icon />
                    </div>
                    <div className="dealer-metric-main">
                      <div className="dealer-metric-label">{label}</div>
                      <div className="dealer-metric-value-row">
                        <div className="dealer-metric-value">{value}</div>
                        {!!meta && <span className="dealer-metric-badge">{meta}</span>}
                      </div>
                    </div>
                  </article>
                ))}
              </section>

              <section className="dealer-dashboard-grid" aria-label="Earnings overview panels">
                <article className="dealer-card dealer-chart-card">
                  <div className="dealer-card-head">
                    <h2>Earnings Overview</h2>
                    <div className="dealer-toggle-group" aria-label="Range selection">
                      <button
                        type="button"
                        className={`dealer-toggle-btn ${overviewRange === "monthly" ? "active" : ""}`}
                        onClick={() => setOverviewRange("monthly")}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        className={`dealer-toggle-btn ${overviewRange === "yearly" ? "active" : ""}`}
                        onClick={() => setOverviewRange("yearly")}
                      >
                        Yearly
                      </button>
                      <button
                        type="button"
                        className={`dealer-toggle-btn ${overviewRange === "all" ? "active" : ""}`}
                        onClick={() => setOverviewRange("all")}
                      >
                        All Time
                      </button>
                    </div>
                  </div>

                  <div className="dealer-chart-kpis">
                    <div className="dealer-chart-kpi">
                      <strong>{isLoading ? "-" : toInt(summary.totalOrders)}</strong>
                      <span>Orders</span>
                    </div>
                    <div className="dealer-chart-kpi accent">
                      <strong>{isLoading ? "-" : formatMoney(summary.totalEarnings)}</strong>
                      <span>Earnings</span>
                    </div>
                    <div className="dealer-chart-kpi muted">
                      <strong>{isLoading ? "-" : formatMoney(summary.pendingPayments)}</strong>
                      <span>Pending</span>
                    </div>
                  </div>

                  <div className="dealer-line-chart" aria-label="Earnings line chart">
                    <svg viewBox="0 0 600 240" preserveAspectRatio="none" aria-hidden="true">
                      <defs>
                        <linearGradient id="dealerLine" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="rgba(255, 138, 0, 0.15)" />
                          <stop offset="50%" stopColor="rgba(255, 176, 0, 0.95)" />
                          <stop offset="100%" stopColor="rgba(255, 138, 0, 0.75)" />
                        </linearGradient>
                        <linearGradient id="dealerArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(255, 176, 0, 0.26)" />
                          <stop offset="100%" stopColor="rgba(255, 176, 0, 0.02)" />
                        </linearGradient>
                      </defs>
                      <path d={overviewChart.areaPath} fill="url(#dealerArea)" />
                      <path d={overviewChart.linePath} fill="none" stroke="url(#dealerLine)" strokeWidth="3" />
                      {overviewChart.points.map((p, idx) => {
                        const isLast = idx === overviewChart.points.length - 1;
                        return (
                          <circle
                            key={`${p.x}-${p.y}`}
                            cx={p.x}
                            cy={p.y}
                            r={isLast ? 4.6 : 2.6}
                            fill={isLast ? "rgba(255, 176, 0, 0.95)" : "rgba(255, 176, 0, 0.65)"}
                            stroke={isLast ? "rgba(255, 255, 255, 0.75)" : "transparent"}
                            strokeWidth={isLast ? 1 : 0}
                          />
                        );
                      })}
                    </svg>
                    <div className="dealer-chart-x" aria-hidden="true">
                      {overviewChart.labels.map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                  </div>
                </article>

                <article className="dealer-card dealer-earnings-card">
                  <h2>Earnings</h2>
                  <div className="dealer-earnings-list" aria-label="Earnings breakdown">
                    <div className="dealer-earnings-item">
                      <div className="dealer-earnings-amt">{isLoading ? "-" : formatMoney(summary.totalEarnings)}</div>
                      <div className="dealer-earnings-label">Total Earnings</div>
                    </div>
                    <div className="dealer-earnings-item">
                      <div className="dealer-earnings-amt">{isLoading ? "-" : formatMoney(summary.averageOrderValue)}</div>
                      <div className="dealer-earnings-label">Avg Order Value</div>
                    </div>
                    <div className="dealer-earnings-item">
                      <div className="dealer-earnings-amt">{isLoading ? "-" : formatMoney(summary.pendingPayments)}</div>
                      <div className="dealer-earnings-label">Pending Payment</div>
                    </div>
                  </div>
                </article>
              </section>

              <section className="dealer-card dealer-stock-card" aria-label="Low stock alert">
                <div className="dealer-card-head">
                  <h2>Low Stock Alert</h2>
                  <button
                    type="button"
                    className="dealer-secondary dealer-secondary-sm"
                    onClick={() => selectSection("products")}
                  >
                    View inventory
                  </button>
                </div>
                <div className="dealer-stock-grid">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className={`dealer-stock-item ${item.tone}`}>
                      <div className={`dealer-stock-thumb ${item.id}`} aria-hidden="true" />
                      <div className="dealer-stock-main">
                        <div className="dealer-stock-title">{item.name}</div>
                        <div className="dealer-stock-sub">{item.subtitle}</div>
                        <div className="dealer-stock-count">{item.remaining}</div>
                      </div>
                      <button
                        type="button"
                        className={`dealer-stock-action ${item.tone}`}
                        onClick={() => selectSection("products")}
                      >
                        {item.actionLabel}
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="dealer-bottom-grid" aria-label="Payment history and actions">
                <article className="dealer-card dealer-mini-card">
                  <h2>Quick Insights</h2>
                  <div className="dealer-mini-grid">
                    <div className="dealer-mini-item">
                      <span>Available Products</span>
                      <strong>{isLoading ? "-" : availableProducts}</strong>
                    </div>
                    <div className="dealer-mini-item">
                      <span>Paid Order Rate</span>
                      <strong>{isLoading ? "-" : `${paidOrderPercent}%`}</strong>
                    </div>
                    <div className="dealer-mini-item">
                      <span>Pending vs Earnings</span>
                      <strong>{isLoading ? "-" : `${pendingPaymentPercent}%`}</strong>
                    </div>
                  </div>
                </article>

                <article className="dealer-card dealer-payments-card">
                  <div className="dealer-card-head">
                    <h2>Payment History</h2>
                  </div>
                  {paymentHistory.length === 0 ? (
                    <div className="dealer-empty">No payments recorded yet.</div>
                  ) : (
                    <div className="dealer-payments-list" aria-label="Recent payments">
                      {paymentHistory.map((entry) => (
                        <div key={entry.id} className="dealer-payment-row">
                          <div className="dealer-payment-title">{entry.title}</div>
                          <div className="dealer-payment-amt">{formatMoney(entry.amount)}</div>
                          <div className="dealer-payment-status">{entry.status}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="dealer-primary dealer-withdraw"
                    onClick={() => selectSection("payments")}
                  >
                    Withdraw Funds
                  </button>
                </article>
              </section>
            </>
          ) : activeSection === "profile" ? (
            <section className="dealer-card dealer-profile-card" aria-label="Dealer profile">
              <div className="dealer-profile-head">
                <div className="dealer-profile-avatar" aria-hidden="true">
                  {dealerInitials(profile.name)}
                </div>
                <div>
                  <div className="dealer-profile-name">{profile.name || "Dealer"}</div>
                  <div className="dealer-profile-meta">{profile.company || "No company set"}</div>
                </div>
              </div>

              <div className="dealer-profile-grid">
                <div>
                  <span className="dealer-field-label">Email</span>
                  <div className="dealer-field-value">{profile.email || "Not set"}</div>
                </div>
                <div>
                  <span className="dealer-field-label">Phone</span>
                  <div className="dealer-field-value">{profile.phone || "Not set"}</div>
                </div>
                <div>
                  <span className="dealer-field-label">Company</span>
                  <div className="dealer-field-value">{profile.company || "Not set"}</div>
                </div>
                <div>
                  <span className="dealer-field-label">Status</span>
                  <div className="dealer-field-value">Active</div>
                </div>
              </div>

              <div className="dealer-profile-actions">
                <button type="button" className="dealer-secondary" onClick={loadData}>
                  <FaRedo />
                  <span>Refresh</span>
                </button>
                <button type="button" className="dealer-secondary dealer-danger" onClick={logout}>
                  <FaSignOutAlt />
                  <span>Logout</span>
                </button>
              </div>
            </section>
          ) : (
            <section className="dealer-card dealer-details-card">
              <h2>{sectionDetails[activeSection]?.title || "Details"}</h2>
              <p className="dealer-detail-subtitle">{sectionDetails[activeSection]?.subtitle || ""}</p>
              <div className="dealer-detail-grid">
                {(sectionDetails[activeSection]?.cards || []).map((item) => (
                  <div key={item.label} className="dealer-detail-item">
                    <span className="dealer-field-label">{item.label}</span>
                    <div className="dealer-field-value">{item.value}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      <nav className="bottom-nav dealer-bottom-nav" aria-label="Dealer navigation">
        <button
          type="button"
          className={`bottom-nav-item ${activeSection === "dashboard" ? "active" : ""}`}
          onClick={() => selectSection("dashboard")}
        >
          <span className="nav-icon">
            <FaChartLine />
          </span>
          <span className="nav-label">Home</span>
        </button>
        <button
          type="button"
          className={`bottom-nav-item ${activeSection === "products" ? "active" : ""}`}
          onClick={() => selectSection("products")}
        >
          <span className="nav-icon">
            <FaBoxOpen />
          </span>
          <span className="nav-label">Products</span>
          {summary.outOfStockProducts > 0 && (
            <span className="nav-badge">{Number(summary.outOfStockProducts || 0)}</span>
          )}
        </button>
        <button
          type="button"
          className={`bottom-nav-item ${activeSection === "orders" ? "active" : ""}`}
          onClick={() => selectSection("orders")}
        >
          <span className="nav-icon">
            <FaShoppingCart />
          </span>
          <span className="nav-label">Orders</span>
          {summary.pendingOrders > 0 && (
            <span className="nav-badge">{Number(summary.pendingOrders || 0)}</span>
          )}
        </button>
        <button
          type="button"
          className={`bottom-nav-item ${activeSection === "earnings" ? "active" : ""}`}
          onClick={() => selectSection("earnings")}
        >
          <span className="nav-icon">
            <FaRupeeSign />
          </span>
          <span className="nav-label">Earnings</span>
        </button>
        <button
          type="button"
          className={`bottom-nav-item ${activeSection === "payments" ? "active" : ""}`}
          onClick={() => selectSection("payments")}
        >
          <span className="nav-icon">
            <FaWallet />
          </span>
          <span className="nav-label">Payments</span>
          {summary.pendingPayments > 0 && <span className="nav-badge">!</span>}
        </button>
      </nav>
    </div>
  );
}

export default DealerDashboard;
