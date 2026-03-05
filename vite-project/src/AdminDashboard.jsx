import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBars,
  FaBan,
  FaBoxes,
  FaCheck,
  FaChevronDown,
  FaChartLine,
  FaClipboardList,
  FaComments,
  FaImage,
  FaMobileAlt,
  FaPaste,
  FaPaperPlane,
  FaPlus,
  FaRedo,
  FaSearch,
  FaShoppingCart,
  FaSignOutAlt,
  FaStore,
  FaTimes,
  FaTrash,
  FaUpload,
  FaUserCheck,
  FaUsers,
} from "react-icons/fa";
import { fetchAdminApi, probeBackendHealth } from "./adminApi";
import "./AdminDashboard.css";

const initialForm = {
  name: "",
  brand: "",
  category: "All Phones",
  price: "",
  originalPrice: "",
  stock: "0",
  image: "",
  description: "",
  specs: "",
};

const initialDealerForm = {
  name: "",
  email: "",
  password: "",
  company: "",
  phone: "",
  commissionRate: "5",
  approvalStatus: "approved",
};

const MAX_IMAGE_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const IMAGE_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="100%" height="100%" fill="#0d1628"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#8da3c9" font-family="Arial" font-size="20">No Image</text></svg>'
  );

function isHttpImageUrl(value) {
  return /^https?:\/\/\S+$/i.test(String(value || "").trim());
}

function isDataImageUrl(value) {
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(String(value || "").trim());
}

function isSupportedImage(value) {
  const normalized = String(value || "").trim();
  return isHttpImageUrl(normalized) || isDataImageUrl(normalized);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function getAdminToken() {
  try {
    return localStorage.getItem("admin_token") || "";
  } catch (_e) {
    return "";
  }
}

function adminHeaders(extra = {}) {
  const token = getAdminToken();
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

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(toInt(value));
}

function shortId(value) {
  const raw = String(value || "");
  if (!raw) return "-";
  return raw.length > 10 ? `${raw.slice(0, 10)}...` : raw;
}

function dealerBucket(dealer) {
  if (dealer?.isBlocked) return "inactive";
  const approval = String(dealer?.approvalStatus || "pending").toLowerCase();
  if (approval === "pending") return "review";
  if (approval === "approved") return "active";
  return "inactive";
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

function AdminDashboard() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("Admin");
  const [products, setProducts] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [summary, setSummary] = useState({
    totalProducts: 0,
    activeProducts: 0,
    outOfStockProducts: 0,
    lowStockProducts: 0,
    totalStockItems: 0,
    totalUsers: 0,
    totalCustomers: 0,
    totalDealers: 0,
    activeDealers: 0,
    inactiveDealers: 0,
    approvedDealers: 0,
    pendingDealers: 0,
    rejectedDealers: 0,
    blockedDealers: 0,
    totalOrders: 0,
    paidOrders: 0,
    placedOrders: 0,
    totalSales: 0,
    activeLoginsNow: 0,
    recentLogins24h: 0,
    totalAccountsLoggedIn: 0,
    monthlyRevenue: [],
    yearlyRevenue: [],
    lowStockAlerts: [],
    recentUsers: [],
    recentDealers: [],
    recentOrders: [],
    mainDbConnected: true,
    mainDbError: "",
  });
  const [revenueView, setRevenueView] = useState("monthly");
  const [activeMenu, setActiveMenu] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 980;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState(initialForm);
  const [dealerForm, setDealerForm] = useState(initialDealerForm);
  const [dealerView, setDealerView] = useState("all");
  const [isAddDealerOpen, setIsAddDealerOpen] = useState(false);
  const [dealerActionId, setDealerActionId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imageStatus, setImageStatus] = useState("");
  const [isImageDragActive, setIsImageDragActive] = useState(false);
  const imageFileInputRef = useRef(null);

  const [supportChats, setSupportChats] = useState([]);
  const [supportUnreadForAdmin, setSupportUnreadForAdmin] = useState(0);
  const [supportActiveUserId, setSupportActiveUserId] = useState("");
  const [supportActiveChat, setSupportActiveChat] = useState(null);
  const [supportReply, setSupportReply] = useState("");
  const [supportChatsLoading, setSupportChatsLoading] = useState(false);
  const [supportChatLoading, setSupportChatLoading] = useState(false);
  const [supportSending, setSupportSending] = useState(false);
  const [supportStatusSaving, setSupportStatusSaving] = useState(false);
  const [supportErrorText, setSupportErrorText] = useState("");

  const outOfStockList = useMemo(
    () => products.filter((p) => toInt(p.stock) <= 0),
    [products]
  );
  const lowStockList = useMemo(
    () => products.filter((p) => toInt(p.stock) > 0 && toInt(p.stock) <= 5),
    [products]
  );

  const menuItems = useMemo(
    () => [
      { id: "overview", label: "Dashboard", icon: FaChartLine, badge: summary.totalOrders },
      { id: "dealers", label: "Dealers", icon: FaStore, badge: summary.totalDealers },
      { id: "users", label: "Users", icon: FaUsers, badge: summary.totalUsers },
      { id: "support", label: "Support", icon: FaComments, badge: supportUnreadForAdmin },
      { id: "orders", label: "Orders", icon: FaShoppingCart, badge: summary.totalOrders },
      { id: "inventory", label: "Inventory", icon: FaBoxes, badge: summary.totalStockItems },
      { id: "add-product", label: "Add Product", icon: FaPlus, badge: null },
    ],
    [summary, supportUnreadForAdmin]
  );

  const statCards = useMemo(
    () => [
      { label: "Total Sales", value: formatMoney(summary.totalSales), icon: FaChartLine },
      { label: "Total Orders", value: summary.totalOrders, icon: FaShoppingCart },
      { label: "Total Dealers", value: summary.totalDealers, icon: FaStore },
      { label: "Total Customers", value: summary.totalCustomers || summary.totalUsers, icon: FaUsers },
      { label: "Active Logins", value: summary.activeLoginsNow, icon: FaUserCheck },
      { label: "Low Stock Alert", value: summary.lowStockProducts, icon: FaClipboardList },
    ],
    [summary]
  );

  const loadAdminData = async () => {
    const token = getAdminToken();
    if (!token) {
      navigate("/admin/login");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const [profileRes, productsRes, summaryRes, dealersRes, supportRes] = await Promise.all([
        fetchAdminApi("/me", { headers: adminHeaders() }, 1, 250, 7000),
        fetchAdminApi("/products", { headers: adminHeaders() }, 1, 250, 7000),
        fetchAdminApi("/summary", { headers: adminHeaders() }, 1, 250, 7000),
        fetchAdminApi("/dealers", { headers: adminHeaders() }, 1, 250, 7000).catch(() => null),
        fetchAdminApi("/support/chats?limit=80", { headers: adminHeaders() }, 1, 250, 7000).catch(() => null),
      ]);

      const profileData = await profileRes.json().catch(() => ({}));
      if (!profileRes.ok) {
        setError(profileData.message || "Admin session expired. Please login again.");
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        navigate("/admin/login");
        return;
      }
      if (profileData?.admin?.name) setAdminName(profileData.admin.name);

      const productData = await productsRes.json().catch(() => ({}));
      if (!productsRes.ok) {
        setError(productData.message || "Failed to load products");
      } else {
        setProducts(Array.isArray(productData.products) ? productData.products : []);
      }

      const summaryData = await summaryRes.json().catch(() => ({}));
      if (summaryRes.ok) {
        setSummary({
          totalProducts: toInt(summaryData.totalProducts),
          activeProducts: toInt(summaryData.activeProducts),
          outOfStockProducts: toInt(summaryData.outOfStockProducts),
          lowStockProducts: toInt(summaryData.lowStockProducts),
          totalStockItems: toInt(summaryData.totalStockItems),
          totalUsers: toInt(summaryData.totalUsers),
          totalCustomers: toInt(summaryData.totalCustomers || summaryData.totalUsers),
          totalDealers: toInt(summaryData.totalDealers),
          activeDealers: toInt(summaryData.activeDealers),
          inactiveDealers: toInt(summaryData.inactiveDealers),
          approvedDealers: toInt(summaryData.approvedDealers),
          pendingDealers: toInt(summaryData.pendingDealers),
          rejectedDealers: toInt(summaryData.rejectedDealers),
          blockedDealers: toInt(summaryData.blockedDealers),
          totalOrders: toInt(summaryData.totalOrders),
          paidOrders: toInt(summaryData.paidOrders),
          placedOrders: toInt(summaryData.placedOrders),
          totalSales: toInt(summaryData.totalSales),
          activeLoginsNow: toInt(summaryData.activeLoginsNow),
          recentLogins24h: toInt(summaryData.recentLogins24h),
          totalAccountsLoggedIn: toInt(summaryData.totalAccountsLoggedIn),
          monthlyRevenue: Array.isArray(summaryData.monthlyRevenue) ? summaryData.monthlyRevenue : [],
          yearlyRevenue: Array.isArray(summaryData.yearlyRevenue) ? summaryData.yearlyRevenue : [],
          lowStockAlerts: Array.isArray(summaryData.lowStockAlerts) ? summaryData.lowStockAlerts : [],
          recentUsers: Array.isArray(summaryData.recentUsers) ? summaryData.recentUsers : [],
          recentDealers: Array.isArray(summaryData.recentDealers) ? summaryData.recentDealers : [],
          recentOrders: Array.isArray(summaryData.recentOrders) ? summaryData.recentOrders : [],
          mainDbConnected: summaryData.mainDbConnected !== false,
          mainDbError: String(summaryData.mainDbError || ""),
        });
      }

      if (dealersRes) {
        const dealerData = await dealersRes.json().catch(() => ({}));
        if (dealersRes.ok && Array.isArray(dealerData.dealers)) {
          setDealers(dealerData.dealers);
        }
      } else if (Array.isArray(summaryData.recentDealers)) {
        setDealers(summaryData.recentDealers);
      }

      if (supportRes) {
        const supportData = await supportRes.json().catch(() => ({}));
        if (supportRes.ok) {
          setSupportChats(Array.isArray(supportData.chats) ? supportData.chats : []);
          setSupportUnreadForAdmin(toInt(supportData.totalUnreadForAdmin));
        }
      }
    } catch (_e) {
      const health = await probeBackendHealth(2000);
      setError(
        health.reachable
          ? "Could not load admin dashboard data. Backend is up, but admin APIs failed."
          : "Backend is down. Start backend with .\\start.cmd, then refresh."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadSupportChats = async () => {
    const token = getAdminToken();
    if (!token) {
      navigate("/admin/login");
      return;
    }

    setSupportChatsLoading(true);
    setSupportErrorText("");
    try {
      const res = await fetchAdminApi(
        "/support/chats?limit=120",
        { headers: adminHeaders() },
        1,
        250,
        7000
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Failed to load support chats (${res.status})`);
      }

      setSupportChats(Array.isArray(data.chats) ? data.chats : []);
      setSupportUnreadForAdmin(toInt(data.totalUnreadForAdmin));
    } catch (e) {
      setSupportErrorText(e?.message || "Failed to load support chats");
    } finally {
      setSupportChatsLoading(false);
    }
  };

  const openSupportChat = async (userId) => {
    const id = String(userId || "");
    if (!id) return;

    setSupportActiveUserId(id);
    setSupportChatLoading(true);
    setSupportErrorText("");
    try {
      const res = await fetchAdminApi(
        `/support/chats/${id}?limit=250`,
        { headers: adminHeaders() },
        1,
        250,
        7000
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Failed to load chat (${res.status})`);
      }
      setSupportActiveChat(data.chat || null);
      await loadSupportChats();
    } catch (e) {
      setSupportErrorText(e?.message || "Failed to load chat");
    } finally {
      setSupportChatLoading(false);
    }
  };

  const sendSupportReply = async (e) => {
    e.preventDefault();
    const userId = String(supportActiveUserId || "");
    const text = String(supportReply || "").trim();
    if (!userId || !text) return;
    if (supportSending) return;

    setSupportSending(true);
    setSupportErrorText("");
    try {
      const res = await fetchAdminApi(
        `/support/chats/${userId}/message`,
        {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify({ text }),
        },
        1,
        250,
        7000
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Failed to send message (${res.status})`);
      }

      setSupportActiveChat(data.chat || null);
      setSupportReply("");
      await loadSupportChats();
    } catch (err) {
      setSupportErrorText(err?.message || "Failed to send message");
    } finally {
      setSupportSending(false);
    }
  };

  const updateSupportStatus = async (nextStatus) => {
    const userId = String(supportActiveUserId || "");
    const status = String(nextStatus || "").trim().toLowerCase();
    if (!userId) return;
    if (status !== "open" && status !== "closed") return;
    if (supportStatusSaving) return;

    setSupportStatusSaving(true);
    setSupportErrorText("");
    try {
      const res = await fetchAdminApi(
        `/support/chats/${userId}/status`,
        {
          method: "PATCH",
          headers: adminHeaders(),
          body: JSON.stringify({ status }),
        },
        1,
        250,
        7000
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Failed to update status (${res.status})`);
      }

      if (data.chat) {
        setSupportActiveChat((prev) => (prev ? { ...prev, status: data.chat.status } : prev));
      }
      await loadSupportChats();
    } catch (err) {
      setSupportErrorText(err?.message || "Failed to update status");
    } finally {
      setSupportStatusSaving(false);
    }
  };

  useEffect(() => {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem("admin_user") || "{}");
    } catch (_e) {
      saved = {};
    }
    if (saved?.name) setAdminName(saved.name);
    loadAdminData();
  }, []);

  useEffect(() => {
    if (!isAddDealerOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsAddDealerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAddDealerOpen]);

  const onField = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "image" && imageStatus) setImageStatus("");
  };

  const onDealerField = (e) => {
    const { name, value } = e.target;
    setDealerForm((prev) => ({ ...prev, [name]: value }));
  };

  const addDealer = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const name = String(dealerForm.name || "").trim();
    const email = String(dealerForm.email || "").trim();
    const password = String(dealerForm.password || "");
    const commissionRate = Number(dealerForm.commissionRate || 0);

    if (!name || !email || !password) {
      setError("Dealer name, email and password are required.");
      return;
    }
    if (password.length < 8) {
      setError("Dealer password must be at least 8 characters.");
      return;
    }
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      setError("Commission rate must be between 0 and 100.");
      return;
    }

    setDealerActionId("new");
    try {
      const res = await fetchAdminApi(
        "/dealers",
        {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify({
            name,
            email,
            password,
            company: String(dealerForm.company || "").trim(),
            phone: String(dealerForm.phone || "").trim(),
            commissionRate,
            approvalStatus: dealerForm.approvalStatus || "approved",
          }),
        },
        1,
        250,
        7000
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to add dealer.");
        setDealerActionId("");
        return;
      }

      setSuccess("Dealer added successfully.");
      setIsAddDealerOpen(false);
      setDealerForm(initialDealerForm);
      await loadAdminData();
      setActiveMenu("dealers");
    } catch (_e) {
      setError("Failed to add dealer.");
    } finally {
      setDealerActionId("");
    }
  };

  const updateDealerApproval = async (dealerId, approvalStatus) => {
    if (!dealerId) return;
    setError("");
    setSuccess("");
    setDealerActionId(dealerId);
    try {
      const res = await fetchAdminApi(
        `/dealers/${dealerId}/approval`,
        {
          method: "PATCH",
          headers: adminHeaders(),
          body: JSON.stringify({ approvalStatus }),
        },
        1,
        250,
        7000
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to update dealer approval.");
        setDealerActionId("");
        return;
      }
      setSuccess(`Dealer ${approvalStatus}.`);
      await loadAdminData();
    } catch (_e) {
      setError("Failed to update dealer approval.");
    } finally {
      setDealerActionId("");
    }
  };

  const updateDealerBlock = async (dealerId, isBlocked) => {
    if (!dealerId) return;
    setError("");
    setSuccess("");
    setDealerActionId(dealerId);
    try {
      const res = await fetchAdminApi(
        `/dealers/${dealerId}/block`,
        {
          method: "PATCH",
          headers: adminHeaders(),
          body: JSON.stringify({ isBlocked }),
        },
        1,
        250,
        7000
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to update dealer block status.");
        setDealerActionId("");
        return;
      }
      setSuccess(isBlocked ? "Dealer blocked." : "Dealer unblocked.");
      await loadAdminData();
    } catch (_e) {
      setError("Failed to update dealer block status.");
    } finally {
      setDealerActionId("");
    }
  };

  const updateDealerCommission = async (dealer) => {
    if (!dealer?.id) return;
    const input = window.prompt(
      `Set commission % for ${dealer.name || "dealer"}`,
      String(dealer.commissionRate ?? 5)
    );
    if (input === null) return;
    const commissionRate = Number(input);
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      setError("Commission rate must be between 0 and 100.");
      return;
    }

    setError("");
    setSuccess("");
    setDealerActionId(dealer.id);
    try {
      const res = await fetchAdminApi(
        `/dealers/${dealer.id}/commission`,
        {
          method: "PATCH",
          headers: adminHeaders(),
          body: JSON.stringify({ commissionRate }),
        },
        1,
        250,
        7000
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to update commission.");
        setDealerActionId("");
        return;
      }
      setSuccess("Dealer commission updated.");
      await loadAdminData();
    } catch (_e) {
      setError("Failed to update commission.");
    } finally {
      setDealerActionId("");
    }
  };

  const updateDealerSales = async (dealer) => {
    if (!dealer?.id) return;
    const salesInput = window.prompt(
      `Total sales for ${dealer.name || "dealer"}`,
      String(toInt(dealer.totalSales))
    );
    if (salesInput === null) return;
    const ordersInput = window.prompt(
      `Total orders for ${dealer.name || "dealer"}`,
      String(toInt(dealer.totalOrders))
    );
    if (ordersInput === null) return;

    const totalSales = Number(salesInput);
    const totalOrders = Number(ordersInput);
    if (!Number.isFinite(totalSales) || totalSales < 0 || !Number.isFinite(totalOrders) || totalOrders < 0) {
      setError("Enter valid sales and orders values.");
      return;
    }

    setError("");
    setSuccess("");
    setDealerActionId(dealer.id);
    try {
      const res = await fetchAdminApi(
        `/dealers/${dealer.id}/sales`,
        {
          method: "PATCH",
          headers: adminHeaders(),
          body: JSON.stringify({ totalSales, totalOrders }),
        },
        1,
        250,
        7000
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to update dealer sales.");
        setDealerActionId("");
        return;
      }
      setSuccess("Dealer sales updated.");
      await loadAdminData();
    } catch (_e) {
      setError("Failed to update dealer sales.");
    } finally {
      setDealerActionId("");
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setImageStatus("");
    setIsImageDragActive(false);
  };

  const applyImageSource = (rawSource, sourceLabel = "Image ready.") => {
    const source = String(rawSource || "").trim();
    if (!source) return false;
    if (!isSupportedImage(source)) {
      setError("Image must be a valid http(s) URL, or paste/upload an image.");
      return false;
    }
    setForm((prev) => ({ ...prev, image: source }));
    setError("");
    setImageStatus(sourceLabel);
    return true;
  };

  const addImageFile = async (file, sourceLabel = "Image attached from file.") => {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      setError("Image is too large. Please choose an image smaller than 2MB.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((prev) => ({ ...prev, image: dataUrl }));
      setError("");
      setImageStatus(sourceLabel);
    } catch (_e) {
      setError("Could not read image file. Try another file.");
    }
  };

  const onImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await addImageFile(file, "Image attached from upload.");
    e.target.value = "";
  };

  const onImagePaste = async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find((item) => String(item.type || "").startsWith("image/"));
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) await addImageFile(file, "Image attached from clipboard.");
      return;
    }

    const text = String(e.clipboardData?.getData("text") || "").trim();
    if (text && isSupportedImage(text)) {
      e.preventDefault();
      applyImageSource(text, "Image URL pasted from clipboard.");
    }
  };

  const pasteFromClipboard = async () => {
    setError("");
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setError("Clipboard access is not available. Use Ctrl+V in the image area.");
      return;
    }

    try {
      if (navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((type) => type.startsWith("image/"));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], `clipboard-${Date.now()}.png`, { type: imageType });
            await addImageFile(file, "Image attached from clipboard.");
            return;
          }
        }
      }

      if (navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (applyImageSource(text, "Image URL pasted from clipboard.")) return;
      }

      setError("Clipboard does not contain an image or valid image URL.");
    } catch (_e) {
      setError("Clipboard read blocked by browser permissions. Use Ctrl+V in the image area.");
    }
  };

  const clearImage = () => {
    setForm((prev) => ({ ...prev, image: "" }));
    setImageStatus("");
  };

  const onImageDrop = async (e) => {
    e.preventDefault();
    setIsImageDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      await addImageFile(file, "Image attached from drag and drop.");
      return;
    }

    const text = String(e.dataTransfer?.getData("text") || "").trim();
    if (text) applyImageSource(text, "Image URL dropped into upload area.");
  };

  const addProduct = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.brand.trim() || !form.image.trim()) {
      setError("Name, brand and image are required.");
      return;
    }
    if (!isSupportedImage(form.image)) {
      setError("Image must be a valid http(s) URL, or paste/upload an image.");
      return;
    }
    if (Number(form.price) <= 0) {
      setError("Price must be greater than 0.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetchAdminApi(
        "/products",
        {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify({
            ...form,
            image: String(form.image || "").trim(),
            price: Number(form.price),
            originalPrice: Number(form.originalPrice || form.price),
            stock: Number(form.stock || 0),
            specs: form.specs,
          }),
        },
        1,
        250,
        7000
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to add product.");
        setIsSaving(false);
        return;
      }

      setSuccess("Product added successfully.");
      resetForm();
      await loadAdminData();
      setActiveMenu("inventory");
    } catch (_e) {
      setError("Failed to add product. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeProduct = async (id) => {
    setError("");
    setSuccess("");
    if (!id) return;

    try {
      const res = await fetchAdminApi(
        `/products/${id}`,
        {
          method: "DELETE",
          headers: adminHeaders(),
        },
        1,
        250,
        7000
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to remove product.");
        return;
      }
      setSuccess("Product removed.");
      await loadAdminData();
    } catch (_e) {
      setError("Failed to remove product.");
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    navigate("/admin/login");
  };

  const selectMenu = (id) => {
    setActiveMenu(id);
    if (typeof window !== "undefined" && window.innerWidth < 980) {
      setIsSidebarOpen(false);
    }
  };

  const searchPlaceholder = useMemo(() => {
    switch (activeMenu) {
      case "dealers":
        return "Search dealers...";
      case "users":
        return "Search users...";
      case "orders":
        return "Search orders...";
      case "inventory":
        return "Search products...";
      case "support":
        return "Search support inbox...";
      default:
        return "Search...";
    }
  }, [activeMenu]);

  const pageMeta = useMemo(() => {
    switch (activeMenu) {
      case "dealers":
        return { title: "Dealer Management", subtitle: "Review, approve, and manage dealer performance." };
      case "users":
        return { title: "Users", subtitle: "Recent customers and login activity snapshot." };
      case "support":
        return { title: "Support", subtitle: "Reply to customer messages and manage status." };
      case "orders":
        return { title: "Orders", subtitle: "Recent orders and revenue breakdown." };
      case "inventory":
        return { title: "Inventory", subtitle: "Stock health, low stock alerts and product list." };
      case "add-product":
        return { title: "Add Product", subtitle: "Publish new products to the public catalog." };
      case "overview":
      default:
        return { title: "Admin Dashboard", subtitle: "Revenue, users, orders, inventory and support in one place." };
    }
  }, [activeMenu]);

  const normalizedQuery = useMemo(() => String(searchTerm || "").trim().toLowerCase(), [searchTerm]);
  const includesQuery = (value) => String(value || "").toLowerCase().includes(normalizedQuery);

  const filteredProducts = useMemo(() => {
    if (!normalizedQuery) return products;
    return products.filter((p) =>
      includesQuery(p?.name) ||
      includesQuery(p?.brand) ||
      includesQuery(p?.category) ||
      includesQuery(p?.id)
    );
  }, [products, normalizedQuery]);

  const filteredDealers = useMemo(() => {
    if (!normalizedQuery) return dealers;
    return dealers.filter((d) =>
      includesQuery(d?.name) ||
      includesQuery(d?.email) ||
      includesQuery(d?.company) ||
      includesQuery(d?.phone)
    );
  }, [dealers, normalizedQuery]);

  const dealerViewCounts = useMemo(() => {
    const rows = Array.isArray(dealers) ? dealers : [];
    const counts = { total: rows.length, active: 0, review: 0, inactive: 0 };
    rows.forEach((dealer) => {
      const bucket = dealerBucket(dealer);
      if (bucket === "active") counts.active += 1;
      else if (bucket === "review") counts.review += 1;
      else counts.inactive += 1;
    });
    return counts;
  }, [dealers]);

  const dealersForTable = useMemo(() => {
    if (dealerView === "all") return filteredDealers;
    return filteredDealers.filter((dealer) => dealerBucket(dealer) === dealerView);
  }, [dealerView, filteredDealers]);

  const filteredRecentUsers = useMemo(() => {
    const users = Array.isArray(summary.recentUsers) ? summary.recentUsers : [];
    if (!normalizedQuery) return users;
    return users.filter((u) =>
      includesQuery(u?.name) ||
      includesQuery(u?.email) ||
      includesQuery(u?.phoneNumber) ||
      includesQuery(u?.id)
    );
  }, [summary.recentUsers, normalizedQuery]);

  const filteredRecentOrders = useMemo(() => {
    const orders = Array.isArray(summary.recentOrders) ? summary.recentOrders : [];
    if (!normalizedQuery) return orders;
    return orders.filter((o) =>
      includesQuery(o?.id) ||
      includesQuery(o?.userId) ||
      includesQuery(o?.status)
    );
  }, [summary.recentOrders, normalizedQuery]);

  const filteredSupportChats = useMemo(() => {
    const chats = Array.isArray(supportChats) ? supportChats : [];
    if (!normalizedQuery) return chats;
    return chats.filter((c) =>
      includesQuery(c?.userName) ||
      includesQuery(c?.userEmail) ||
      includesQuery(c?.lastMessagePreview) ||
      includesQuery(c?.status)
    );
  }, [supportChats, normalizedQuery]);

  const renderInventoryList = () => (
    <div className="admin-card">
      <h2>Product Inventory</h2>
      {isLoading ? (
        <div className="admin-empty">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="admin-empty">No products added yet.</div>
      ) : filteredProducts.length === 0 ? (
        <div className="admin-empty">No matching products.</div>
      ) : (
        <div className="admin-list">
          {filteredProducts.map((item) => (
            <article className="admin-item" key={item.id}>
              <img
                src={item.image || IMAGE_FALLBACK}
                alt={item.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = IMAGE_FALLBACK;
                }}
              />
              <div className="admin-item-main">
                <div className="admin-item-title">{item.name}</div>
                <div className="admin-item-meta">
                  <span>{item.brand}</span>
                  <span>{item.category}</span>
                  <span>{formatMoney(item.price)}</span>
                  <span>Stock: {toInt(item.stock)}</span>
                </div>
              </div>
              <button className="admin-danger" onClick={() => removeProduct(item.id)}>
                <FaTrash />
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );

  const revenueData = useMemo(
    () => (revenueView === "yearly" ? summary.yearlyRevenue : summary.monthlyRevenue),
    [revenueView, summary.monthlyRevenue, summary.yearlyRevenue]
  );
  const maxRevenueValue = useMemo(() => {
    if (!Array.isArray(revenueData) || revenueData.length === 0) return 1;
    return Math.max(
      1,
      ...revenueData.map((row) => toInt(row?.revenue))
    );
  }, [revenueData]);

  return (
    <div className="admin-page">
      <nav className="top-nav admin-top-nav">
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
                selectMenu("overview");
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearchTerm("");
                  selectMenu("overview");
                }
              }}
            >
              <span className="logo-icon">
                <FaMobileAlt />
              </span>
              <span className="logo-text">
                Phone<span>Hub</span> <span className="admin-logo-suffix">Admin</span>
              </span>
            </div>
          </div>

          <div className="nav-center">
            <div className="search-bar">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="button" className="search-btn" aria-label="Search">
                <FaSearch />
              </button>
            </div>
          </div>

          <div className="nav-right">
            <button
              type="button"
              className="nav-icon-btn"
              onClick={loadAdminData}
              aria-label="Refresh dashboard"
            >
              <FaRedo />
            </button>
            <button
              type="button"
              className="nav-icon-btn"
              onClick={() => selectMenu("support")}
              aria-label="Open support inbox"
            >
              <FaComments />
              {supportUnreadForAdmin > 0 && (
                <span className="badge">{toInt(supportUnreadForAdmin)}</span>
              )}
            </button>
            <button type="button" className="nav-icon-btn" onClick={logout} aria-label="Logout">
              <FaSignOutAlt />
            </button>
          </div>
        </div>
      </nav>

      <div
        className={`admin-sidebar-overlay ${isSidebarOpen ? "open" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      <div className={`admin-layout ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
        <aside className={`admin-sidebar ${isSidebarOpen ? "open" : "collapsed"}`}>
          <div className="admin-sidebar-head">
            <h2>Admin Menu</h2>
            <p>{adminName}</p>
          </div>
          <nav className="admin-menu">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-menu-item ${activeMenu === item.id ? "active" : ""}`}
                  onClick={() => selectMenu(item.id)}
                  title={item.label}
                >
                  <span className="admin-menu-left">
                    <Icon />
                    <span className="admin-menu-label">{item.label}</span>
                  </span>
                  {item.badge !== null && <span className="admin-menu-badge">{toInt(item.badge)}</span>}
                </button>
              );
            })}
          </nav>
          <div className={`admin-sidebar-status ${summary.mainDbConnected ? "ok" : "warn"}`}>
            <div className="admin-sidebar-status-title">Main Database</div>
            <div className="admin-sidebar-status-text">
              {summary.mainDbConnected ? "Connected" : "Unavailable"}
            </div>
            {!summary.mainDbConnected && summary.mainDbError && (
              <p className="admin-sidebar-status-error">{summary.mainDbError}</p>
            )}
          </div>
        </aside>

        <main className="admin-main">
          <header className="admin-page-head">
            <div>
              <h1>{pageMeta.title}</h1>
              <p>{pageMeta.subtitle}</p>
            </div>
            <div className="admin-head-actions">
              {activeMenu === "dealers" && (
                <button
                  type="button"
                  className="admin-primary admin-primary-sm admin-add-btn"
                  onClick={() => setIsAddDealerOpen(true)}
                  aria-haspopup="dialog"
                >
                  <FaPlus />
                  <span>Add Dealer</span>
                  <FaChevronDown className="admin-add-caret" />
                </button>
              )}
              {String(searchTerm || "").trim() && (
                <button type="button" className="admin-secondary" onClick={() => setSearchTerm("")}>
                  Clear search
                </button>
              )}
            </div>
          </header>

          {error && (
            <div className="admin-alert error">
              <span>{error}</span>
              <button className="admin-retry" onClick={loadAdminData}>
                <FaRedo />
                <span>Retry</span>
              </button>
            </div>
          )}
          {success && <div className="admin-alert success">{success}</div>}

          {isAddDealerOpen && (
            <div
              className="admin-modal-overlay"
              role="dialog"
              aria-modal="true"
              aria-label="Add dealer"
              onClick={() => setIsAddDealerOpen(false)}
            >
              <div
                className="admin-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-modal-head">
                  <h2>Add Dealer</h2>
                  <button
                    type="button"
                    className="admin-modal-close"
                    onClick={() => setIsAddDealerOpen(false)}
                    aria-label="Close add dealer"
                  >
                    <FaTimes />
                  </button>
                </div>
                <form className="admin-form" onSubmit={addDealer}>
                  <input
                    name="name"
                    value={dealerForm.name}
                    onChange={onDealerField}
                    placeholder="Dealer name"
                  />
                  <input
                    name="email"
                    value={dealerForm.email}
                    onChange={onDealerField}
                    placeholder="Dealer email"
                    type="email"
                  />
                  <input
                    name="password"
                    value={dealerForm.password}
                    onChange={onDealerField}
                    placeholder="Password (min 8)"
                    type="password"
                  />
                  <input
                    name="company"
                    value={dealerForm.company}
                    onChange={onDealerField}
                    placeholder="Company"
                  />
                  <input
                    name="phone"
                    value={dealerForm.phone}
                    onChange={onDealerField}
                    placeholder="Phone"
                  />
                  <div className="admin-row">
                    <input
                      name="commissionRate"
                      value={dealerForm.commissionRate}
                      onChange={onDealerField}
                      placeholder="Commission %"
                      type="number"
                      min="0"
                      max="100"
                    />
                    <select
                      name="approvalStatus"
                      value={dealerForm.approvalStatus}
                      onChange={onDealerField}
                    >
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="admin-modal-actions">
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={() => setIsAddDealerOpen(false)}
                      disabled={dealerActionId === "new"}
                    >
                      Cancel
                    </button>
                    <button className="admin-primary" type="submit" disabled={dealerActionId === "new"}>
                      <FaPlus />
                      <span>{dealerActionId === "new" ? "Adding..." : "Add Dealer"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeMenu === "overview" && (
            <section className="admin-stats">
              {statCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div className="stat-card" key={item.label}>
                    <Icon />
                    <div>
                      <div className="stat-label">{item.label}</div>
                      <div className="stat-value">
                        {typeof item.value === "number" ? toInt(item.value) : item.value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {activeMenu === "overview" && (
            <section className="admin-panel-grid">
              <article className="admin-card">
                <h2>Dashboard</h2>
                <div className="admin-mini-grid">
                  <div className="admin-mini-stat">
                    <div className="admin-mini-label">Total Sales</div>
                    <div className="admin-mini-value">{formatMoney(summary.totalSales)}</div>
                  </div>
                  <div className="admin-mini-stat">
                    <div className="admin-mini-label">Total Orders</div>
                    <div className="admin-mini-value">{summary.totalOrders}</div>
                  </div>
                  <div className="admin-mini-stat">
                    <div className="admin-mini-label">Total Dealers</div>
                    <div className="admin-mini-value">{summary.totalDealers}</div>
                  </div>
                  <div className="admin-mini-stat">
                    <div className="admin-mini-label">Total Customers</div>
                    <div className="admin-mini-value">{summary.totalCustomers || summary.totalUsers}</div>
                  </div>
                  <div className="admin-mini-stat">
                    <div className="admin-mini-label">Paid Orders</div>
                    <div className="admin-mini-value">{summary.paidOrders}</div>
                  </div>
                  <div className="admin-mini-stat">
                    <div className="admin-mini-label">Low Stock Alert</div>
                    <div className="admin-mini-value">{summary.lowStockProducts}</div>
                  </div>
                </div>
              </article>

              <article className="admin-card">
                <div className="admin-chart-header">
                  <h2>Revenue Graph</h2>
                  <div className="admin-toggle-group">
                    <button
                      type="button"
                      className={`admin-toggle-btn ${revenueView === "monthly" ? "active" : ""}`}
                      onClick={() => setRevenueView("monthly")}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      className={`admin-toggle-btn ${revenueView === "yearly" ? "active" : ""}`}
                      onClick={() => setRevenueView("yearly")}
                    >
                      Yearly
                    </button>
                  </div>
                </div>
                <div className="admin-revenue-chart">
                  {Array.isArray(revenueData) && revenueData.length > 0 ? (
                    <div className="admin-revenue-bars">
                      {revenueData.map((row) => {
                        const value = toInt(row?.revenue);
                        const heightPct = Math.max(6, Math.round((value / maxRevenueValue) * 100));
                        return (
                          <div key={row.label} className="admin-revenue-bar-wrap">
                            <div className="admin-revenue-value">{formatMoney(value)}</div>
                            <div
                              className="admin-revenue-bar"
                              style={{ height: `${heightPct}%` }}
                              title={`${row.label}: ${formatMoney(value)} (${toInt(row?.orders)} orders)`}
                            />
                            <div className="admin-revenue-label">{row.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="admin-empty">No revenue data yet.</div>
                  )}
                </div>
              </article>

              <article className="admin-card admin-span-2">
                <h2>Low Stock Alert</h2>
                {Array.isArray(summary.lowStockAlerts) && summary.lowStockAlerts.length > 0 ? (
                  <div className="admin-low-alert-list">
                    {summary.lowStockAlerts.map((item) => (
                      <div key={item.id || `${item.name}-${item.brand}`} className="admin-low-alert-item">
                        <div>
                          <strong>{item.name || "Product"}</strong> {item.brand ? `(${item.brand})` : ""}
                        </div>
                        <span>Stock: {toInt(item.stock)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="admin-empty">No low stock alerts right now.</div>
                )}
              </article>
            </section>
          )}
          {activeMenu === "dealers" && (
            <section className="admin-panel-grid">
              <article className="admin-card admin-span-2 admin-dealers-card">
                <div className="admin-dealers-head">
                  <div>
                    <h2>Dealer Management</h2>
                    <p className="admin-dealers-subtitle">Approve, block, and manage dealer performance.</p>
                  </div>
                  <div className="admin-dealers-kpis" aria-label="Dealer summary">
                    <div className="admin-kpi-tag">
                      <span>Total Dealers</span>
                      <strong>{summary.totalDealers}</strong>
                    </div>
                    <div className="admin-kpi-tag">
                      <span>In Review</span>
                      <strong>{summary.pendingDealers}</strong>
                    </div>
                    <div className="admin-kpi-tag">
                      <span>Inactive</span>
                      <strong>{summary.blockedDealers + summary.rejectedDealers}</strong>
                    </div>
                  </div>
                </div>

                <div className="admin-dealers-toolbar">
                  <div className="admin-tabs" role="tablist" aria-label="Dealer filters">
                    <button
                      type="button"
                      className={`admin-tab ${dealerView === "all" ? "active" : ""}`}
                      onClick={() => setDealerView("all")}
                      role="tab"
                      aria-selected={dealerView === "all"}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={`admin-tab ${dealerView === "active" ? "active" : ""}`}
                      onClick={() => setDealerView("active")}
                      role="tab"
                      aria-selected={dealerView === "active"}
                    >
                      Active
                      {dealerViewCounts.active > 0 && <span className="admin-tab-badge">{dealerViewCounts.active}</span>}
                    </button>
                    <button
                      type="button"
                      className={`admin-tab ${dealerView === "review" ? "active" : ""}`}
                      onClick={() => setDealerView("review")}
                      role="tab"
                      aria-selected={dealerView === "review"}
                    >
                      In Review
                      {dealerViewCounts.review > 0 && <span className="admin-tab-badge">{dealerViewCounts.review}</span>}
                    </button>
                    <button
                      type="button"
                      className={`admin-tab ${dealerView === "inactive" ? "active" : ""}`}
                      onClick={() => setDealerView("inactive")}
                      role="tab"
                      aria-selected={dealerView === "inactive"}
                    >
                      Inactive
                      {dealerViewCounts.inactive > 0 && (
                        <span className="admin-tab-badge">{dealerViewCounts.inactive}</span>
                      )}
                    </button>
                  </div>

                  <div className="admin-dealers-search" role="search">
                    <FaSearch />
                    <input
                      type="text"
                      placeholder="Search dealers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="admin-empty">Loading dealers...</div>
                ) : dealers.length === 0 ? (
                  <div className="admin-empty">No dealer records found.</div>
                ) : dealersForTable.length === 0 ? (
                  <div className="admin-empty">No matching dealers.</div>
                ) : (
                  <div className="admin-dealer-table" role="table" aria-label="Dealer management table">
                    <div className="admin-dealer-row admin-dealer-head" role="row">
                      <div className="admin-dealer-cell" role="columnheader">
                        Profile
                      </div>
                      <div className="admin-dealer-cell" role="columnheader">
                        Dealer Name
                      </div>
                      <div className="admin-dealer-cell" role="columnheader">
                        Email &amp; Phone
                      </div>
                      <div className="admin-dealer-cell" role="columnheader">
                        Sales
                      </div>
                      <div className="admin-dealer-cell" role="columnheader">
                        Commission
                      </div>
                      <div className="admin-dealer-cell" role="columnheader">
                        Status
                      </div>
                      <div className="admin-dealer-cell admin-dealer-actions-head" role="columnheader" aria-label="Actions" />
                    </div>

                    {dealersForTable.map((dealer) => {
                      const approval = String(dealer.approvalStatus || "pending").toLowerCase();
                      const isBlocked = Boolean(dealer.isBlocked);
                      const bucket = dealerBucket(dealer);
                      const approvalLabel = approval === "approved" ? "Approved" : approval === "rejected" ? "Rejected" : "In Review";
                      const stateLabel = bucket === "active" ? "Active" : bucket === "review" ? "In Review" : "Inactive";
                      return (
                        <div key={dealer.id} className="admin-dealer-row" role="row">
                          <div className="admin-dealer-cell admin-dealer-profile" role="cell">
                            <div className="admin-avatar-sm" aria-hidden="true">
                              {dealerInitials(dealer.name)}
                            </div>
                          </div>

                          <div className="admin-dealer-cell admin-dealer-name" role="cell">
                            <div className="admin-dealer-title">{dealer.name || "Dealer"}</div>
                            <div className="admin-dealer-meta">{dealer.company || "No company"}</div>
                          </div>

                          <div className="admin-dealer-cell admin-dealer-contact" role="cell">
                            <div className="admin-dealer-contact-row">
                              <FaPaperPlane />
                              <span>{dealer.email || "-"}</span>
                            </div>
                            <div className="admin-dealer-contact-row">
                              <FaMobileAlt />
                              <span>{dealer.phone || "No phone"}</span>
                            </div>
                          </div>

                          <div className="admin-dealer-cell admin-dealer-sales" role="cell">
                            <div className="admin-dealer-money">{formatMoney(dealer.totalSales)}</div>
                            <div className="admin-dealer-sub">Orders: {toInt(dealer.totalOrders)}</div>
                          </div>

                          <div className="admin-dealer-cell admin-dealer-commission" role="cell">
                            <div className="admin-dealer-money">{toInt(dealer.commissionRate)}%</div>
                            <div className="admin-dealer-sub">{formatMoney(dealer.commissionAmount)}</div>
                          </div>

                          <div className="admin-dealer-cell admin-dealer-status" role="cell">
                            <div className="admin-dealer-status-row">
                              <span className={`admin-pill ${approval === "approved" ? "ok" : "warn"}`}>{approvalLabel}</span>
                              <span className={`admin-pill ${bucket === "active" ? "ok" : "warn"}`}>{stateLabel}</span>
                              {isBlocked && <span className="admin-pill warn">Blocked</span>}
                            </div>
                          </div>

                          <div className="admin-dealer-cell admin-dealer-actions" role="cell">
                            <div className="admin-dealer-actions-main">
                              {approval !== "approved" ? (
                                <button
                                  type="button"
                                  className="admin-primary admin-primary-xs"
                                  onClick={() => updateDealerApproval(dealer.id, "approved")}
                                  disabled={dealerActionId === dealer.id}
                                >
                                  <FaCheck />
                                  <span>Approve</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="admin-secondary admin-secondary-xs"
                                  onClick={() => updateDealerBlock(dealer.id, !isBlocked)}
                                  disabled={dealerActionId === dealer.id}
                                >
                                  <FaBan />
                                  <span>{isBlocked ? "Unblock" : "Block"}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="admin-inline-btn warn"
                                onClick={() => updateDealerApproval(dealer.id, "rejected")}
                                disabled={dealerActionId === dealer.id}
                                title="Reject dealer"
                              >
                                <FaTimes />
                                <span>Reject</span>
                              </button>
                            </div>
                            <div className="admin-dealer-actions-sub">
                              <button
                                type="button"
                                className="admin-inline-btn"
                                onClick={() => updateDealerCommission(dealer)}
                                disabled={dealerActionId === dealer.id}
                              >
                                Commission
                              </button>
                              <button
                                type="button"
                                className="admin-inline-btn"
                                onClick={() => updateDealerSales(dealer)}
                                disabled={dealerActionId === dealer.id}
                              >
                                Update Sales
                              </button>
                            </div>
                            <div className="admin-dealer-last">{formatDateTime(dealer.lastLoginAt)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </section>
          )}

          {activeMenu === "users" && (
            <section className="admin-panel-grid">
              <article className="admin-card">
                <h2>User Summary</h2>
                <div className="admin-mini-grid">
                  <div className="admin-mini-stat">
                    <div className="admin-mini-label">Total Users</div>
                    <div className="admin-mini-value">{summary.totalUsers}</div>
                  </div>
                  <div className="admin-mini-stat">
                    <div className="admin-mini-label">Active Logins</div>
                    <div className="admin-mini-value">{summary.activeLoginsNow}</div>
                  </div>
                  <div className="admin-mini-stat">
                    <div className="admin-mini-label">Last 24h Logins</div>
                    <div className="admin-mini-value">{summary.recentLogins24h}</div>
                  </div>
                </div>
              </article>
              <article className="admin-card admin-span-2">
                <h2>Recent User Details</h2>
                {summary.recentUsers.length === 0 ? (
                  <div className="admin-empty">No user records found.</div>
                ) : filteredRecentUsers.length === 0 ? (
                  <div className="admin-empty">No matching users.</div>
                ) : (
                  <div className="admin-detail-list">
                    {filteredRecentUsers.map((user) => (
                      <div key={user.id} className="admin-detail-item">
                        <div className="admin-detail-main">
                          <div className="admin-detail-title">{user.name || "User"}</div>
                          <div className="admin-detail-meta">
                            <span>{user.email || "-"}</span>
                            <span>{user.phoneNumber || "No phone"}</span>
                            <span>Created: {formatDateTime(user.createdAt)}</span>
                          </div>
                        </div>
                        <div className="admin-detail-side">{formatDateTime(user.lastLoginAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>
          )}

          {activeMenu === "support" && (
            <section className="admin-panel-grid admin-support-grid">
              <article className="admin-card admin-support-list">
                <div className="admin-support-head">
                  <h2>Support Inbox</h2>
                  <button
                    type="button"
                    className="admin-retry"
                    onClick={loadSupportChats}
                    disabled={supportChatsLoading}
                  >
                    <FaRedo />
                    <span>{supportChatsLoading ? "Loading" : "Refresh"}</span>
                  </button>
                </div>

                {supportErrorText && <div className="admin-support-error">{supportErrorText}</div>}

                {supportChats.length === 0 ? (
                  <div className="admin-empty">No support chats yet.</div>
                ) : filteredSupportChats.length === 0 ? (
                  <div className="admin-empty">No matching chats.</div>
                ) : (
                  <div className="admin-support-chat-list" role="list">
                    {filteredSupportChats.map((chat) => {
                      const isActive = String(chat.userId) === String(supportActiveUserId);
                      return (
                        <button
                          key={String(chat.userId || chat.id)}
                          type="button"
                          className={`admin-support-chat-item ${isActive ? "active" : ""}`}
                          onClick={() => openSupportChat(chat.userId)}
                        >
                          <div className="admin-support-chat-item-main">
                            <div className="admin-support-chat-item-title">
                              {chat.userName || chat.userEmail || "User"}
                            </div>
                            <div className="admin-support-chat-item-meta">
                              <span>{chat.userEmail || "-"}</span>
                              <span>{formatDateTime(chat.lastMessageAt)}</span>
                            </div>
                            {chat.lastMessagePreview && (
                              <div className="admin-support-chat-item-preview">{chat.lastMessagePreview}</div>
                            )}
                          </div>
                          <div className="admin-support-chat-item-side">
                            <span
                              className={`admin-support-status ${chat.status === "closed" ? "closed" : "open"}`}
                            >
                              {chat.status}
                            </span>
                            {toInt(chat.unreadForAdmin) > 0 && (
                              <span className="admin-support-unread">{toInt(chat.unreadForAdmin)}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className="admin-card admin-support-thread">
                <div className="admin-support-thread-head">
                  <h2>Conversation</h2>
                  {supportActiveChat && (
                    <div className="admin-support-thread-actions">
                      <button
                        type="button"
                        className="admin-secondary"
                        onClick={() =>
                          updateSupportStatus(supportActiveChat.status === "closed" ? "open" : "closed")
                        }
                        disabled={supportStatusSaving}
                      >
                        {supportActiveChat.status === "closed" ? "Re-open" : "Close"}
                      </button>
                    </div>
                  )}
                </div>

                {supportChatLoading && <div className="admin-empty">Loading chat…</div>}

                {!supportChatLoading && !supportActiveChat && (
                  <div className="admin-empty">Select a chat to view messages.</div>
                )}

                {!supportChatLoading && supportActiveChat && (
                  <>
                    <div className="admin-support-thread-meta">
                      <div className="admin-support-thread-user">
                        {supportActiveChat.userName || supportActiveChat.userEmail || "User"}
                      </div>
                      {supportActiveChat.userEmail && (
                        <div className="admin-support-thread-user-sub">{supportActiveChat.userEmail}</div>
                      )}
                    </div>

                    <div className="admin-support-messages">
                      {Array.isArray(supportActiveChat.messages) && supportActiveChat.messages.length > 0 ? (
                        supportActiveChat.messages.map((msg, index) => {
                          const who = msg.senderType === "admin" ? "admin" : "user";
                          const name =
                            who === "admin"
                              ? String(msg.senderName || "Admin")
                              : String(msg.senderName || supportActiveChat.userName || "User");
                          return (
                            <div
                              key={String(msg._id || `${who}-${index}`)}
                              className={`admin-support-bubble ${who}`}
                            >
                              <div className="admin-support-bubble-meta">
                                <span>{name}</span>
                                <span>{formatDateTime(msg.createdAt)}</span>
                              </div>
                              <div className="admin-support-bubble-text">{msg.text}</div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="admin-empty">No messages.</div>
                      )}
                    </div>

                    <form className="admin-support-reply" onSubmit={sendSupportReply}>
                      <input
                        value={supportReply}
                        onChange={(e) => setSupportReply(e.target.value)}
                        placeholder={supportActiveChat.status === "closed" ? "Chat is closed" : "Type a reply…"}
                        disabled={supportSending || supportActiveChat.status === "closed"}
                      />
                      <button
                        type="submit"
                        className="admin-primary"
                        disabled={
                          supportSending ||
                          supportActiveChat.status === "closed" ||
                          !String(supportReply || "").trim()
                        }
                        aria-label="Send reply"
                      >
                        <FaPaperPlane />
                      </button>
                    </form>
                  </>
                )}
              </article>
            </section>
          )}

          {activeMenu === "orders" && (
            <section className="admin-panel-grid">
              <article className="admin-card">
                <h2>Order Breakdown</h2>
                <div className="admin-mini-grid">
                  <div className="admin-mini-stat">
                    <div className="admin-mini-label">Total Orders</div>
                    <div className="admin-mini-value">{summary.totalOrders}</div>
                  </div>
                  <div className="admin-mini-stat">
                    <div className="admin-mini-label">Paid</div>
                    <div className="admin-mini-value">{summary.paidOrders}</div>
                  </div>
                  <div className="admin-mini-stat">
                    <div className="admin-mini-label">Placed</div>
                    <div className="admin-mini-value">{summary.placedOrders}</div>
                  </div>
                </div>
              </article>
              <article className="admin-card admin-span-2">
                <h2>Recent Orders</h2>
                {summary.recentOrders.length === 0 ? (
                  <div className="admin-empty">No order records found.</div>
                ) : filteredRecentOrders.length === 0 ? (
                  <div className="admin-empty">No matching orders.</div>
                ) : (
                  <div className="admin-detail-list">
                    {filteredRecentOrders.map((order) => (
                      <div key={order.id} className="admin-detail-item">
                        <div className="admin-detail-main">
                          <div className="admin-detail-title">Order {shortId(order.id)}</div>
                          <div className="admin-detail-meta">
                            <span>User: {shortId(order.userId)}</span>
                            <span>Items: {toInt(order.itemsCount)}</span>
                            <span>Total: {formatMoney(order.total)}</span>
                          </div>
                        </div>
                        <div className="admin-detail-side">{formatDateTime(order.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>
          )}

          {activeMenu === "inventory" && (
            <section className="admin-panel-grid">
              <article className="admin-card">
                <h2>Inventory Summary</h2>
                <div className="admin-mini-grid">
                  <div className="admin-mini-stat">
                    <div className="admin-mini-label">Total Items</div>
                    <div className="admin-mini-value">{summary.totalStockItems}</div>
                  </div>
                  <div className="admin-mini-stat">
                    <div className="admin-mini-label">Out Of Stock</div>
                    <div className="admin-mini-value">{outOfStockList.length}</div>
                  </div>
                  <div className="admin-mini-stat">
                    <div className="admin-mini-label">Low Stock</div>
                    <div className="admin-mini-value">{lowStockList.length}</div>
                  </div>
                </div>
              </article>
              <article className="admin-card">
                <h2>Out Of Stock Items</h2>
                {outOfStockList.length === 0 ? (
                  <div className="admin-empty">No out-of-stock items.</div>
                ) : (
                  <div className="admin-out-list">
                    {outOfStockList.map((item) => (
                      <div key={item.id} className="admin-out-item">
                        {item.name} ({item.brand})
                      </div>
                    ))}
                  </div>
                )}
              </article>
              <div className="admin-span-2">{renderInventoryList()}</div>
            </section>
          )}

          {activeMenu === "add-product" && (
            <section className="admin-grid">
              <div className="admin-card">
                <h2>Add New Item</h2>
                <form className="admin-form" onSubmit={addProduct}>
                  <input name="name" value={form.name} onChange={onField} placeholder="Product name" />
                  <input name="brand" value={form.brand} onChange={onField} placeholder="Brand" />
                  <input name="category" value={form.category} onChange={onField} placeholder="Category" />
                  <div className="admin-row">
                    <input name="price" value={form.price} onChange={onField} placeholder="Price" type="number" min="1" />
                    <input
                      name="originalPrice"
                      value={form.originalPrice}
                      onChange={onField}
                      placeholder="Original price"
                      type="number"
                      min="1"
                    />
                    <input name="stock" value={form.stock} onChange={onField} placeholder="Stock" type="number" min="0" />
                  </div>
                  <input
                    name="image"
                    value={form.image}
                    onChange={onField}
                    onPaste={onImagePaste}
                    placeholder="Image URL (http/https) or data image"
                  />
                  <div
                    className={`admin-dropzone ${isImageDragActive ? "active" : ""}`}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setIsImageDragActive(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsImageDragActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsImageDragActive(false);
                    }}
                    onDrop={onImageDrop}
                    onPaste={onImagePaste}
                    role="button"
                    tabIndex={0}
                    onClick={() => imageFileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        imageFileInputRef.current?.click();
                      }
                    }}
                  >
                    <FaImage />
                    <div className="admin-dropzone-title">Drag and drop image here</div>
                    <div className="admin-dropzone-subtitle">Click to upload, or copy-paste image/URL</div>
                  </div>
                  <div className="admin-image-tools">
                    <button type="button" className="admin-secondary" onClick={() => imageFileInputRef.current?.click()}>
                      <FaUpload />
                      <span>Upload</span>
                    </button>
                    <button type="button" className="admin-secondary" onClick={pasteFromClipboard}>
                      <FaPaste />
                      <span>Paste</span>
                    </button>
                    <button type="button" className="admin-secondary" onClick={clearImage} disabled={!form.image}>
                      Clear
                    </button>
                    <input
                      ref={imageFileInputRef}
                      type="file"
                      accept="image/*"
                      className="admin-hidden-file"
                      onChange={onImageFileChange}
                    />
                  </div>
                  {imageStatus && <div className="admin-image-status">{imageStatus}</div>}
                  <div className="admin-image-preview">
                    <img
                      src={form.image || IMAGE_FALLBACK}
                      alt="Product preview"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = IMAGE_FALLBACK;
                      }}
                    />
                    <span>{form.image ? "Image selected" : "No image selected yet"}</span>
                  </div>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={onField}
                    placeholder="Description"
                    rows={3}
                  />
                  <input
                    name="specs"
                    value={form.specs}
                    onChange={onField}
                    placeholder="Specs (comma separated)"
                  />
                  <button className="admin-primary" type="submit" disabled={isSaving}>
                    <FaPlus />
                    <span>{isSaving ? "Adding..." : "Add Product"}</span>
                  </button>
                </form>
              </div>
              {renderInventoryList()}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
