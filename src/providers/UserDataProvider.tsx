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
import type { MarketplaceProduct } from "@/components/marketplace/product-card";

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
  /** Display-only snapshot; checkout derives ownership and price on the server. */
  variantId?: string | null;
  variantName?: string | null;
  variantOptions?: Record<string, string> | null;
}

export interface WishlistItem extends Omit<MarketplaceProduct, "id"> {
  id?: string;
  productId: string;
  price: number;
  addedAt: string;
}

export interface UserOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentGateway: string;
  totalAmount: number;
  subTotal: number;
  totalShipping: number;
  createdAt: string;
  items: { id: string; productId: string; subOrderId: string; name: string; variantName: string | null; quantity: number; price: number; image: string | null; vendorName: string; canReview: boolean; review: { id: string; rating: number; title: string | null; comment: string | null; imageUrls: string[] } | null }[];
  subOrders: { id: string; status: string; subOrderNumber: string; vendorName: string; canReview: boolean; review: { id: string; rating: number; comment: string | null } | null }[];
}

export interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionPath?: string | null;
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
  removeFromCart: (productId: string, variantId?: string | null) => void;
  updateCartQuantity: (productId: string, quantity: number, variantId?: string | null) => void;
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
    items: { productId: string; variantId?: string | null; quantity: number }[];
    shippingAddress: string;
    shippingPhone: string;
    fulfillmentSelections?: { vendorId: string; method: "DELIVERY" | "PICKUP" }[];
    paymentGateway: "PESAPAL";
    checkoutRequestId: string;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string; orderId?: string }>;
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
      const data = await fetchApi<UserSettings>("/api/settings", { headers: authHeaders() });
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
          headers: authHeaders(),
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

  // Keep server and first client renders identical; load browser storage after hydration.
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(true);
  const cartHydratedRef = useRef(false);

  useEffect(() => {
    queueMicrotask(() => {
      setCart(loadFromStorage<CartItem[]>("smartduka-cart", []));
      cartHydratedRef.current = true;
      setCartLoading(false);
    });
  }, []);

  useEffect(() => {
    if (cartHydratedRef.current) saveToStorage("smartduka-cart", cart);
  }, [cart]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === item.productId && (i.variantId ?? null) === (item.variantId ?? null));
        if (existing) {
          return prev.map((i) =>
            i.productId === item.productId && (i.variantId ?? null) === (item.variantId ?? null) ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i,
          );
        }
        return [...prev, { ...item, quantity: item.quantity || 1 }];
      });
      toast.success("Added to cart");
    },
    [],
  );

  const removeFromCart = useCallback((productId: string, variantId?: string | null) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId || (i.variantId ?? null) !== (variantId ?? null)));
  }, []);

  const updateCartQuantity = useCallback(
    (productId: string, quantity: number, variantId?: string | null) => {
      if (quantity <= 0) {
        removeFromCart(productId, variantId);
        return;
      }
      setCart((prev) =>
        prev.map((i) => (i.productId === productId && (i.variantId ?? null) === (variantId ?? null) ? { ...i, quantity } : i)),
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
      const data = await fetchApi<{ items: WishlistItem[] }>("/api/wishlist", { headers: authHeaders() });
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
          headers: authHeaders(),
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
          headers: authHeaders(),
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
      const data = await fetchApi<{ orders: UserOrder[] }>("/api/orders", { headers: authHeaders() });
      setOrders(data.orders || []);
    } catch {
      // Silent
    } finally {
      setOrdersLoading(false);
    }
  }, [uid]);

  const placeOrder = useCallback(
    async (input: {
      items: { productId: string; variantId?: string | null; quantity: number }[];
      shippingAddress: string;
      shippingPhone: string;
      fulfillmentSelections?: { vendorId: string; method: "DELIVERY" | "PICKUP" }[];
      paymentGateway: "PESAPAL";
      checkoutRequestId: string;
      notes?: string;
    }) => {
      if (!uid) return { success: false, error: "Not authenticated" };
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(input),
        });
        if (response.ok) {
          const body = await response.json().catch(() => ({}));
          await refreshOrders();
          return {
            success: true,
            orderId: typeof body?.data?.order?.id === "string" ? body.data.order.id : undefined,
          };
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
        { headers: authHeaders() },
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
  const [recentlyViewedTimestamps, setRecentlyViewedTimestamps] = useState<Record<string, string>>(() =>
    loadFromStorage<Record<string, string>>("smartduka-recently-viewed-timestamps", {}),
  );
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<RecentlyViewedProduct[]>([]);
  const [recentlyViewedLoading, setRecentlyViewedLoading] = useState(false);

  useEffect(() => {
    saveToStorage("smartduka-recently-viewed", recentlyViewedIds);
  }, [recentlyViewedIds]);
  useEffect(() => {
    saveToStorage("smartduka-recently-viewed-timestamps", recentlyViewedTimestamps);
  }, [recentlyViewedTimestamps]);

  const trackProductView = useCallback(
    (productId: string) => {
      setRecentlyViewedIds((prev) => {
        const filtered = prev.filter((id) => id !== productId);
        return [productId, ...filtered].slice(0, 24);
      });
      setRecentlyViewedTimestamps((prev) => ({ ...prev, [productId]: new Date().toISOString() }));
      if (uid) {
        trackProductViewAction(productId).catch(() => {});
      }
    },
    [uid],
  );

  const fetchRecentlyViewedRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    fetchRecentlyViewedRef.current = async () => {
      if (!uid) {
        setRecentlyViewedProducts([]);
        return;
      }
      setRecentlyViewedLoading(true);
      try {
        const result = await getRecentlyViewedAction(12);
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

  useEffect(() => {
    if (uid) fetchRecentlyViewedRef.current();
  }, [uid, recentlyViewedIds]);

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
