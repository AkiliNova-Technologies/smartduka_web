// import { PlatformRole, UserStatus, VendorStatus, VendorUserRole, ProductStatus, SubOrderStatus, PaymentGateway, WebhookProcessStatus, NotificationType, DocumentType } from "@prisma/client";

// ==========================================
// USER & SETTINGS TYPE PROFILES
// ==========================================

export interface UserProfile {
  id: string; 
  name: string;
  email: string;
  avatar: string;
}

export interface UserSettingsProfile {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string;
  
  currency: "UGX" | "USD" | "KES";
  deliveryDistrict: string; 
  primaryLanguage: string;
  
  momoNumber: string;
  momoNetwork: "MTN" | "Airtel";
  buyerProtectionEnabled: boolean;
  
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
  id: string;
  vendorId?: string;
  name: string; 
  slug: string; 
  logo: string; 
  rating?: number; 
  verified: boolean;
  subscriptionPlan?: "Premium Tier" | "Standard Tier" | "Basic Tier";
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
  description: string;           
  image: string;                 
  parentId: string | null; 
  _count?: {
    products: number;
    subCategories: number;
  };
}

export interface CategoryTree extends Category {
  productCount?: number;
  subCategories?: CategoryTree[];
}

export interface Product {
  id: string;
  vendorId: string;
  categoryId: string | null;
  subCategoryId?: string | null;
  name: string;
  slug: string;
  brand: string | null;
  description?: string | null;
  basePrice: number;
  compareAtPrice?: number | null;
  inventoryCount: number;
  sku?: string | null;
  status?: "DRAFT" | "PUBLISHED" | "ACTIVE" | "ARCHIVED" | "OUT_OF_STOCK";
  rating?: number;
  reviews?: number;
  image: string;
  images?: ProductImage[];
  sizes?: string[];
  colors?: string[];
  specs?: ProductSpec[];
  tags?: string[];
  isRecommended?: boolean;
  createdAt?: string;
  updatedAt?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  subCategory?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  vendor?: {
    id: string;
    storeName: string;
    slug: string;
    logoUrl: string | null;
  } | null;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  isFeatured: boolean;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;                       
  price: number;
  inventoryCount: number;
  options: Record<string, string>;    
}

export interface ProductSpec {
  name: string;                        
  value: string;                       
}

export interface ProductFormData {
  title: string;                       
  slug?: string;
  brand: string;
  description: string;
  basePrice: number;
  compareAtPrice?: number;
  categoryId: string;
  subCategoryId?: string;
  inventoryCount: number;
  sku?: string;
  image: string;                       
  images: string[];                    
  sizes: string[];
  colors: string[];
  specs: ProductSpec[];
  tags: string[];
  status?: "DRAFT" | "PUBLISHED";
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
  createdAt: string; 
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