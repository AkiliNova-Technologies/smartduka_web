"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useAuth } from "@/providers/AuthProvider";
import { fetchApi, authHeaders } from "@/lib/providers/useProviderFetch";
import { toast } from "sonner";
import { trackProductViewAction } from "@/actions/recently-viewed";
import { getRecentlyViewedAction } from "@/actions/recently-viewed";

export interface UserSettings {
  id: string;
  userId: string;
  fullName: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
  currency: string;
  primaryLanguage: string;
  deliveryDistrict: string | null;
  momoNetwork: string | null;
  momoNumber: string | null;
  orderAlertsEmail: boolean;
  orderAlertsPush: boolean;
  securityAlertsSMS: boolean;
  marketingNewsletter: boolean;
  twoFactorEnabled: boolean;
  buyerProtectionEnabled: boolean;
}

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  vendorId: string;
  vendorName: string;
}

export interface WishlistItem {
  productId: string;
  name: string;
  slug?: string;
  brand?: string | null;
  image: string;
  price: number;
  basePrice?: number;
  compareAtPrice?: number | null;
  vendorId?: string;
  vendorName?: string;
  addedAt: string;
}

export interface UserOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: { productId: string; name: string; quantity: number; price: number }[];
}

export interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

interface RecentlyViewedProduct {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  image: string;
  vendorId: string;
  vendorName: string;
  rating: number;
  reviews: number;
  viewedAt: string;
}

interface UserDataContextType {
  settings: UserSettings;
  settingsLoading: boolean;
  settingsSaving: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  refreshSettings: () => void;
  cart: CartItem[];
  cartLoading: boolean;
  cartCount: number;
  cartTotal: number;
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
  wishlist: WishlistItem[];
  wishlistLoading: boolean;
  wishlistCount: number;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (productId: string) => void;
  refreshWishlist: () => Promise<void>;
  orders: UserOrder[];
  ordersLoading: boolean;
  refreshOrders: () => Promise<void>;
  placeOrder: (input: {
    items: { productId: string; quantity: number; price: number; vendorId: string }[];
    shippingAddress: string;
    shippingPhone: string;
    paymentGateway: "CASH_ON_DELIVERY" | "MTN_MOMO" | "AIRTEL_MONEY";
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  notifications: UserNotification[];
  unreadCount: number;
  notificationsLoading: boolean;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => Promise<void>;
  recentlyViewedIds: string[];
  recentlyViewedProducts: RecentlyViewedProduct[];
  recentlyViewedLoading: boolean;
  trackProductView: (productId: string) => void;
}

const defaultSettings: UserSettings = {
  id: "",
  userId: "",
  fullName: null,
  phoneNumber: null,
  avatarUrl: null,
  currency: "UGX",
  primaryLanguage: "en",
  deliveryDistrict: null,
  momoNetwork: null,
  momoNumber: null,
  orderAlertsEmail: true,
  orderAlertsPush: true,
  securityAlertsSMS: true,
  marketingNewsletter: false,
  twoFactorEnabled: false,
  buyerProtectionEnabled: true,
};

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { uid, isAuthenticated, loading: authLoading } = useAuth();

  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!uid) return;
    setSettingsLoading(true);
    try {
      const data = await fetchApi<UserSettings>("/api/settings", { headers: authHeaders(uid) });
      setSettings(data);
    } catch {
      // Keep defaults on error
    } finally {
      setSettingsLoading(false);
    }
  }, [uid]);

  const refreshSettings = useCallback(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (updates: Partial<UserSettings>) => {
      if (!uid) return;
      setSettingsSaving(true);
      const previous = { ...settings };
      setSettings((prev) => ({ ...prev, ...updates }));
      try {
        const data = await fetchApi<UserSettings>("/api/settings", {
          method: "PATCH",
          headers: authHeaders(uid),
          body: JSON.stringify(updates),
        });
        setSettings(data);
        toast.success("Settings saved.");
      } catch {
        setSettings(previous);
        toast.error("Failed to save settings.");
      } finally {
        setSettingsSaving(false);
      }
    },
    [uid, settings],
  );

  const [cart, setCart] = useState<CartItem[]>(() =>
    loadFromStorage<CartItem[]>("smartduka-cart", []),
  );
  const [cartLoading] = useState(false);

  useEffect(() => {
    saveToStorage("smartduka-cart", cart);
  }, [cart]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === item.productId);
        if (existing) {
          return prev.map((i) =>
            i.productId === item.productId ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i,
          );
        }
        return [...prev, { ...item, quantity: item.quantity || 1 }];
      });
      toast.success("Added to cart");
    },
    [],
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateCartQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(productId);
        return;
      }
      setCart((prev) =>
        prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
      );
    },
    [removeFromCart],
  );

  const clearCart = useCallback(() => setCart([]), []);
  const refreshCart = useCallback(async () => {}, []);

  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const wishlistCount = wishlist.length;

  const fetchWishlist = useCallback(async () => {
    if (!uid) return;
    setWishlistLoading(true);
    try {
      const data = await fetchApi<{ items: WishlistItem[] }>("/api/wishlist", { headers: authHeaders(uid) });
      setWishlist(data.items || []);
    } catch {
      // Silent
    } finally {
      setWishlistLoading(false);
    }
  }, [uid]);

  const refreshWishlist = useCallback(async () => {
    await fetchWishlist();
  }, [fetchWishlist]);

  const isWishlisted = useCallback(
    (productId: string) => wishlist.some((item) => item.productId === productId),
    [wishlist],
  );

  const toggleWishlist = useCallback(
    async (item: WishlistItem) => {
      const exists = wishlist.some((i) => i.productId === item.productId);
      if (exists) {
        setWishlist((prev) => prev.filter((i) => i.productId !== item.productId));
        toast.success("Removed from wishlist");
      } else {
        setWishlist((prev) => [...prev, { ...item, addedAt: new Date().toISOString() }]);
        toast.success("Added to wishlist");
      }
      try {
        const response = await fetch("/api/wishlist", {
          method: "POST",
          headers: authHeaders(uid),
          body: JSON.stringify({ productId: item.productId }),
        });
        if (!response.ok) {
          await fetchWishlist();
          toast.error("Failed to update wishlist");
        }
      } catch {
        await fetchWishlist();
      }
    },
    [uid, wishlist, fetchWishlist],
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      setWishlist((prev) => prev.filter((i) => i.productId !== productId));
      toast.success("Removed from wishlist");
      try {
        const response = await fetch("/api/wishlist", {
          method: "DELETE",
          headers: authHeaders(uid),
          body: JSON.stringify({ productId }),
        });
        if (response.ok) {
          await fetchWishlist();
        }
      } catch {
        await fetchWishlist();
      }
    },
    [uid, fetchWishlist],
  );

  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const refreshOrders = useCallback(async () => {
    if (!uid) return;
    setOrdersLoading(true);
    try {
      const data = await fetchApi<{ orders: UserOrder[] }>("/api/orders", { headers: authHeaders(uid) });
      setOrders(data.orders || []);
    } catch {
      // Silent
    } finally {
      setOrdersLoading(false);
    }
  }, [uid]);

  const placeOrder = useCallback(
    async (input: {
      items: { productId: string; quantity: number; price: number; vendorId: string }[];
      shippingAddress: string;
      shippingPhone: string;
      paymentGateway: "CASH_ON_DELIVERY" | "MTN_MOMO" | "AIRTEL_MONEY";
      notes?: string;
    }) => {
      if (!uid) return { success: false, error: "Not authenticated" };
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: authHeaders(uid),
          body: JSON.stringify(input),
        });
        if (response.ok) {
          await refreshOrders();
          return { success: true };
        }
        const body = await response.json().catch(() => ({}));
        return { success: false, error: body.error || "Failed to place order" };
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to place order",
        };
      }
    },
    [uid, refreshOrders],
  );

  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
    );
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!uid) return;
    setNotificationsLoading(true);
    try {
      const data = await fetchApi<{ notifications: UserNotification[] }>(
        "/api/notifications",
        { headers: authHeaders(uid) },
      );
      setNotifications(data.notifications || []);
    } catch {
      // Silent
    } finally {
      setNotificationsLoading(false);
    }
  }, [uid]);

  // ==========================================
  // RECENTLY VIEWED
  // ==========================================

  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() =>
    loadFromStorage<string[]>("smartduka-recently-viewed", []),
  );
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<RecentlyViewedProduct[]>([]);
  const [recentlyViewedLoading, setRecentlyViewedLoading] = useState(false);

  useEffect(() => {
    saveToStorage("smartduka-recently-viewed", recentlyViewedIds);
  }, [recentlyViewedIds]);

  const trackProductView = useCallback(
    (productId: string) => {
      setRecentlyViewedIds((prev) => {
        const filtered = prev.filter((id) => id !== productId);
        return [productId, ...filtered].slice(0, 10);
      });
      if (uid) {
        trackProductViewAction(productId).catch(() => {});
      }
    },
    [uid],
  );

  const fetchRecentlyViewedRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    fetchRecentlyViewedRef.current = async () => {
      if (!uid || recentlyViewedIds.length === 0) {
        setRecentlyViewedProducts([]);
        return;
      }
      setRecentlyViewedLoading(true);
      try {
        const result = await getRecentlyViewedAction(10);
        if (result.success) {
          setRecentlyViewedProducts(result.data);
        }
      } catch {
        // Non-critical
      } finally {
        setRecentlyViewedLoading(false);
      }
    };
  }, [uid, recentlyViewedIds]);

  const mergeRecentlyViewedRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    mergeRecentlyViewedRef.current = async () => {
      if (!uid || recentlyViewedIds.length === 0) return;
      try {
        const { mergeGuestViewsAction } = await import("@/actions/recently-viewed");
        await mergeGuestViewsAction(recentlyViewedIds);
        await fetchRecentlyViewedRef.current();
      } catch {
        // Non-critical
      }
    };
  }, [uid, recentlyViewedIds]);

  const mergeRanRef = useRef(false);
  const prevUidRef = useRef(uid);

  useEffect(() => {
    const wasLoggedIn = !!prevUidRef.current;
    const isNowLoggedIn = !!uid;
    prevUidRef.current = uid;

    if (isNowLoggedIn && recentlyViewedIds.length > 0 && !mergeRanRef.current) {
      mergeRanRef.current = true;
      mergeRecentlyViewedRef.current();
    }

    if (!isNowLoggedIn && wasLoggedIn) {
      mergeRanRef.current = false;
      setRecentlyViewedProducts([]);
    }
  }, [uid, recentlyViewedIds.length]);

  const prevIdCountRef = useRef(0);

  useEffect(() => {
    if (uid && recentlyViewedIds.length !== prevIdCountRef.current) {
      prevIdCountRef.current = recentlyViewedIds.length;
      fetchRecentlyViewedRef.current();
    }
  }, [uid, recentlyViewedIds.length]);

  // ==========================================
  // AUTH-DEPENDENT DATA FETCHING
  // ==========================================

  const prevAuthRef = useRef({ loading: authLoading, isAuth: isAuthenticated, uid });

  useEffect(() => {
    const prev = prevAuthRef.current;
    prevAuthRef.current = { loading: authLoading, isAuth: isAuthenticated, uid };

    if (!authLoading && isAuthenticated && uid) {
      queueMicrotask(() => {
        fetchSettings();
        fetchWishlist();
        refreshOrders();
      });
    }

    if (!authLoading && !isAuthenticated && prev.isAuth) {
      setSettings(defaultSettings);
      setWishlist([]);
      setOrders([]);
      setNotifications([]);
    }
  }, [authLoading, isAuthenticated, uid, fetchSettings, fetchWishlist, refreshOrders]);

  return (
    <UserDataContext.Provider
      value={{
        settings,
        settingsLoading,
        settingsSaving,
        updateSettings,
        refreshSettings,
        cart,
        cartLoading,
        cartCount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        refreshCart,
        wishlist,
        wishlistLoading,
        wishlistCount,
        isWishlisted,
        toggleWishlist,
        removeFromWishlist,
        refreshWishlist,
        orders,
        ordersLoading,
        refreshOrders,
        placeOrder,
        notifications,
        unreadCount,
        notificationsLoading,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        recentlyViewedIds,
        recentlyViewedProducts,
        recentlyViewedLoading,
        trackProductView,
      }}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error("useUserData must be used within a UserDataProvider");
  }
  return context;
}