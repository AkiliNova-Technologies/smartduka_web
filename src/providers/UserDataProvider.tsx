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
import { useAppearance } from "@/providers/AppearanceProvider";
import { getPersonalityToastMessage } from "@/lib/personality-messages";
import { NotificationClient } from "@/lib/notification-client";

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
  promotionalInAppNotifications: boolean;
  shoppingRecommendations: boolean;
  promotionalPushNotifications: boolean;
  twoFactorEnabled: boolean;
  buyerProtectionEnabled: boolean;
  themeMode: "system" | "light" | "dark";
  accentColor: "classic" | "rose" | "berry" | "plum" | "violet" | "emerald" | "teal" | "coral";
  personality: "LOVELY" | "ELEGANT" | "PLAYFUL" | "CLASSIC";
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
  taxAmount: number;
  discountAmount: number;
  createdAt: string;
  notes: string | null;
  items: { id: string; productId: string; subOrderId: string; name: string; variantName: string | null; variantOptions: Record<string, string> | null; quantity: number; price: number; lineTotal: number; image: string | null; vendorName: string; canReview: boolean; review: { id: string; rating: number; title: string | null; comment: string | null; imageUrls: string[] } | null }[];
  subOrders: { id: string; status: string; fulfillmentStatus: string; subOrderNumber: string; vendorName: string; subTotal: number; shipping: number; total: number; fulfillmentMethod: "DELIVERY" | "PICKUP"; fulfillmentFee: number; branchName: string | null; deliveryAddress: string | null; deliveryInstructions: string | null; estimatedDelivery: string | null; fulfillmentContact: string; pickupLocation: string | null; pickupDirections: string | null; pickupInstructions: string | null; paymentOptions: ("MTN_MOMO" | "AIRTEL_MONEY")[]; paymentIntents: { id: string; provider: "MTN_MOMO" | "AIRTEL_MONEY" | "PESAPAL"; status: string; amount: number; currency: string; providerReference: string | null; updatedAt: string }[]; canReview: boolean; review: { id: string; rating: number; comment: string | null } | null }[];
}

export interface UserNotification {
  id: string;
  source: "PERSONAL" | "ANNOUNCEMENT" | "MARKETING";
  category: string;
  eventType: string | null;
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
  updateSettings: (updates: Partial<UserSettings>) => Promise<boolean>;
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
    shippingAddress?: string;
    shippingPhone: string;
    deliveryDistrict?: string;
    fulfillmentSelections?: { vendorId: string; method: "DELIVERY" | "PICKUP"; branchId?: string; pickupContact?: string }[];
    paymentGateway: "MTN_MOMO" | "AIRTEL_MONEY";
    checkoutRequestId: string;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string; orderId?: string }>;
  notifications: UserNotification[];
  unreadCount: number;
  notificationsLoading: boolean;
  notificationsError: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAsUnread: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isNotificationMutating: (notificationId: string) => boolean;
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
  promotionalInAppNotifications: false,
  shoppingRecommendations: false,
  promotionalPushNotifications: false,
  twoFactorEnabled: false,
  buyerProtectionEnabled: true,
  themeMode: "system",
  accentColor: "classic",
  personality: "LOVELY",
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
  const { uid, isAuthenticated, loading: authLoading, sessionReady, sessionRevision } = useAuth();
  const { personality } = useAppearance();

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
      if (!uid) return false;
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
        const profileUpdate = Object.keys(updates).some((key) => ["fullName", "phoneNumber", "avatarUrl"].includes(key));
        toast.success(getPersonalityToastMessage(profileUpdate ? "toast.profile.updated" : "toast.preferences.updated", personality));
        return true;
      } catch (error) {
        setSettings(previous);
        toast.error(error instanceof Error ? error.message : "Failed to save settings.", {
          description: "Your changes are still here. Please try again.",
        });
        return false;
      } finally {
        setSettingsSaving(false);
      }
    },
    [uid, settings, personality],
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
      toast.success(getPersonalityToastMessage("toast.cart.added", personality));
    },
    [personality],
  );

  const removeFromCart = useCallback((productId: string, variantId?: string | null) => {
    const exists = cart.some((item) => item.productId === productId && (item.variantId ?? null) === (variantId ?? null));
    if (!exists) return;
    setCart((prev) => prev.filter((i) => i.productId !== productId || (i.variantId ?? null) !== (variantId ?? null)));
    toast.success(getPersonalityToastMessage("toast.cart.removed", personality));
  }, [cart, personality]);

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
      } else {
        setWishlist((prev) => [...prev, { ...item, addedAt: new Date().toISOString() }]);
      }
      try {
        const response = await fetch("/api/wishlist", {
          method: exists ? "DELETE" : "POST",
          headers: authHeaders(),
          body: JSON.stringify({ productId: item.productId }),
        });
        if (!response.ok) {
          await fetchWishlist();
          toast.error("Failed to update wishlist");
          return;
        }
        toast.success(getPersonalityToastMessage(exists ? "toast.wishlist.removed" : "toast.wishlist.added", personality));
      } catch {
        await fetchWishlist();
      }
    },
    [wishlist, fetchWishlist, personality],
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      setWishlist((prev) => prev.filter((i) => i.productId !== productId));
      try {
        const response = await fetch("/api/wishlist", {
          method: "DELETE",
          headers: authHeaders(),
          body: JSON.stringify({ productId }),
        });
        if (response.ok) {
          await fetchWishlist();
          toast.success(getPersonalityToastMessage("toast.wishlist.removed", personality));
        } else {
          await fetchWishlist();
          toast.error("Failed to update wishlist");
        }
      } catch {
        await fetchWishlist();
      }
    },
    [fetchWishlist, personality],
  );

  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const ordersIdentityRef = useRef<string | null>(null);
  const ordersGenerationRef = useRef(0);
  const ordersAbortRef = useRef<AbortController | null>(null);

  const refreshOrders = useCallback(async () => {
    if (!uid || !sessionReady || ordersIdentityRef.current !== uid) return;
    const identity = uid;
    const generation = ordersGenerationRef.current;
    ordersAbortRef.current?.abort();
    const controller = new AbortController();
    ordersAbortRef.current = controller;
    setOrdersLoading(true);
    try {
      const data = await fetchApi<{ orders: UserOrder[] }>("/api/orders", { headers: authHeaders(), signal: controller.signal });
      if (ordersIdentityRef.current === identity && ordersGenerationRef.current === generation) setOrders(data.orders || []);
    } catch {
      // The paginated orders screen owns its visible error state. Keep legacy
      // provider consumers isolated without converting a failed request to []).
    } finally {
      if (ordersIdentityRef.current === identity && ordersGenerationRef.current === generation) setOrdersLoading(false);
    }
  }, [sessionReady, uid]);

  useEffect(() => {
    ordersAbortRef.current?.abort();
    ordersAbortRef.current = null;
    ordersGenerationRef.current += 1;
    ordersIdentityRef.current = uid;
    queueMicrotask(() => {
      setOrders([]);
      setOrdersLoading(false);
    });
  }, [uid]);

  const placeOrder = useCallback(
    async (input: {
      items: { productId: string; variantId?: string | null; quantity: number }[];
      shippingAddress?: string;
      shippingPhone: string;
      deliveryDistrict?: string;
      fulfillmentSelections?: { vendorId: string; method: "DELIVERY" | "PICKUP"; branchId?: string; pickupContact?: string }[];
      paymentGateway: "MTN_MOMO" | "AIRTEL_MONEY";
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
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const notificationIdentityRef = useRef<string | null>(null);
  const notificationRequestRef = useRef<Promise<void> | null>(null);
  const notificationAbortRef = useRef<AbortController | null>(null);
  const notificationGenerationRef = useRef(0);
  const readMutationIdsRef = useRef(new Set<string>());
  const [notificationMutationIds, setNotificationMutationIds] = useState<Set<string>>(() => new Set());
  const markAllMutationRef = useRef(false);
  const unreadCount = notificationUnreadCount;
  const setNotificationMutating = useCallback((id: string, active: boolean) => {
    if (active) readMutationIdsRef.current.add(id);
    else readMutationIdsRef.current.delete(id);
    setNotificationMutationIds(new Set(readMutationIdsRef.current));
  }, []);
  const isNotificationMutating = useCallback((id: string) => notificationMutationIds.has(id), [notificationMutationIds]);

  const refreshNotifications = useCallback(async () => {
    if (!uid || !sessionReady || notificationIdentityRef.current !== uid) return;
    if (notificationRequestRef.current) return notificationRequestRef.current;
    const identity = uid;
    const generation = notificationGenerationRef.current;
    const controller = new AbortController();
    notificationAbortRef.current = controller;
    setNotificationsLoading(true);
    setNotificationsError(null);
    const request = NotificationClient.list(controller.signal)
      .then(({ items, unreadCount: nextUnreadCount }) => {
        if (notificationIdentityRef.current === identity && notificationGenerationRef.current === generation) {
          setNotifications(items);
          setNotificationUnreadCount(nextUnreadCount);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || notificationIdentityRef.current !== identity || notificationGenerationRef.current !== generation) return;
        setNotificationsError(error instanceof Error ? error.message : "Unable to load notifications.");
      })
      .finally(() => {
        if (notificationIdentityRef.current === identity && notificationGenerationRef.current === generation) {
          notificationRequestRef.current = null;
          notificationAbortRef.current = null;
          setNotificationsLoading(false);
        }
      });
    notificationRequestRef.current = request;
    return request;
  }, [sessionReady, uid]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!uid || !sessionReady || readMutationIdsRef.current.has(notificationId)) return;
    const identity = uid;
    const existing = notifications.find((item) => item.id === notificationId);
    if (!existing || existing.readAt) return;
    setNotificationMutating(notificationId, true);
    setNotifications((current) => current.map((item) => item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item));
    setNotificationUnreadCount((count) => Math.max(0, count - 1));
    try {
      await NotificationClient.markRead(notificationId);
      if (notificationIdentityRef.current === identity) await refreshNotifications();
    } catch (error) {
      if (notificationIdentityRef.current === identity) {
        setNotifications((current) => current.map((item) => item.id === notificationId ? { ...item, readAt: existing.readAt } : item));
        setNotificationUnreadCount((count) => count + 1);
        const message = error instanceof Error ? error.message : "Unable to mark notification as read.";
        setNotificationsError(message);
        toast.error(message);
      }
    } finally {
      setNotificationMutating(notificationId, false);
    }
  }, [notifications, refreshNotifications, sessionReady, setNotificationMutating, uid]);

  const markAsUnread = useCallback(async (notificationId: string) => {
    if (!uid || !sessionReady || readMutationIdsRef.current.has(notificationId)) return;
    const identity = uid;
    const existing = notifications.find((item) => item.id === notificationId);
    if (!existing || !existing.readAt) return;
    setNotificationMutating(notificationId, true);
    setNotifications((current) => current.map((item) => item.id === notificationId ? { ...item, readAt: null } : item));
    setNotificationUnreadCount((count) => count + 1);
    try {
      await NotificationClient.markUnread(notificationId);
      if (notificationIdentityRef.current === identity) await refreshNotifications();
    } catch (error) {
      if (notificationIdentityRef.current === identity) {
        setNotifications((current) => current.map((item) => item.id === notificationId ? { ...item, readAt: existing.readAt } : item));
        setNotificationUnreadCount((count) => Math.max(0, count - 1));
        const message = error instanceof Error ? error.message : "Unable to mark notification as unread.";
        setNotificationsError(message);
        toast.error(message);
      }
    } finally {
      setNotificationMutating(notificationId, false);
    }
  }, [notifications, refreshNotifications, sessionReady, setNotificationMutating, uid]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!uid || !sessionReady || readMutationIdsRef.current.has(notificationId)) return;
    const identity = uid;
    const index = notifications.findIndex((item) => item.id === notificationId);
    if (index < 0) return;
    const existing = notifications[index];
    setNotificationMutating(notificationId, true);
    setNotifications((current) => current.filter((item) => item.id !== notificationId));
    if (!existing.readAt) setNotificationUnreadCount((count) => Math.max(0, count - 1));
    try {
      await NotificationClient.delete(notificationId);
      if (notificationIdentityRef.current === identity) {
        await refreshNotifications();
        toast.success("Notification deleted.");
      }
    } catch (error) {
      if (notificationIdentityRef.current === identity) {
        setNotifications((current) => {
          const restored = [...current];
          restored.splice(Math.min(index, restored.length), 0, existing);
          return restored;
        });
        if (!existing.readAt) setNotificationUnreadCount((count) => count + 1);
        const message = error instanceof Error ? error.message : "Unable to delete notification.";
        setNotificationsError(message);
        toast.error(message);
      }
    } finally {
      setNotificationMutating(notificationId, false);
    }
  }, [notifications, refreshNotifications, sessionReady, setNotificationMutating, uid]);

  const markAllAsRead = useCallback(async () => {
    if (!uid || !sessionReady || markAllMutationRef.current) return;
    const identity = uid;
    const snapshot = notifications;
    const unreadSnapshot = notificationUnreadCount;
    if (!snapshot.some((item) => !item.readAt)) return;
    markAllMutationRef.current = true;
    const now = new Date().toISOString();
    setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt: now }));
    setNotificationUnreadCount(0);
    try {
      await NotificationClient.markAllRead();
      if (notificationIdentityRef.current === identity) await refreshNotifications();
    } catch (error) {
      if (notificationIdentityRef.current === identity) {
        setNotifications(snapshot);
        setNotificationUnreadCount(unreadSnapshot);
        const message = error instanceof Error ? error.message : "Unable to mark notifications as read.";
        setNotificationsError(message);
        toast.error(message);
      }
    } finally {
      markAllMutationRef.current = false;
    }
  }, [notificationUnreadCount, notifications, refreshNotifications, sessionReady, uid]);

  useEffect(() => {
    if (notificationIdentityRef.current === uid && (uid === null || sessionReady)) return;
    notificationAbortRef.current?.abort();
    notificationAbortRef.current = null;
    notificationRequestRef.current = null;
    notificationGenerationRef.current += 1;
    readMutationIdsRef.current.clear();
    setNotificationMutationIds(new Set());
    markAllMutationRef.current = false;
    notificationIdentityRef.current = uid;
    setNotifications([]);
    setNotificationUnreadCount(0);
    setNotificationsError(null);
    setNotificationsLoading(false);
  }, [sessionReady, uid]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && uid && sessionReady) void refreshNotifications();
  }, [authLoading, isAuthenticated, refreshNotifications, sessionReady, sessionRevision, uid]);

  // ==========================================
  // RECENTLY VIEWED
  // ==========================================

  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [recentlyViewedTimestamps, setRecentlyViewedTimestamps] = useState<Record<string, string>>({});
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<RecentlyViewedProduct[]>([]);
  const [recentlyViewedLoading, setRecentlyViewedLoading] = useState(false);
  const [recentlyViewedHydrated, setRecentlyViewedHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setRecentlyViewedIds(loadFromStorage<string[]>("smartduka-recently-viewed", []));
      setRecentlyViewedTimestamps(loadFromStorage<Record<string, string>>("smartduka-recently-viewed-timestamps", {}));
      setRecentlyViewedHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (recentlyViewedHydrated) saveToStorage("smartduka-recently-viewed", recentlyViewedIds);
  }, [recentlyViewedHydrated, recentlyViewedIds]);
  useEffect(() => {
    if (recentlyViewedHydrated) saveToStorage("smartduka-recently-viewed-timestamps", recentlyViewedTimestamps);
  }, [recentlyViewedHydrated, recentlyViewedTimestamps]);

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

  const mergedIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    if (uid && recentlyViewedIds.length > 0 && mergedIdentityRef.current !== uid) {
      mergedIdentityRef.current = uid;
      mergeRecentlyViewedRef.current();
    }
    if (!uid) {
      mergedIdentityRef.current = null;
      queueMicrotask(() => setRecentlyViewedProducts([]));
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

    if (!authLoading && isAuthenticated && uid && sessionReady) {
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
      setNotificationUnreadCount(0);
      setNotificationsError(null);
    }
  }, [authLoading, isAuthenticated, uid, sessionReady, sessionRevision, fetchSettings, fetchWishlist, refreshOrders]);

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
        notificationsError,
        markAsRead,
        markAsUnread,
        deleteNotification,
        markAllAsRead,
        isNotificationMutating,
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
