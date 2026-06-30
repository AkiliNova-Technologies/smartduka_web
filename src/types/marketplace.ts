// import { PlatformRole, UserStatus, VendorStatus, VendorUserRole, ProductStatus, SubOrderStatus, PaymentGateway, WebhookProcessStatus, NotificationType, DocumentType } from "@prisma/client";

// ==========================================
// USER & SETTINGS TYPE PROFILES
// ==========================================

export interface UserProfile {
  id: string; // Standard UUID Primary Key matching CURRENT_USER_ID
  name: string;
  email: string;
  avatar: string;
}

export interface UserSettingsProfile {
  userId: string; // Master UUID linking to currentUser
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string;
  
  // Regional & Currency Preferences
  currency: "UGX" | "USD" | "KES";
  deliveryDistrict: string; // e.g., "Kampala Central", "Nakawa", "Lubaga"
  primaryLanguage: string;
  
  // Payment Integration Verification Trackers
  momoNumber: string;
  momoNetwork: "MTN" | "Airtel";
  buyerProtectionEnabled: boolean; // Escrow Safe Hold toggle state
  
  // Notification Delivery Toggles
  orderAlertsEmail: boolean;
  orderAlertsPush: boolean;
  marketingNewsletter: boolean;
  securityAlertsSMS: boolean;
}

export interface RegionalSettings {
  id: string;
  userId: string; 
  primaryCurrency: "UGX" | "USD" | "KES" | "EUR";
  systemLanguage: "en" | "fr" | "sw";
}

export interface NotificationPreferences {
  id: string; 
  userId: string; 
  emailAlerts: boolean; 
  smsAlerts: boolean; 
  marketingAlerts: boolean; 
}

export interface SecuritySettings {
  id: string; 
  userId: string; 
  twoFactorEnabled: boolean; 
}

// ==========================================
// STORE & VENDOR IDENTITIES (THE SHOPS)
// ==========================================

export interface Store {
  id: string; // Relational Primary Key e.g., SEED_STORE_1_ID
  vendorId: string; // Foreign Key pointing to the User owner profile
  name: string; // e.g., "Apex Sportswear Kampala"
  slug: string; // URL-safe identifier e.g., "apex-sportswear"
  logo: string; // High-fidelity Unsplash branding graphics URL
  rating: number; // Aggregate feedback score
  verified: boolean; // KYC compliance indicator flag
  subscriptionPlan: "Premium Tier" | "Standard Tier" | "Basic Tier";
}

export interface Coupon {
  code: string;
  desc: string;
  vendor: string;
}


// ==========================================
// COMMERCE CATALOG & CLASSIFICATIONS
// ==========================================

export interface Category {
  id: string; 
  name: string; 
  slug: string; 
  icon: string; 
  image?: string;
}

export interface Product {
  id: string;
  storeId: string; // Relational Foreign Key matching a valid Store.id
  categoryId: string; // Relational Foreign Key matching a valid ProductCategory.id
  brand: string;
  title: string;
  price: number; // Base currency integer value (UGX)
  originalPrice?: number; // Optional fallback value for live Markdown engines
  rating: number;
  reviews: number;
  image: string; // High-resolution product image asset URL
  isRecommended?: boolean; // Visibility control mapping for Recommended section feeds
  inventoryCount: number; // Low-stock threshold limit counter
}

export interface ProductCampaign {
  id: string;
  tag: string;
  title: string; 
  description: string;
  image: string;
  ctaText: string;
  ctaColor: string;
}

export interface PromoCampaign {
  id: string;
  badge: string;
  badgeIcon: string;
  title: string;
  description: string;
  actionText: string;
  bgClass: string;
  badgeBg: string;
  accentText: string;
  image: string;
  imgAlt: string;
  href: string;
}

export interface CollectionMedia {
  type: "image" | "video";
  url: string;
  thumbnail?: string;
}

export interface Collection {
  id: string;
  volume: string;
  name: string;
  description: string;
  curatorName: string; 
  isMerchantCurated: boolean;
  itemCount: number;
  coverImage: string;
  mediaGallery: CollectionMedia[];
}

export interface OrderItem {
  productId: string;
  quantity: number;
  priceAtPurchase: number;
}

export interface Order {
  id: string;
  userId: string;
  date: string;
  status: "Pending" | "In Transit" | "Delivered" | "Rejected";
  total: number;
  vendor: string;
  storeId: string;
  deliveryAddress: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  items: OrderItem[];
}

// ==========================================
// DOCUMENTATION & SUPPORT INFRASTRUCTURE
// ==========================================

export interface FAQItem {
  id: string;
  category: "orders" | "vendors" | "payments";
  question: string;
  answer: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string; // ISO Timestamp format sequence
}

// ==========================================
// MONOLITHIC RELATIONAL MOCK DATABASE SCHEMA
// ==========================================

export interface MockDatabaseSchema {
  currentUser: UserProfile;
  settingsProfiles: Record<string, UserSettingsProfile>;
  faqs: FAQItem[];
  categories: Category[];
  stores: Store[];
  products: Product[];
  productCampaigns: ProductCampaign[];
  promos: PromoCampaign[];
  collections: Collection[];
  reviews: ProductReview[];
  orders: Order[]
}