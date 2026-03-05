// Dashboard.jsx - Premium Phone E-Commerce Dashboard with Left Sidebar Categories
import React, { useMemo, useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import { useNavigate } from "react-router-dom";
import { authHeaders, fetchApiWithFallback } from "./api";
import {
  FaBars,
  FaBell,
  FaBolt,
  FaCamera,
  FaComments,
  FaChevronLeft,
  FaChevronRight,
  FaExchangeAlt,
  FaHeart,
  FaHome,
  FaMobileAlt,
  FaPaperPlane,
  FaRobot,
  FaSearch,
  FaShoppingCart,
  FaTimes,
  FaUser,
} from "react-icons/fa";
import allPhonesIcon from "./assets/category-icons/all-phones.svg";
import vivoIcon from "./assets/category-icons/vivo.svg";
import samsungIcon from "./assets/category-icons/samsung.svg";
import appleIcon from "./assets/category-icons/apple.svg";
import onePlusIcon from "./assets/category-icons/oneplus.svg";
import xiaomiIcon from "./assets/category-icons/xiaomi.svg";
import realmeIcon from "./assets/category-icons/realme.svg";
import nothingIcon from "./assets/category-icons/nothing.svg";
import motorolaIcon from "./assets/category-icons/motorola.svg";
import googleIcon from "./assets/category-icons/google.svg";

// ==================== PRODUCT DATA ====================
const defaultProducts = [
  {
    id: 1,
    name: "Vivo X100 Pro",
    brand: "Vivo",
    category: "Vivo",
    price: 89999,
    originalPrice: 99999,
    rating: 4.8,
    reviews: 1245,
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400",
    discount: "10% OFF",
    description: "Flagship phone with ZEISS camera system and Dimensity 9300 chip",
    specs: ["6.78\" AMOLED", "50MP ZEISS", "5000mAh", "12GB RAM"],
    inStock: true,
    colors: ["#0066FF", "#000000", "#A0A0A0"]
  },
  {
    id: 2,
    name: "Samsung Galaxy S24 Ultra",
    brand: "Samsung",
    category: "Samsung",
    price: 129999,
    originalPrice: 139999,
    rating: 4.9,
    reviews: 2341,
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400",
    discount: "7% OFF",
    description: "Ultimate AI phone with S Pen and 200MP camera",
    specs: ["6.8\" Dynamic", "200MP", "5000mAh", "12GB RAM"],
    inStock: true,
    colors: ["#0066FF", "#000000", "#A0A0A0"]
  },
  {
    id: 3,
    name: "iPhone 15 Pro Max",
    brand: "Apple",
    category: "Apple",
    price: 149999,
    originalPrice: 159999,
    rating: 4.9,
    reviews: 3456,
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400",
    discount: "6% OFF",
    description: "Titanium design with A17 Pro chip",
    specs: ["6.7\" Super", "48MP", "4422mAh", "8GB RAM"],
    inStock: true,
    colors: ["#0066FF", "#000000", "#A0A0A0"]
  },
  {
    id: 4,
    name: "OnePlus 12",
    brand: "OnePlus",
    category: "OnePlus",
    price: 64999,
    originalPrice: 69999,
    rating: 4.7,
    reviews: 987,
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400",
    discount: "7% OFF",
    description: "Hasselblad camera with 100W charging",
    specs: ["6.82\" LTPO", "50MP", "5400mAh", "16GB RAM"],
    inStock: true,
    colors: ["#0066FF", "#000000", "#A0A0A0"]
  },
  {
    id: 5,
    name: "Xiaomi 14 Ultra",
    brand: "Xiaomi",
    category: "Xiaomi",
    price: 99999,
    originalPrice: 109999,
    rating: 4.6,
    reviews: 765,
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400",
    discount: "9% OFF",
    description: "Leica quad camera system",
    specs: ["6.73\" AMOLED", "50MP", "5000mAh", "16GB RAM"],
    inStock: true,
    colors: ["#0066FF", "#000000", "#A0A0A0"]
  },
  {
    id: 6,
    name: "Realme GT 5 Pro",
    brand: "Realme",
    category: "Realme",
    price: 54999,
    originalPrice: 59999,
    rating: 4.5,
    reviews: 543,
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400",
    discount: "8% OFF",
    description: "Snapdragon 8 Gen 3 with 240W charging",
    specs: ["6.78\" AMOLED", "50MP", "5400mAh", "16GB RAM"],
    inStock: true,
    colors: ["#0066FF", "#000000", "#A0A0A0"]
  },
  {
    id: 7,
    name: "Vivo V30 Pro",
    brand: "Vivo",
    category: "Vivo",
    price: 42999,
    originalPrice: 47999,
    rating: 4.4,
    reviews: 432,
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400",
    discount: "10% OFF",
    description: "Portrait expert with ZEISS lens",
    specs: ["6.78\" AMOLED", "50MP", "5000mAh", "8GB RAM"],
    inStock: true,
    colors: ["#0066FF", "#000000", "#A0A0A0"]
  },
  {
    id: 8,
    name: "Samsung Galaxy Z Fold5",
    brand: "Samsung",
    category: "Samsung",
    price: 154999,
    originalPrice: 164999,
    rating: 4.7,
    reviews: 876,
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400",
    discount: "6% OFF",
    description: "Foldable innovation with S Pen",
    specs: ["7.6\" Dynamic", "50MP", "4400mAh", "12GB RAM"],
    inStock: true,
    colors: ["#0066FF", "#000000", "#A0A0A0"]
  }
];

const categories = [
  { id: 1, name: "All Phones", icon: allPhonesIcon, count: 48, color: "#0066FF" },
  { id: 2, name: "Vivo", icon: vivoIcon, count: 12, color: "#0066FF" },
  { id: 3, name: "Samsung", icon: samsungIcon, count: 15, color: "#0066FF" },
  { id: 4, name: "Apple", icon: appleIcon, count: 8, color: "#0066FF" },
  { id: 5, name: "OnePlus", icon: onePlusIcon, count: 6, color: "#0066FF" },
  { id: 6, name: "Xiaomi", icon: xiaomiIcon, count: 10, color: "#0066FF" },
  { id: 7, name: "Realme", icon: realmeIcon, count: 7, color: "#0066FF" },
  { id: 8, name: "Nothing", icon: nothingIcon, count: 3, color: "#0066FF" },
  { id: 9, name: "Motorola", icon: motorolaIcon, count: 5, color: "#0066FF" },
  { id: 10, name: "Google", icon: googleIcon, count: 4, color: "#0066FF" }
];
const deals = [
  { id: 1, title: "Flash Sale", discount: "Up to 40%", color: "#0066FF" },
  { id: 2, title: "Limited Offer", discount: "24h Left", color: "#0099FF" },
  { id: 3, title: "Best Value", discount: "Top Rated", color: "#0066FF" }
];

const productsById = new Map(defaultProducts.map((product) => [String(product.id), product]));
const fallbackProductImage = defaultProducts[0]?.image || "";
const RAZORPAY_SDK_URL = "https://checkout.razorpay.com/v1/checkout.js";
const RAZORPAY_SDK_TIMEOUT_MS = 10000;
const RAZORPAY_API_TIMEOUT_MS = 12000;

const categoryKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const isAllPhonesCategory = (value) => {
  const key = categoryKey(value);
  return key === "allphones" || key === "allphone" || key === "phones" || key === "phone";
};

const resolveProductCategory = (product) => {
  const rawCategory = String(product?.category || "").trim();
  const rawBrand = String(product?.brand || "").trim();
  if (!rawCategory || isAllPhonesCategory(rawCategory)) {
    return rawBrand || "All Phones";
  }
  return rawCategory;
};

const isAbortLikeError = (error) => {
  const name = String(error?.name || "");
  const message = String(error?.message || "");
  return name === "AbortError" || /abort|timeout/i.test(message);
};

const ensureRazorpaySdk = () =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay checkout is only available in browser."));
      return;
    }

    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    let scriptEl = document.querySelector(`script[src="${RAZORPAY_SDK_URL}"]`);
    let done = false;

    const cleanup = () => {
      if (!scriptEl) return;
      scriptEl.removeEventListener("load", onLoad);
      scriptEl.removeEventListener("error", onError);
    };

    const finishResolve = () => {
      if (done) return;
      done = true;
      clearTimeout(timeoutId);
      cleanup();
      resolve(window.Razorpay);
    };

    const finishReject = (message) => {
      if (done) return;
      done = true;
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error(message));
    };

    const onLoad = () => {
      if (window.Razorpay) {
        finishResolve();
        return;
      }
      finishReject("Razorpay checkout did not initialize. Please refresh and try again.");
    };

    const onError = () => {
      finishReject("Unable to load Razorpay checkout script.");
    };

    const timeoutId = setTimeout(() => {
      if (window.Razorpay) {
        finishResolve();
        return;
      }
      finishReject("Razorpay checkout timed out. Check internet or ad-blocker and retry.");
    }, RAZORPAY_SDK_TIMEOUT_MS);

    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.src = RAZORPAY_SDK_URL;
      scriptEl.async = true;
      document.body.appendChild(scriptEl);
    }

    scriptEl.addEventListener("load", onLoad);
    scriptEl.addEventListener("error", onError);

    // Covers cases where script loaded before listeners were attached.
    setTimeout(() => {
      if (window.Razorpay) finishResolve();
    }, 0);
  });

const normalizeServerItem = (item) => {
  const resolvedId = item?.productId ?? item?.id;
  const base = productsById.get(String(resolvedId || ""));
  const quantity = Number(item?.quantity || 1);
  const image = String(item?.image || "").trim() || base?.image || fallbackProductImage;

  return {
    ...base,
    ...item,
    id: resolvedId ?? base?.id,
    productId: resolvedId ?? base?.id,
    name: item?.name || base?.name || "Phone",
    brand: item?.brand || base?.brand || "Brand",
    price: Number(item?.price ?? base?.price ?? 0),
    image,
    specs: Array.isArray(item?.specs) && item.specs.length ? item.specs : (base?.specs || []),
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
  };
};

const normalizeCatalogProduct = (item) => {
  const resolvedId = Number(item?.productId ?? item?.id);
  if (!Number.isFinite(resolvedId) || resolvedId <= 0) return null;

  const price = Number(item?.price || 0);
  const originalPrice = Number(item?.originalPrice || price);
  const rating = Number(item?.rating || 4.5);
  const reviews = Number(item?.reviews || 0);
  const stock = Number(item?.stock || 0);
  const specs = Array.isArray(item?.specs) ? item.specs : [];
  const image = String(item?.image || "").trim() || fallbackProductImage;
  const colors = Array.isArray(item?.colors) && item.colors.length
    ? item.colors
    : ["#0066FF", "#000000", "#A0A0A0"];

  const discount =
    originalPrice > price
      ? `${Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF`
      : "";

  const category = resolveProductCategory({
    category: item?.category,
    brand: item?.brand,
  });

  return {
    id: resolvedId,
    productId: resolvedId,
    name: String(item?.name || "Phone"),
    brand: String(item?.brand || "Brand"),
    category,
    price,
    originalPrice,
    rating,
    reviews,
    image,
    discount,
    description: String(item?.description || ""),
    specs,
    inStock: Boolean(item?.inStock ?? stock > 0),
    colors,
  };
};

// Cart limits
const MAX_QUANTITY_PER_PHONE = 5;   // max 5 of same phone
const MAX_CART_ITEMS = 20;          // max 20 total items in cart

// ==================== MAIN DASHBOARD COMPONENT ====================
const Dashboard = () => {
  // State Management
  const [currentPage, setCurrentPage] = useState('home');
  const [catalogProducts, setCatalogProducts] = useState(defaultProducts);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [compare, setCompare] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Phones');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeDrawer, setActiveDrawer] = useState(null); // 'cart' | 'wishlist' | 'profile' | 'details' | 'support' | null
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Support chat + chatbot
  const [supportTab, setSupportTab] = useState("assistant"); // 'assistant' | 'admin'
  const [assistantMessages, setAssistantMessages] = useState(() => [
    {
      id: "bot-welcome",
      sender: "bot",
      text: "Hi! I’m your assistant. Ask about delivery, returns, payments, or orders.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantSuggestions, setAssistantSuggestions] = useState([
    "Track my order",
    "Delivery time",
    "Return policy",
    "Payment help",
  ]);
  const [assistantSending, setAssistantSending] = useState(false);

  const [supportChat, setSupportChat] = useState({
    status: "open",
    unreadForUser: 0,
    messages: [],
  });
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState("");
  const [supportInput, setSupportInput] = useState("");
  const [supportSending, setSupportSending] = useState(false);
  const supportScrollRef = useRef(null);
  const [checkout, setCheckout] = useState({
    method: "razorpay", // 'razorpay' | 'upi' | 'card' | 'cod'
    upiId: "",
    cardName: "",
    cardNumber: "",
    cardExp: "",
    cardCvv: "",
    address: "",
    phone: "",
  });
  const [payError, setPayError] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const navigate = useNavigate();
  const didLoadRemote = useRef(false);
  const saveTimer = useRef(null);
  const profilePicInputRef = useRef(null);
  const [profileSavedAt, setProfileSavedAt] = useState("");
  const [profileData, setProfileData] = useState(() => {
    let userData = {};
    let savedProfile = {};
    try {
      const rawUser = localStorage.getItem("user");
      userData = rawUser ? JSON.parse(rawUser) : {};
      const rawProfile = localStorage.getItem("profile_settings");
      savedProfile = rawProfile ? JSON.parse(rawProfile) : {};
    } catch (_) {
      userData = {};
      savedProfile = {};
    }

    return {
      displayName: savedProfile.displayName || userData.username || userData.name || "Guest",
      email: savedProfile.email || userData.email || "",
      phone: savedProfile.phone || "",
      address: savedProfile.address || "",
      bio: savedProfile.bio || "",
      avatar: savedProfile.avatar || "",
      notifications: savedProfile.notifications ?? true,
    };
  });

  // Hero banner slides
  const heroSlides = [
    {
      id: 1,
      title: "Vivo X100 Pro",
      offer: "Save Rs 10,000",
      description: "With ZEISS Camera System",
      image: <FaCamera />,
      bgColor: "#0066FF"
    },
    {
      id: 2,
      title: "Samsung S24 Ultra",
      offer: "Free Buds2 Pro",
      description: "AI Phone with S Pen",
      image: <FaBolt />,
      bgColor: "#0099FF"
    }
  ];

  // Auto slide banner
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Load admin-managed public catalog; fallback to bundled defaults on failure.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetchApiWithFallback(
          "/admin/public-products",
          { method: "GET" },
          0,
          0,
          3000
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (!Array.isArray(data?.products) || data.products.length === 0) return;

        const normalized = data.products
          .map(normalizeCatalogProduct)
          .filter(Boolean);
        if (!cancelled && normalized.length > 0) {
          setCatalogProducts(normalized);
        }
      } catch (_e) {
        // fallback to defaults
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load cart/wishlist from MongoDB for logged-in users
  useEffect(() => {
    let token = "";
    try {
      token = localStorage.getItem("token") || "";
    } catch (_) {
      token = "";
    }
    if (!token) return;

    (async () => {
      try {
        const res = await fetchApiWithFallback("/me", { headers: authHeaders() }, 1, 250, 2500);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (Array.isArray(data?.user?.cart)) {
          setCart(data.user.cart.map(normalizeServerItem));
        }
        if (Array.isArray(data?.user?.wishlist)) {
          setWishlist(data.user.wishlist.map(normalizeServerItem));
        }
        didLoadRemote.current = true;
      } catch (_) {
        // ignore
      }
    })();
  }, []);

  // Load support chat unread count (best-effort)
  useEffect(() => {
    let token = "";
    try {
      token = localStorage.getItem("token") || "";
    } catch (_) {
      token = "";
    }
    if (!token) return;

    (async () => {
      try {
        const res = await fetchApiWithFallback(
          "/support/chat?limit=1",
          { headers: authHeaders() },
          0,
          0,
          2500
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.chat) return;

        setSupportChat((prev) => ({
          ...prev,
          status: String(data.chat.status || prev.status),
          unreadForUser: Number(data.chat.unreadForUser || 0),
        }));
      } catch (_e) {
        // ignore
      }
    })();
  }, []);

  // Persist cart/wishlist to MongoDB (debounced)
  useEffect(() => {
    let token = "";
    try {
      token = localStorage.getItem("token") || "";
    } catch (_) {
      token = "";
    }
    if (!token) return;
    if (!didLoadRemote.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const cartRes = await fetchApiWithFallback("/cart", {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ items: cart }),
        }, 0, 0, 2500);
        if (!cartRes.ok) {
          console.error("Failed to save cart:", await cartRes.text());
        } else {
          console.log("Cart saved to MongoDB:", cart.length, "items");
        }

        const wishlistRes = await fetchApiWithFallback("/wishlist", {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ items: wishlist }),
        }, 0, 0, 2500);
        if (!wishlistRes.ok) {
          console.error("Failed to save wishlist:", await wishlistRes.text());
        } else {
          console.log("Wishlist saved to MongoDB:", wishlist.length, "items");
        }
      } catch (err) {
        console.error("Save error:", err);
      }
    }, 500);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [cart, wishlist]);

  // Notification handler
  const showToast = (message) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const formatChatTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const scrollSupportToBottom = () => {
    const el = supportScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    if (activeDrawer !== "support") return;
    const raf = requestAnimationFrame(scrollSupportToBottom);
    return () => cancelAnimationFrame(raf);
  }, [activeDrawer, supportTab, assistantMessages.length, supportChat.messages.length]);

  const makeChatId = (prefix) =>
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const askAssistant = async (prompt) => {
    const cleaned = String(prompt || "").trim();
    if (!cleaned) return;
    if (assistantSending) return;

    const now = new Date().toISOString();
    setAssistantMessages((prev) => [
      ...prev,
      { id: makeChatId("user"), sender: "user", text: cleaned, createdAt: now },
    ]);
    setAssistantInput("");
    setAssistantSending(true);

    try {
      const res = await fetchApiWithFallback(
        "/chatbot",
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ message: cleaned }),
        },
        0,
        0,
        8000
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Assistant failed (${res.status})`);
      }

      const reply = String(data.reply || "").trim() || "Sorry, I couldn’t generate a reply.";
      setAssistantSuggestions(Array.isArray(data.suggestions) ? data.suggestions.slice(0, 6) : []);
      setAssistantMessages((prev) => [
        ...prev,
        { id: makeChatId("bot"), sender: "bot", text: reply, createdAt: new Date().toISOString() },
      ]);
    } catch (e) {
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: makeChatId("bot"),
          sender: "bot",
          text: "I couldn’t reach the server. Please make sure the backend is running, then try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setAssistantSending(false);
    }
  };

  const onAssistantSubmit = (e) => {
    e.preventDefault();
    askAssistant(assistantInput);
  };

  const onAssistantSuggestion = (value) => {
    const suggestion = String(value || "").trim();
    if (!suggestion) return;
    if (/admin/i.test(suggestion)) {
      setSupportTab("admin");
      return;
    }
    askAssistant(suggestion);
  };

  const loadSupportChat = async ({ markRead = false } = {}) => {
    setSupportLoading(true);
    setSupportError("");
    try {
      const res = await fetchApiWithFallback(
        "/support/chat?limit=200",
        { headers: authHeaders() },
        0,
        0,
        7000
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Failed to load chat (${res.status})`);
      }

      const chat = data?.chat || {};
      setSupportChat({
        status: String(chat.status || "open"),
        unreadForUser: Number(chat.unreadForUser || 0),
        messages: Array.isArray(chat.messages) ? chat.messages : [],
      });

      if (markRead) {
        const markRes = await fetchApiWithFallback(
          "/support/chat/mark-read",
          { method: "POST", headers: authHeaders() },
          0,
          0,
          5000
        );
        if (markRes.ok) {
          setSupportChat((prev) => ({ ...prev, unreadForUser: 0 }));
        }
      }
    } catch (e) {
      setSupportError(e?.message || "Failed to load support chat");
    } finally {
      setSupportLoading(false);
    }
  };

  useEffect(() => {
    if (activeDrawer !== "support") return;
    if (supportTab !== "admin") return;
    loadSupportChat({ markRead: true });
  }, [activeDrawer, supportTab]);

  const sendSupportMessage = async (value) => {
    const text = String(value || "").trim();
    if (!text) return;
    if (supportSending) return;

    setSupportSending(true);
    setSupportError("");
    try {
      const res = await fetchApiWithFallback(
        "/support/chat/message",
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ text }),
        },
        0,
        0,
        7000
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Failed to send message (${res.status})`);
      }

      const chat = data?.chat || {};
      setSupportChat({
        status: String(chat.status || "open"),
        unreadForUser: Number(chat.unreadForUser || 0),
        messages: Array.isArray(chat.messages) ? chat.messages : [],
      });
      setSupportInput("");
    } catch (e) {
      setSupportError(e?.message || "Failed to send message");
    } finally {
      setSupportSending(false);
    }
  };

  const onSupportSubmit = (e) => {
    e.preventDefault();
    sendSupportMessage(supportInput);
  };

  // Cart functions (with limits)
  const getCartItemCount = () => cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const addToCart = (product) => {
    const totalItems = getCartItemCount();
    const existingItem = cart.find(item => item.id === product.id);
    const currentQty = existingItem ? (existingItem.quantity || 1) : 0;

    if (currentQty >= MAX_QUANTITY_PER_PHONE) {
      showToast(`Max ${MAX_QUANTITY_PER_PHONE} per phone. You have ${currentQty} of ${product.name}.`);
      return;
    }
    if (!existingItem && totalItems >= MAX_CART_ITEMS) {
      showToast(`Cart limit reached (max ${MAX_CART_ITEMS} items). Remove something to add more.`);
      return;
    }
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: Math.min(MAX_QUANTITY_PER_PHONE, (item.quantity || 1) + 1) }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    showToast(`${product.name} added to cart!`);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
    showToast('Item removed from cart');
  };

  const updateCartQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== productId) return item;
          const next = (item.quantity || 1) + delta;
          const qty = Math.max(1, Math.min(MAX_QUANTITY_PER_PHONE, next));
          return { ...item, quantity: qty };
        })
        .filter(Boolean)
    );
  };

  // Wishlist functions
  const toggleWishlist = (product) => {
    if (wishlist.find(item => item.id === product.id)) {
      setWishlist(wishlist.filter(item => item.id !== product.id));
      showToast('Removed from wishlist');
    } else {
      setWishlist([...wishlist, product]);
      showToast('Added to wishlist');
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some(item => item.id === productId);
  };

  // Compare functions
  const toggleCompare = (product) => {
    if (compare.find(item => item.id === product.id)) {
      setCompare(compare.filter(item => item.id !== product.id));
      showToast('Removed from compare');
    } else {
      if (compare.length < 3) {
        setCompare([...compare, product]);
        showToast('Added to compare');
      } else {
        showToast('Can only compare 3 items');
      }
    }
  };

  const isInCompare = (productId) => {
    return compare.some(item => item.id === productId);
  };

  // Format price
  const formatPrice = (price) => {
    return 'Rs ' + price.toLocaleString('en-IN');
  };

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );
  const shippingFee = cartSubtotal > 0 ? 99 : 0;
  const platformFee = cartSubtotal > 0 ? 10 : 0;
  const cartTotal = cartSubtotal + shippingFee + platformFee;

  const validatePayment = () => {
    if (cart.length === 0) return "Your cart is empty.";
    if (!checkout.address.trim()) return "Please enter delivery address.";
    const phoneDigits = checkout.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) return "Please enter a valid phone number.";

    if (checkout.method === "razorpay") {
      // No additional validation needed for Razorpay
      return "";
    }
    if (checkout.method === "upi") {
      const upi = checkout.upiId.trim();
      if (!upi || !upi.includes("@") || upi.length < 6) return "Enter a valid UPI ID (example@bank).";
    }
    if (checkout.method === "card") {
      const cardNo = checkout.cardNumber.replace(/\s/g, "");
      if (checkout.cardName.trim().length < 2) return "Enter cardholder name.";
      if (cardNo.length < 12) return "Enter a valid card number.";
      if (!/^\d{2}\/\d{2}$/.test(checkout.cardExp.trim())) return "Expiry must be MM/YY.";
      if (!/^\d{3,4}$/.test(checkout.cardCvv.trim())) return "Enter a valid CVV.";
    }
    return "";
  };

  const payNow = async () => {
    const err = validatePayment();
    setPayError(err);
    if (err) return;

    setIsPaying(true);
    try {
      let token = "";
      try {
        token = localStorage.getItem("token") || "";
      } catch (_) {
        token = "";
      }
      if (!token) {
        setPayError("Please login to place an order.");
        setIsPaying(false);
        return;
      }

      const method = checkout.method;

      // Handle Razorpay payment
      if (method === "razorpay") {
        await ensureRazorpaySdk();

        // Create Razorpay order
        const orderRes = await fetchApiWithFallback("/razorpay/create-order", {
          method: "POST",
          headers: authHeaders(),
        }, 2, 400, RAZORPAY_API_TIMEOUT_MS);

        const orderData = await orderRes.json().catch(() => ({}));
        if (!orderRes.ok) {
          setPayError(orderData.message || "Failed to create payment order");
          setIsPaying(false);
          return;
        }
        if (!orderData?.orderId || !orderData?.keyId || !orderData?.amount) {
          setPayError("Unable to start Razorpay checkout. Missing payment order details.");
          setIsPaying(false);
          return;
        }

        // Open Razorpay checkout
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "PhoneHub",
          description: `Order for ${cart.length} item(s)`,
          order_id: orderData.orderId,
          handler: async function (response) {
            setIsPaying(true);
            try {
              // Verify payment
              const verifyRes = await fetchApiWithFallback("/razorpay/verify-payment", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  phone: checkout.phone,
                  address: checkout.address,
                }),
              }, 2, 400, RAZORPAY_API_TIMEOUT_MS);

              const verifyData = await verifyRes.json().catch(() => ({}));
              if (!verifyRes.ok) {
                setPayError(verifyData.message || "Payment verification failed");
                setIsPaying(false);
                return;
              }

              showToast(`Payment successful: ${formatPrice(verifyData.total || cartTotal)}`);
              setCart([]);
              setActiveDrawer(null);
              setCheckout((prev) => ({
                ...prev,
                upiId: "",
                cardName: "",
                cardNumber: "",
                cardExp: "",
                cardCvv: "",
              }));
              setPayError("");
              setCurrentPage("home");
            } catch (err) {
              if (isAbortLikeError(err)) {
                setPayError("Payment verification timed out. Please check your orders after a minute.");
              } else {
                setPayError("Payment verification failed. Please contact support.");
              }
              console.error("Verification error:", err);
            } finally {
              setIsPaying(false);
            }
          },
          prefill: {
            name: profileData.displayName || "",
            email: profileData.email || "",
            contact: checkout.phone || "",
          },
          theme: {
            color: "#0066FF",
          },
          modal: {
            ondismiss: function () {
              setIsPaying(false);
            },
          },
        };

        if (!window.Razorpay) {
          throw new Error("Razorpay checkout is unavailable right now.");
        }
        const razorpay = new window.Razorpay(options);
        razorpay.on("payment.failed", function (response) {
          const description =
            response?.error?.description ||
            response?.error?.reason ||
            response?.error?.code ||
            "Unknown error";
          setPayError(`Payment failed: ${description}`);
          setIsPaying(false);
        });
        razorpay.open();
        return;
      }

      // Handle other payment methods (UPI, Card, COD)
      const cardNo = checkout.cardNumber.replace(/\s/g, "");
      const last4 = method === "card" ? cardNo.slice(-4) : "";

      const res = await fetchApiWithFallback("/checkout", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          phone: checkout.phone,
          address: checkout.address,
          paymentMethod: method,
          upiId: method === "upi" ? checkout.upiId : "",
          cardLast4: method === "card" ? last4 : "",
        }),
      }, 1, 250, 3000);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPayError(data.message || "Checkout failed");
        setIsPaying(false);
        return;
      }

      showToast(`Order placed: ${formatPrice(data.total || cartTotal)}`);
      setCart([]);
      setActiveDrawer(null);
      setCheckout((prev) => ({
        ...prev,
        upiId: "",
        cardName: "",
        cardNumber: "",
        cardExp: "",
        cardCvv: "",
      }));
      setPayError("");
      setCurrentPage("home");
    } catch (err) {
      const fallbackMessage = isAbortLikeError(err)
        ? "Payment request timed out. Please check internet and try again."
        : err?.message || "Payment failed. Please try again.";
      setPayError(fallbackMessage);
      console.error("Payment error:", err);
    } finally {
      setIsPaying(false);
    }
  };

  // Filter products (search, category, price range)
  const filteredProducts = catalogProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const selectedCategoryKey = categoryKey(selectedCategory);
    const productCategoryKey = categoryKey(resolveProductCategory(product));
    const productBrandKey = categoryKey(product.brand);
    const matchesCategory =
      selectedCategoryKey === "allphones" ||
      productCategoryKey === selectedCategoryKey ||
      productBrandKey === selectedCategoryKey;
    const min = priceMin === '' ? 0 : Number(priceMin) || 0;
    const max = priceMax === '' ? Infinity : Number(priceMax) || Infinity;
    const matchesPrice = product.price >= min && product.price <= max;
    return matchesSearch && matchesCategory && matchesPrice;
  });

  const categoryCounts = useMemo(() => {
    const counts = new Map();
    for (const product of catalogProducts) {
      const key = categoryKey(resolveProductCategory(product));
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [catalogProducts]);

  // Get cart count
  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const openDrawer = (drawer) => {
    setActiveDrawer(drawer);
  };

  const closeDrawer = () => {
    setActiveDrawer(null);
    setSelectedProduct(null);
    setPayError("");
  };

  const viewProductDetails = (product) => {
    if (!product) return;
    setSelectedProduct(product);
    openDrawer("details");
  };

  const goHome = () => {
    setCurrentPage("home");
    closeDrawer();
  };

  const goCategories = () => {
    setCurrentPage("categories");
    setIsSidebarOpen(true);
    closeDrawer();
  };

  const goCart = () => {
    setCurrentPage("cart");
    openDrawer("cart");
  };

  const goWishlist = () => {
    setCurrentPage("wishlist");
    openDrawer("wishlist");
  };

  const goProfile = () => {
    setCurrentPage("profile");
    openDrawer("profile");
  };

  const logout = () => {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } catch (_) {
      // ignore
    }
    navigate("/login");
  };

  const triggerProfileImagePicker = () => {
    profilePicInputRef.current?.click();
  };

  const onProfileImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image too large. Use an image below 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setProfileData((prev) => ({ ...prev, avatar: result }));
      showToast("Profile photo selected. Save profile to keep it.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const saveProfile = () => {
    const cleaned = {
      ...profileData,
      displayName: profileData.displayName.trim() || "Guest",
      email: profileData.email.trim(),
      phone: profileData.phone.trim(),
      address: profileData.address.trim(),
      bio: profileData.bio.trim(),
    };
    setProfileData(cleaned);

    try {
      localStorage.setItem("profile_settings", JSON.stringify(cleaned));

      const rawUser = localStorage.getItem("user");
      const userData = rawUser ? JSON.parse(rawUser) : {};
      const nextUser = {
        ...userData,
        username: cleaned.displayName || userData.username,
        name: cleaned.displayName || userData.name,
        email: cleaned.email || userData.email,
      };
      localStorage.setItem("user", JSON.stringify(nextUser));
    } catch (_) {
      // ignore local storage errors
    }

    setProfileSavedAt(new Date().toLocaleTimeString());
    showToast("Profile updated successfully.");
  };

  const resetProfile = () => {
    setProfileData((prev) => ({
      ...prev,
      phone: "",
      address: "",
      bio: "",
      avatar: "",
      notifications: true,
    }));
    showToast("Profile fields reset. Save profile to apply.");
  };

  // NOTE: Use render helper functions (not nested React components) to avoid
  // remounting large UI trees on state updates, which can reset scroll position.

  const renderNotification = () => (
    <div className={`notification ${showNotification ? 'show' : ''}`}>
      {notificationMessage}
    </div>
  );

  // ========== DRAWERS ==========
  const renderDrawerShell = ({ title, children }) => (
    <div className={`drawer-overlay ${activeDrawer ? "open" : ""}`} onClick={closeDrawer}>
      <aside className={`drawer ${activeDrawer ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">{title}</div>
          <button className="drawer-close" onClick={closeDrawer} aria-label="Close panel">
            <FaTimes />
          </button>
        </div>
        <div className="drawer-content">{children}</div>
      </aside>
    </div>
  );

  const renderCartDrawer = () =>
    renderDrawerShell({
      title: `Cart (${getCartCount()})`,
      children: cart.length === 0 ? (
        <div className="drawer-empty">
          <div className="drawer-empty-title">Your cart is empty</div>
          <div className="drawer-empty-subtitle">Add a phone to see it here.</div>
          <button className="drawer-primary" onClick={goHome}>Shop phones</button>
        </div>
      ) : (
        <>
          <div className="drawer-list">
            {cart.map((item) => (
              <div key={item.id} className="drawer-item">
                <img
                  className="drawer-item-img"
                  src={item.image || fallbackProductImage}
                  alt={item.name}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = fallbackProductImage;
                  }}
                />
                <div className="drawer-item-main">
                  <div className="drawer-item-name">{item.name}</div>
                  <div className="drawer-item-meta">
                    <span className="drawer-item-price">{formatPrice(item.price)}</span>
                    <span className="drawer-item-dot">|</span>
                    <span className="drawer-item-brand">{item.brand}</span>
                  </div>
                  <div className="drawer-qty">
                    <button className="qty-btn" onClick={() => updateCartQty(item.id, -1)}>-</button>
                    <span className="qty-val">{item.quantity || 1}</span>
                    <button className="qty-btn" onClick={() => updateCartQty(item.id, +1)}>+</button>
                    <button className="drawer-link" onClick={() => removeFromCart(item.id)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="checkout-box">
            <div className="checkout-title">Checkout</div>

            <div className="checkout-grid">
              <label className="field">
                <span>Phone</span>
                <input
                  value={checkout.phone}
                  onChange={(e) => setCheckout((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="10-digit mobile number"
                />
              </label>

              <label className="field">
                <span>Delivery address</span>
                <textarea
                  value={checkout.address}
                  onChange={(e) => setCheckout((p) => ({ ...p, address: e.target.value }))}
                  placeholder="House no, street, city, pincode"
                  rows={3}
                />
              </label>
            </div>

            <div className="payment-title">Payment method</div>
            <div className="payment-methods">
              <button
                className={`pay-chip ${checkout.method === "razorpay" ? "active" : ""}`}
                onClick={() => setCheckout((p) => ({ ...p, method: "razorpay" }))}
                type="button"
              >
                Razorpay
              </button>
              <button
                className={`pay-chip ${checkout.method === "upi" ? "active" : ""}`}
                onClick={() => setCheckout((p) => ({ ...p, method: "upi" }))}
                type="button"
              >
                UPI
              </button>
              <button
                className={`pay-chip ${checkout.method === "card" ? "active" : ""}`}
                onClick={() => setCheckout((p) => ({ ...p, method: "card" }))}
                type="button"
              >
                Card
              </button>
              <button
                className={`pay-chip ${checkout.method === "cod" ? "active" : ""}`}
                onClick={() => setCheckout((p) => ({ ...p, method: "cod" }))}
                type="button"
              >
                Cash on Delivery
              </button>
            </div>

            {checkout.method === "upi" && (
              <div className="payment-panel">
                <label className="field">
                  <span>UPI ID</span>
                  <input
                    value={checkout.upiId}
                    onChange={(e) => setCheckout((p) => ({ ...p, upiId: e.target.value }))}
                    placeholder="example@bank"
                  />
                </label>
              </div>
            )}

            {checkout.method === "card" && (
              <div className="payment-panel">
                <div className="checkout-grid">
                  <label className="field">
                    <span>Name on card</span>
                    <input
                      value={checkout.cardName}
                      onChange={(e) => setCheckout((p) => ({ ...p, cardName: e.target.value }))}
                      placeholder="Cardholder name"
                    />
                  </label>
                  <label className="field">
                    <span>Card number</span>
                    <input
                      value={checkout.cardNumber}
                      onChange={(e) => setCheckout((p) => ({ ...p, cardNumber: e.target.value }))}
                      placeholder="1234 5678 9012 3456"
                      inputMode="numeric"
                    />
                  </label>
                  <label className="field">
                    <span>Expiry (MM/YY)</span>
                    <input
                      value={checkout.cardExp}
                      onChange={(e) => setCheckout((p) => ({ ...p, cardExp: e.target.value }))}
                      placeholder="MM/YY"
                      inputMode="numeric"
                    />
                  </label>
                  <label className="field">
                    <span>CVV</span>
                    <input
                      value={checkout.cardCvv}
                      onChange={(e) => setCheckout((p) => ({ ...p, cardCvv: e.target.value }))}
                      placeholder="123"
                      inputMode="numeric"
                    />
                  </label>
                </div>
              </div>
            )}

            {checkout.method === "razorpay" && (
              <div className="payment-panel cod">
                Secure payment via Razorpay. You'll be redirected to Razorpay checkout.
              </div>
            )}

            {checkout.method === "cod" && (
              <div className="payment-panel cod">
                Pay when your order is delivered. (Extra Rs {platformFee} platform fee included.)
              </div>
            )}

            <div className="price-box">
              <div className="price-row">
                <span>Subtotal</span>
                <span>{formatPrice(cartSubtotal)}</span>
              </div>
              <div className="price-row">
                <span>Shipping</span>
                <span>Rs {shippingFee}</span>
              </div>
              <div className="price-row">
                <span>Platform fee</span>
                <span>Rs {platformFee}</span>
              </div>
              <div className="price-row total">
                <span>Total</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
            </div>

            {payError && <div className="pay-error">{payError}</div>}
          </div>

          <div className="drawer-footer">
            <button className="drawer-secondary" onClick={closeDrawer}>Continue shopping</button>
            <button className="drawer-primary" onClick={payNow} disabled={isPaying}>
              {isPaying ? "Processing..." : checkout.method === "cod" ? "Place order" : "Pay now"}
            </button>
          </div>
        </>
      ),
    });

  const renderWishlistDrawer = () =>
    renderDrawerShell({
      title: `Wishlist (${wishlist.length})`,
      children: wishlist.length === 0 ? (
        <div className="drawer-empty">
          <div className="drawer-empty-title">No wishlist items</div>
          <div className="drawer-empty-subtitle">Tap Wishlist on any phone to save it.</div>
          <button className="drawer-primary" onClick={goHome}>Browse phones</button>
        </div>
      ) : (
        <>
          <div className="drawer-list">
            {wishlist.map((item) => (
              <div key={item.id} className="drawer-item">
                <img
                  className="drawer-item-img"
                  src={item.image || fallbackProductImage}
                  alt={item.name}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = fallbackProductImage;
                  }}
                />
                <div className="drawer-item-main">
                  <div className="drawer-item-name">{item.name}</div>
                  <div className="drawer-item-meta">
                    <span className="drawer-item-price">{formatPrice(item.price)}</span>
                    <span className="drawer-item-dot">|</span>
                    <span className="drawer-item-brand">{item.brand}</span>
                  </div>
                  <div className="drawer-actions-row">
                    <button className="drawer-primary small" onClick={() => addToCart(item)}>Add to cart</button>
                    <button className="drawer-secondary small" onClick={() => toggleWishlist(item)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ),
    });

  const renderProfileDrawer = () =>
    renderDrawerShell({
      title: "Profile",
      children: (
        <div className="profile-card">
          <div className="profile-row">
            <div className="profile-avatar-lg">
              {profileData.avatar ? (
                <img src={profileData.avatar} alt="Profile" className="profile-avatar-img" />
              ) : (
                <FaUser />
              )}
            </div>
            <div className="profile-meta">
              <div className="profile-name">{profileData.displayName || "Guest"}</div>
              <div className="profile-email">{profileData.email || "Not signed in"}</div>
            </div>
          </div>

          <div className="profile-photo-actions">
            <input
              ref={profilePicInputRef}
              type="file"
              accept="image/*"
              className="profile-file-input"
              onChange={onProfileImagePick}
            />
            <button className="drawer-secondary small" onClick={triggerProfileImagePicker}>
              <FaCamera /> Change photo
            </button>
            <button
              className="drawer-secondary small"
              onClick={() => setProfileData((prev) => ({ ...prev, avatar: "" }))}
            >
              Remove photo
            </button>
          </div>

          <div className="profile-form">
            <label className="field">
              <span>Display name</span>
              <input
                value={profileData.displayName}
                onChange={(e) => setProfileData((prev) => ({ ...prev, displayName: e.target.value }))}
                placeholder="Your name"
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                value={profileData.email}
                onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="you@example.com"
              />
            </label>
            <label className="field">
              <span>Phone</span>
              <input
                value={profileData.phone}
                onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="10-digit mobile number"
              />
            </label>
            <label className="field">
              <span>Address</span>
              <textarea
                value={profileData.address}
                onChange={(e) => setProfileData((prev) => ({ ...prev, address: e.target.value }))}
                rows={2}
                placeholder="House no, street, city, pincode"
              />
            </label>
            <label className="field">
              <span>Bio</span>
              <textarea
                value={profileData.bio}
                onChange={(e) => setProfileData((prev) => ({ ...prev, bio: e.target.value }))}
                rows={2}
                placeholder="Short profile note"
              />
            </label>
          </div>

          <div className="profile-stats">
            <div className="profile-stat">
              <div className="profile-stat-label">Cart items</div>
              <div className="profile-stat-value">{getCartCount()}</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-label">Wishlist</div>
              <div className="profile-stat-value">{wishlist.length}</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-label">Compare</div>
              <div className="profile-stat-value">{compare.length}</div>
            </div>
          </div>

          {profileSavedAt && <div className="profile-saved">Saved at {profileSavedAt}</div>}

          <div className="profile-actions">
            <button className="drawer-secondary" onClick={resetProfile}>Reset</button>
            <button className="drawer-primary" onClick={saveProfile}>Save Profile</button>
            <button className="drawer-primary" onClick={logout}>Logout</button>
          </div>
        </div>
      ),
    });

  const renderDetailsDrawer = () => {
    if (!selectedProduct) return null;
    const product = selectedProduct;
    const productCategory = resolveProductCategory(product);

    return renderDrawerShell({
      title: product.name,
      children: (
        <div className="detail-card">
          <img
            className="detail-image"
            src={product.image || fallbackProductImage}
            alt={product.name}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = fallbackProductImage;
            }}
          />

          <div className="detail-meta">
            <div className="detail-brand">
              {product.brand} | {productCategory}
            </div>
            <div className="detail-rating">
              Rating {product.rating}/5 ({product.reviews} reviews)
            </div>
            <div className="detail-price">
              <span className="detail-price-main">{formatPrice(product.price)}</span>
              {product.originalPrice > product.price && (
                <span className="detail-price-old">{formatPrice(product.originalPrice)}</span>
              )}
            </div>
            <div className="detail-stock">
              {product.inStock ? "In stock" : "Out of stock"}
            </div>
          </div>

          <div className="detail-description">
            {product.description || "No description available for this phone yet."}
          </div>

          <div className="detail-specs">
            {Array.isArray(product.specs) && product.specs.length > 0 ? (
              product.specs.map((spec, index) => (
                <span key={`${product.id}-spec-${index}`} className="detail-spec-chip">
                  {spec}
                </span>
              ))
            ) : (
              <span className="detail-empty">No specs added.</span>
            )}
          </div>

          <div className="drawer-actions-row">
            <button className="drawer-primary" onClick={() => addToCart(product)}>
              Add to cart
            </button>
            <button className="drawer-secondary" onClick={() => toggleWishlist(product)}>
              {isInWishlist(product.id) ? "Remove wishlist" : "Add wishlist"}
            </button>
          </div>
        </div>
      ),
    });
  };

  const renderAssistantPanel = () => (
    <>
      <div className="support-status">
        <span>Assistant</span>
        <span>{assistantSending ? "Thinking…" : "Online"}</span>
      </div>

      <div className="support-chat-log" ref={supportScrollRef}>
        {assistantMessages.map((msg) => (
          <div key={msg.id} className={`support-bubble ${msg.sender}`}>
            <div className="support-bubble-meta">
              <span>{msg.sender === "user" ? "You" : "Assistant"}</span>
              <span>{formatChatTime(msg.createdAt)}</span>
            </div>
            <div className="support-bubble-text">{msg.text}</div>
          </div>
        ))}
      </div>

      <form className="support-input-row" onSubmit={onAssistantSubmit}>
        <input
          className="support-input"
          value={assistantInput}
          onChange={(e) => setAssistantInput(e.target.value)}
          placeholder="Ask something… (delivery, returns, payment, orders)"
          disabled={assistantSending}
        />
        <button
          className="support-send"
          type="submit"
          disabled={assistantSending || !assistantInput.trim()}
          aria-label="Send message"
        >
          <FaPaperPlane />
        </button>
      </form>

      {assistantSuggestions.length > 0 && (
        <div className="support-suggestions">
          {assistantSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="support-suggestion"
              onClick={() => onAssistantSuggestion(suggestion)}
              disabled={assistantSending}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </>
  );

  const renderAdminSupportPanel = () => (
    <>
      <div className="support-status">
        <span>Admin support ({supportChat.status === "closed" ? "Closed" : "Open"})</span>
        <span>{supportLoading ? "Loading…" : ""}</span>
      </div>

      {supportError && <div className="support-error">{supportError}</div>}

      <div className="support-chat-log" ref={supportScrollRef}>
        {supportChat.messages.length === 0 ? (
          <div className="drawer-empty">
            <div className="drawer-empty-title">No messages yet</div>
            <div className="drawer-empty-subtitle">Send a message and the admin will reply here.</div>
          </div>
        ) : (
          supportChat.messages.map((msg, index) => {
            const sender = msg.senderType === "user" ? "user" : "admin";
            const label = sender === "user" ? "You" : String(msg.senderName || "Admin");
            return (
              <div key={String(msg._id || `support-${index}`)} className={`support-bubble ${sender}`}>
                <div className="support-bubble-meta">
                  <span>{label}</span>
                  <span>{formatChatTime(msg.createdAt)}</span>
                </div>
                <div className="support-bubble-text">{msg.text}</div>
              </div>
            );
          })
        )}
      </div>

      <form className="support-input-row" onSubmit={onSupportSubmit}>
        <input
          className="support-input"
          value={supportInput}
          onChange={(e) => setSupportInput(e.target.value)}
          placeholder="Message the admin…"
          disabled={supportSending || supportLoading}
        />
        <button
          className="support-send"
          type="submit"
          disabled={supportSending || supportLoading || !supportInput.trim()}
          aria-label="Send message"
        >
          <FaPaperPlane />
        </button>
      </form>
    </>
  );

  const renderSupportDrawer = () =>
    renderDrawerShell({
      title: "Support",
      children: (
        <div>
          <div className="support-tabs">
            <button
              type="button"
              className={`support-tab ${supportTab === "assistant" ? "active" : ""}`}
              onClick={() => setSupportTab("assistant")}
            >
              <FaRobot />
              Assistant
            </button>
            <button
              type="button"
              className={`support-tab ${supportTab === "admin" ? "active" : ""}`}
              onClick={() => setSupportTab("admin")}
            >
              <FaComments />
              Admin
              {supportChat.unreadForUser > 0 && (
                <span className="support-tab-badge">{supportChat.unreadForUser}</span>
              )}
            </button>
          </div>

          {supportTab === "assistant" ? renderAssistantPanel() : renderAdminSupportPanel()}
        </div>
      ),
    });

  // ========== TOP NAVBAR ==========
  const renderTopNavbar = () => (
    <nav className="top-nav">
      <div className="nav-container">
        <div className="nav-left">
          <button className="menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <FaBars />
          </button>
          <div className="logo">
            <span className="logo-icon"><FaMobileAlt /></span>
            <span className="logo-text">Phone<span>Hub</span></span>
          </div>
        </div>

        <div className="nav-center">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search phones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="search-btn"><FaSearch /></button>
          </div>
        </div>

        <div className="nav-right">
          <button className="nav-icon-btn" onClick={goCart} aria-label="Open cart">
            <FaShoppingCart />
            {getCartCount() > 0 && <span className="badge">{getCartCount()}</span>}
          </button>
          <button className="nav-icon-btn" onClick={goWishlist} aria-label="Open wishlist">
            <FaHeart />
            {wishlist.length > 0 && <span className="badge">{wishlist.length}</span>}
          </button>
          <button
            className="nav-icon-btn"
            onClick={() => {
              setSupportTab("assistant");
              openDrawer("support");
            }}
            aria-label="Open support chat"
          >
            <FaComments />
            {supportChat.unreadForUser > 0 && <span className="badge">{supportChat.unreadForUser}</span>}
          </button>
          <button className="nav-icon-btn"><FaBell /></button>
          <button className="nav-icon-btn profile-btn" onClick={goProfile} aria-label="Open profile">
            <div className="profile-avatar">
              {profileData.avatar ? (
                <img src={profileData.avatar} alt="Profile" className="profile-avatar-img" />
              ) : (
                <FaUser />
              )}
            </div>
          </button>
        </div>
      </div>
    </nav>
  );

  // ========== LEFT SIDEBAR CATEGORIES ==========
  const renderCategorySidebar = () => (
    <aside className={`category-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
      <button
        type="button"
        className="sidebar-edge-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label={isSidebarOpen ? "Minimize sidebar" : "Expand sidebar"}
        title={isSidebarOpen ? "Minimize sidebar" : "Expand sidebar"}
      >
        {isSidebarOpen ? <FaChevronLeft /> : <FaChevronRight />}
      </button>
      <div className="sidebar-header">
        <h3>Categories</h3>
        <span className="category-count">{categories.length}</span>
      </div>
      
      <div className="category-list">
        {categories.map(category => (
          <div
            key={category.id}
            className={`category-item ${selectedCategory === category.name ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.name)}
          >
            <div className="category-item-left">
              <img
                className="category-icon"
                src={category.icon}
                alt={`${category.name} category`}
                width="24"
                height="24"
              />
              <span className="category-name">{category.name}</span>
            </div>
            <div className="category-item-right">
              <span className="category-count">
                {category.name === "All Phones"
                  ? catalogProducts.length
                  : (categoryCounts.get(categoryKey(category.name)) || 0)}
              </span>
              {selectedCategory === category.name && (
                <span className="active-indicator"></span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="filter-section">
          <h4>Price Range</h4>
          <div className="price-range">
            <div className="price-inputs">
              <input
                type="number"
                placeholder="Min Rs"
                className="price-input"
                min={0}
                max={200000}
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max Rs"
                className="price-input"
                min={0}
                max={200000}
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="clear-price-btn"
              onClick={() => { setPriceMin(''); setPriceMax(''); }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="filter-section">
          <h4>Brands</h4>
          <div className="brand-filters">
            {categories.slice(1, 5).map(cat => (
              <label key={cat.id} className="checkbox-label">
                <input type="checkbox" /> {cat.name}
              </label>
            ))}
          </div>
        </div>

        <button className="apply-filters-btn">Apply Filters</button>
      </div>
    </aside>
  );

  // ========== HERO BANNER ==========
  const renderHeroBanner = () => (
    <div className="hero-banner">
      <div 
        key={currentSlide}
        className="hero-slide"
        style={{
          "--hero-accent": heroSlides[currentSlide].bgColor
        }}
      >
        <div className="hero-content">
          <span className="hero-tag">{heroSlides[currentSlide].offer}</span>
          <h1>{heroSlides[currentSlide].title}</h1>
          <p>{heroSlides[currentSlide].description}</p>
          <div className="hero-buttons">
            <button className="btn-primary">Buy Now -&gt;</button>
            <button
              className="btn-secondary"
              onClick={() => {
                if (filteredProducts[0]) {
                  viewProductDetails(filteredProducts[0]);
                } else {
                  showToast("No phone available to view right now.");
                }
              }}
            >
              View Details
            </button>
          </div>
        </div>
        <div className="hero-image">
          <span className="hero-emoji">{heroSlides[currentSlide].image}</span>
        </div>
      </div>
      <div className="slide-indicators">
        {heroSlides.map((_, index) => (
          <span
            key={index}
            className={`indicator ${index === currentSlide ? 'active' : ''}`}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>
    </div>
  );

  // ========== PRODUCT CARD (CSS hover; no local state) ==========
  const renderProductCard = (product) => (
      <div className="product-card" key={product.id}>
        {product.discount && (
          <div className="discount-badge">{product.discount}</div>
        )}
        
        <div className="product-image-container">
          <img
            src={product.image || fallbackProductImage}
            alt={product.name}
            className="product-image"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = fallbackProductImage;
            }}
          />
        </div>

        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <span className="product-brand">{product.brand}</span>

          <div className="product-rating">
            <span className="stars">
              Rating {product.rating}/5
            </span>
            <span className="rating-count">({product.reviews})</span>
          </div>

          <div className="product-specs">
            {product.specs.map((spec, i) => (
              <span key={i} className="spec-tag">{spec}</span>
            ))}
          </div>

          <div className="product-price">
            <span className="current-price">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="original-price">{formatPrice(product.originalPrice)}</span>
            )}
          </div>

          <div className="product-actions">
            <button className="btn-view" onClick={() => viewProductDetails(product)}>
              View
            </button>
            <button className="btn-cart" onClick={() => addToCart(product)} aria-label="Add to cart">
              <FaShoppingCart className="action-icon" />
            </button>
            <button 
              className={`btn-wishlist ${isInWishlist(product.id) ? 'active' : ''}`}
              onClick={() => toggleWishlist(product)}
              aria-label="Add to wishlist"
            >
              <FaHeart className="action-icon" />
            </button>
            <button 
              className={`btn-compare ${isInCompare(product.id) ? 'active' : ''}`}
              onClick={() => toggleCompare(product)}
              aria-label="Add to compare"
            >
              <FaExchangeAlt className="action-icon" />
            </button>
          </div>
        </div>
      </div>
  );

  // Scroll to product grid (used by Hot Deals "Grab Now")
  const scrollToProducts = () => {
    const el = document.getElementById("product-section");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ========== DEALS SECTION ==========
  const renderDealsSection = () => (
    <section className="deals-section">
      <h2>Hot Deals</h2>
      <div className="deals-scroll">
        {deals.map(deal => (
          <div key={deal.id} className="deal-card" style={{ borderColor: deal.color }}>
            <span className="deal-icon"><FaBolt /></span>
            <h3>{deal.title}</h3>
            <p>{deal.discount}</p>
            <button
              type="button"
              className="deal-btn"
              onClick={() => {
                showToast(`${deal.title} - Check out featured phones below!`);
                scrollToProducts();
              }}
            >
              Grab Now
            </button>
          </div>
        ))}
      </div>
    </section>
  );

  // ========== PRODUCT GRID ==========
  const renderProductGrid = () => (
    <section id="product-section" className="product-section">
      <div className="section-header">
        <h2>Featured Phones ({filteredProducts.length})</h2>
        <div className="header-filters">
          <select className="filter-select">
            <option>Popular</option>
            <option>Newest</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
          </select>
        </div>
      </div>

      <div className="product-grid">
        {filteredProducts.map((product) => renderProductCard(product))}
      </div>
    </section>
  );

  // ========== BOTTOM NAVIGATION ==========
  const renderBottomNav = () => (
    <nav className="bottom-nav">
      <button
        className={`bottom-nav-item ${currentPage === "home" ? "active" : ""}`}
        onClick={goHome}
      >
        <span className="nav-icon"><FaHome /></span>
        <span className="nav-label">Home</span>
      </button>
      <button
        className={`bottom-nav-item ${currentPage === "categories" ? "active" : ""}`}
        onClick={goCategories}
      >
        <span className="nav-icon"><FaMobileAlt /></span>
        <span className="nav-label">Category</span>
      </button>
      <button
        className={`bottom-nav-item ${currentPage === "cart" ? "active" : ""}`}
        onClick={goCart}
      >
        <span className="nav-icon"><FaShoppingCart /></span>
        <span className="nav-label">Cart</span>
        {getCartCount() > 0 && <span className="nav-badge">{getCartCount()}</span>}
      </button>
      <button
        className={`bottom-nav-item ${currentPage === "wishlist" ? "active" : ""}`}
        onClick={goWishlist}
      >
        <span className="nav-icon"><FaHeart /></span>
        <span className="nav-label">Wishlist</span>
        {wishlist.length > 0 && <span className="nav-badge">{wishlist.length}</span>}
      </button>
      <button
        className={`bottom-nav-item ${currentPage === "profile" ? "active" : ""}`}
        onClick={goProfile}
      >
        <span className="nav-icon"><FaUser /></span>
        <span className="nav-label">Profile</span>
      </button>
    </nav>
  );

  // ========== MAIN RENDER ==========
  return (
    <div className="dashboard">
      {renderNotification()}
      {renderTopNavbar()}
      {activeDrawer === "cart" && renderCartDrawer()}
      {activeDrawer === "wishlist" && renderWishlistDrawer()}
      {activeDrawer === "profile" && renderProfileDrawer()}
      {activeDrawer === "details" && renderDetailsDrawer()}
      {activeDrawer === "support" && renderSupportDrawer()}
      
      <div className="dashboard-layout">
        {renderCategorySidebar()}
        
        <main className="main-content">
          {currentPage === "home" && (
            <>
              {renderHeroBanner()}
              {renderDealsSection()}
              {renderProductGrid()}
            </>
          )}

          {currentPage !== "home" && (
            <>
              <div className="page-head">
                <div className="page-title">
                  {currentPage === "categories" && "Categories"}
                  {currentPage === "cart" && "Cart"}
                  {currentPage === "wishlist" && "Wishlist"}
                  {currentPage === "profile" && "Profile"}
                </div>
                <div className="page-subtitle">
                  {currentPage === "categories" && "Choose a category from the left sidebar."}
                  {currentPage === "cart" && "Your items are in the cart panel."}
                  {currentPage === "wishlist" && "Saved items are in the wishlist panel."}
                  {currentPage === "profile" && "Profile info is in the profile panel."}
                </div>
              </div>
              {renderProductGrid()}
            </>
          )}
        </main>
      </div>

      {renderBottomNav()}
    </div>
  );
};

export default Dashboard;
