import {
  Category,
  Collection,
  Coupon,
  FAQItem,
  Order,
  Product,
  ProductCampaign,
  PromoCampaign,
  Store,
} from "@/types/marketplace";



export const CURRENT_USER_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
export const SETTINGS_PROFILE_ID = "a4c28c82-3f14-4a61-bc9d-c58ee1e185e3";

// Standardized UUID Seeds for Relational Data Mapping
export const SEED_STORE_1_ID = "st-nike-ug-001";
export const SEED_STORE_2_ID = "st-sony-ug-002";
export const SEED_STORE_3_ID = "st-rayban-ug-003";
export const SEED_STORE_4_ID = "st-philips-ug-004";
export const SEED_STORE_5_ID = "st-carhartt-ug-005";

export const SEED_CAT_FOOTWEAR = "cat-footwear-101";
export const SEED_CAT_ELECTRONICS = "cat-electronics-102";
export const SEED_CAT_ACCESSORIES = "cat-accessories-103";
export const SEED_CAT_APPLIANCES = "cat-appliances-104";
export const SEED_CAT_APPAREL = "cat-apparel-105";

export const mockDatabase = {
  currentUser: {
    id: CURRENT_USER_ID,
    name: "Brian Mukasa",
    email: "brian.mukasa@gmail.com",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",
  },

  settingsProfiles: {
    [CURRENT_USER_ID]: {
      userId: CURRENT_USER_ID,
      fullName: "Brian Mukasa",
      email: "brian.mukasa@gmail.com",
      phoneNumber: "+256 772 123456",
      avatarUrl:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",

      currency: "UGX",
      deliveryDistrict: "Nakawa",
      primaryLanguage: "English (UG)",

      momoNumber: "0772123456",
      momoNetwork: "MTN",
      buyerProtectionEnabled: true,

      orderAlertsEmail: true,
      orderAlertsPush: true,
      marketingNewsletter: false,
      securityAlertsSMS: true,
    },
  },

  faqs: [
    {
      id: "faq-1",
      category: "orders",
      question:
        "How does SmartDuka Buyer Protection guarantee my cash is safe?",
      answer:
        "When you place an order, your Mobile Money payment is safely locked by the platform first. The shop owner is only paid after you receive your package, look through it, and tap 'Confirm Delivery' on your app.",
    },
    {
      id: "faq-2",
      category: "orders",
      question:
        "What happens if the bodaboda rider brings a damaged or wrong item?",
      answer:
        "Do not accept or confirm delivery on the app! Leave the order open, snap a quick picture of the issues, and report it here immediately. Our local support team will halt the cash transfer and sort your refund or replacement within 2 hours.",
    },
    {
      id: "faq-3",
      category: "vendors",
      question:
        "How do I message a shop owner directly for custom adjustments?",
      answer:
        "Simply tap on the specific merchant's shop name on their product list or order card, then select 'Message Merchant'. You can directly call or chat with them regarding specific colors, sizes, or stock availability in their physical store.",
    },
    {
      id: "faq-4",
      category: "vendors",
      question:
        "Can I pick up my package directly from a vendor's shop in town?",
      answer:
        "Yes, many of our Kampala vendors allow shop walk-ins! If the seller enables store pick-up, you will see it as an option at checkout. Make sure to present your unique SmartDuka order token when you reach their counter.",
    },
    {
      id: "faq-5",
      category: "payments",
      question:
        "Why should I pay online instead of giving cash to the bodaboda rider?",
      answer:
        "Paying through the app activates our Safe Lock protection. If a vendor sends the wrong size or a damaged item, we can instantly halt the payment and send your MoMo float straight back to your wallet. If you pay cash directly, it becomes much harder to recover your money.",
    },
    {
      id: "faq-6",
      category: "payments",
      question:
        "Which Mobile Money (MoMo) networks are supported for checkout?",
      answer:
        "We support instant online payments via MTN Mobile Money and Airtel Money. Just ensure your wallet has enough float and keep your phone close by to enter your PIN when the prompt appears.",
    },
    {
      id: "faq-7",
      category: "payments",
      question:
        "My MoMo transaction was successful but the order is still pending. What should I do?",
      answer:
        "Don't panic—sometimes network delays happen between the telecom providers. If your dashboard doesn't refresh within 5 minutes, go to your transactions tab, copy the reference ID, and share it with us via chat so we can manually sync your order.",
    },
  ] as FAQItem[],

  // 2. Strongly Typed Categories Array containing dynamic high-res image references
  categories: [
    {
      id: SEED_CAT_FOOTWEAR,
      name: "Footwear & Sportswear",
      slug: "footwear-sportswear",
      
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: SEED_CAT_ELECTRONICS,
      name: "Electronics & Audio",
      slug: "electronics-audio",
      image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: SEED_CAT_ACCESSORIES,
      name: "Luxury Eyewear & Accessories",
      slug: "luxury-eyewear-accessories",
      image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: SEED_CAT_APPLIANCES,
      name: "Home Utilities & Appliances",
      slug: "home-utilities-appliances",
      image: "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: SEED_CAT_APPAREL,
      name: "Apparel & Designer Fashion",
      slug: "apparel-designer-fashion",
      image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80",
    },
  ] as Category[],

  stores: [
    {
      id: SEED_STORE_1_ID,
      vendorId: "vendor-owner-001",
      name: "Apex Sportswear Kampala",
      slug: "apex-sportswear",
      logo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
      rating: 4.9,
      verified: true,
      subscriptionPlan: "Premium Tier",
    },
    {
      id: SEED_STORE_2_ID,
      vendorId: "vendor-owner-002",
      name: "Sound & Vision Official",
      slug: "sound-vision",
      logo: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80",
      rating: 4.7,
      verified: true,
      subscriptionPlan: "Standard Tier",
    },
    {
      id: SEED_STORE_3_ID,
      vendorId: "vendor-owner-003",
      name: "Ray-Ban Kampala Boutique",
      slug: "rayban-kampala",
      logo: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80",
      rating: 4.8,
      verified: true,
      subscriptionPlan: "Premium Tier",
    },
    {
      id: SEED_STORE_4_ID,
      vendorId: "vendor-owner-004",
      name: "Philips Smart Kitchen UG",
      slug: "philips-kitchen-ug",
      logo: "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&w=600&q=80",
      rating: 4.6,
      verified: true,
      subscriptionPlan: "Standard Tier",
    },
    {
      id: SEED_STORE_5_ID,
      vendorId: "vendor-owner-005",
      name: "Kla Collective Apparel",
      slug: "kla-collective-apparel",
      logo: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80",
      rating: 4.9,
      verified: true,
      subscriptionPlan: "Premium Tier",
    },
  ] as Store[],

  productCampaigns: [
    {
      id: "camp-1",
      tag: "New Collection",
      title: "Find Your Style, Love Your Look",
      description:
        "Discover the latest trends in fashion, beauty, and lifestyle curated specifically for your modern life.",
      image:
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85",
      ctaText: "Shop Fashion",
      ctaColor: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20",
    },
    {
      id: "camp-2",
      tag: "Premium Gadgets",
      title: "Upgrade Your Space, Empower Your Day",
      description:
        "Explore cutting-edge tech accessories, audio devices, and workspace essentials designed for high performance.",
      image:
        "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=85",
      ctaText: "Explore Electronics",
      ctaColor: "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20",
    },
    {
      id: "camp-3",
      tag: "Living & Decor",
      title: "Transform Comfort, Redefine Minimalist",
      description:
        "Bring balance back to your environment with curated furniture items, organic scents, and house plants.",
      image:
        "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=85",
      ctaText: "Browse Living",
      ctaColor: "bg-amber-700 hover:bg-amber-600 shadow-amber-700/20",
    },
    {
      id: "camp-4",
      tag: "Smart Kitchens",
      title: "Fast Breakfasts, Better Mornings",
      description:
        "Upgrade your Kampala kitchen hub with authentic Philips airfryers and smart appliances. Save time and power daily.",
      image:
        "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&w=1200&q=85",
      ctaText: "Shop Appliances",
      ctaColor: "bg-orange-600 hover:bg-orange-500 shadow-orange-600/20",
    },
    {
      id: "camp-5",
      tag: "Streetwear Drops",
      title: "Heavyweight Fleece, Crafted for Comfort",
      description:
        "Explore the latest arrival drops from Kla Collective. Heavyweight hoodies and premium utility canvas jackets built to last.",
      image:
        "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85",
      ctaText: "Browse Apparel",
      ctaColor: "bg-zinc-900 hover:bg-zinc-800 shadow-zinc-900/20",
    },
  ] as ProductCampaign[],

  promos: [
    {
      id: "promo-1",
      badge: "Flash Sale",
      badgeIcon: "Percent",
      title: "Up to 70% Off",
      description: "Limited time premium offers",
      actionText: "Grab Deal",
      bgClass: "bg-emerald-50/60 border-emerald-100/70 text-emerald-950",
      badgeBg: "bg-emerald-600 text-white",
      accentText: "text-emerald-700",
      image:
        "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=400&h=400&q=80",
      imgAlt: "Luxury fashion sale items",
      href: "/deals",
    },
    {
      id: "promo-2",
      badge: "Free Shipping",
      badgeIcon: "Truck",
      title: "Zero Delivery",
      description: "On all orders over UGX 150,000",
      actionText: "Shop Now",
      bgClass: "bg-zinc-50 border-zinc-200/60 text-zinc-900",
      badgeBg: "bg-zinc-900 text-white",
      accentText: "text-zinc-600",
      image:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&h=400&q=80",
      imgAlt: "Free shipping accessories catalog",
      href: "/deals",
    },
    {
      id: "promo-3",
      badge: "New Arrivals",
      badgeIcon: "Sparkles",
      title: "Fresh Drops",
      description: "Curated styles just landed",
      actionText: "Explore",
      bgClass: "bg-amber-50/50 border-amber-100/70 text-amber-950",
      badgeBg: "bg-amber-700 text-white",
      accentText: "text-amber-800",
      image:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&h=400&q=80",
      imgAlt: "New curated lifestyle accessories",
      href: "/new-arrivals",
    },
  ] as PromoCampaign[],

  products: [
    {
      id: "deal-1",
      categoryId: SEED_CAT_FOOTWEAR,
      vendorId: SEED_STORE_1_ID,
      brand: "Nike Sportswear",
      name: "Air Max 270 React Premium",
      basePrice: 480000,
      compareAtPrice: 620000,
      rating: 4.8,
      reviews: 142,
      image:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 12,
      isRecommended: true,
    },
    {
      id: "deal-2",
      categoryId: SEED_CAT_ELECTRONICS,
      vendorId: SEED_STORE_2_ID,
      brand: "Sony",
      name: "WH-1000XM5 Wireless Headphones",
      basePrice: 1100000,
      compareAtPrice: 1350000,
      rating: 4.9,
      reviews: 96,
      image:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 5,
      isRecommended: true,
    },
    {
      id: "deal-3",
      categoryId: SEED_CAT_ACCESSORIES,
      vendorId: SEED_STORE_3_ID,
      brand: "Ray-Ban",
      name: "Classic Aviator Sunglasses (Polarized)",
      basePrice: 650000,
      compareAtPrice: 780000,
      rating: 4.7,
      reviews: 54,
      image:
        "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 8,
      isRecommended: false,
    },
    {
      id: "deal-4",
      categoryId: SEED_CAT_ELECTRONICS,
      vendorId: SEED_STORE_2_ID,
      brand: "Apple",
      name: 'iPad Air 10.9" M1 Chip (64GB)',
      basePrice: 2450000,
      compareAtPrice: 2800000,
      rating: 4.8,
      reviews: 67,
      image:
        "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 6,
      isRecommended: true,
    },
    {
      id: "deal-5",
      categoryId: SEED_CAT_APPLIANCES,
      vendorId: SEED_STORE_4_ID,
      brand: "Philips",
      name: "Essential Airfryer XL 6.2L",
      basePrice: 580000,
      compareAtPrice: 720000,
      rating: 4.7,
      reviews: 112,
      image:
        "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 15,
      isRecommended: false,
    },
    {
      id: "deal-6",
      categoryId: SEED_CAT_ELECTRONICS,
      vendorId: SEED_STORE_2_ID,
      brand: "Samsung",
      name: "Galaxy Watch 6 Pro LTE 44mm",
      basePrice: 1150000,
      compareAtPrice: 1400000,
      rating: 4.5,
      reviews: 43,
      image:
        "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 9,
      isRecommended: true,
    },
    {
      id: "arrival-1",
      categoryId: SEED_CAT_FOOTWEAR,
      vendorId: SEED_STORE_1_ID,
      brand: "Adidas",
      name: "Ultraboost Light Running Shoes",
      basePrice: 550000,
      rating: 4.6,
      reviews: 38,
      image:
        "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 20,
      isRecommended: true,
    },
    {
      id: "arrival-2",
      categoryId: SEED_CAT_ACCESSORIES,
      vendorId: SEED_STORE_3_ID,
      brand: "Ray-Ban",
      name: "Clubmaster Classic Black-Gold",
      basePrice: 720000,
      rating: 4.9,
      reviews: 19,
      image:
        "https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 4,
      isRecommended: true,
    },
    {
      id: "arrival-3",
      categoryId: SEED_CAT_FOOTWEAR,
      vendorId: SEED_STORE_1_ID,
      brand: "Puma",
      name: "Rider FV Future Vintage Sneakers",
      basePrice: 320000,
      rating: 4.4,
      reviews: 28,
      image:
        "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 14,
      isRecommended: false,
    },
    {
      id: "arrival-4",
      categoryId: SEED_CAT_APPAREL,
      vendorId: SEED_STORE_5_ID,
      brand: "Carhartt WIP",
      name: "Detroit Canvas Utility Jacket",
      basePrice: 680000,
      rating: 4.8,
      reviews: 31,
      image:
        "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 7,
      isRecommended: true,
    },
    {
      id: "arrival-5",
      categoryId: SEED_CAT_ELECTRONICS,
      vendorId: SEED_STORE_2_ID,
      brand: "Anker",
      name: "Soundcore Motion+ Bluetooth Speaker",
      basePrice: 450000,
      rating: 4.7,
      reviews: 89,
      image:
        "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 25,
      isRecommended: false,
    },
    {
      id: "arrival-6",
      categoryId: SEED_CAT_ACCESSORIES,
      vendorId: SEED_STORE_3_ID,
      brand: "Fossil",
      name: "Minimalist Chronograph Leather Watch",
      basePrice: 520000,
      rating: 4.3,
      reviews: 22,
      image:
        "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 11,
      isRecommended: false,
    },
    {
      id: "arrival-7",
      categoryId: SEED_CAT_FOOTWEAR,
      vendorId: SEED_STORE_1_ID,
      brand: "New Balance",
      name: "990v5 Heritage Lifestyle Shoes",
      basePrice: 790000,
      rating: 4.9,
      reviews: 74,
      image:
        "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 8,
      isRecommended: true,
    },
    {
      id: "arrival-8",
      categoryId: SEED_CAT_ELECTRONICS,
      vendorId: SEED_STORE_2_ID,
      brand: "Logitech",
      name: "MX Master 3S Wireless Mouse",
      basePrice: 390000,
      rating: 4.8,
      reviews: 156,
      image:
        "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 18,
      isRecommended: true,
    },
    {
      id: "arrival-9",
      categoryId: SEED_CAT_APPAREL,
      vendorId: SEED_STORE_5_ID,
      brand: "Nike Sportswear",
      name: "Club Fleece Heavyweight Hoodie",
      basePrice: 260000,
      rating: 4.6,
      reviews: 210,
      image:
        "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 30,
      isRecommended: false,
    },
    {
      id: "arrival-10",
      categoryId: SEED_CAT_APPLIANCES,
      vendorId: SEED_STORE_4_ID,
      brand: "Nespresso",
      name: "Vertuo Next Coffee/Espresso Machine",
      basePrice: 850000,
      rating: 4.5,
      reviews: 62,
      image:
        "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 5,
      isRecommended: true,
    },
    {
      id: "arrival-11",
      categoryId: SEED_CAT_ELECTRONICS,
      vendorId: SEED_STORE_2_ID,
      brand: "JBL",
      name: "Tune 760NC Wireless Over-Ear Noise Cancelling",
      basePrice: 420000,
      rating: 4.4,
      reviews: 48,
      image:
        "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 16,
      isRecommended: false,
    },
    {
      id: "arrival-12",
      categoryId: SEED_CAT_ACCESSORIES,
      vendorId: SEED_STORE_3_ID,
      brand: "Bellroy",
      name: "Premium Hide & Seek Leather Wallet",
      basePrice: 340000,
      rating: 4.7,
      reviews: 83,
      image:
        "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 13,
      isRecommended: true,
    },
    {
      id: "arrival-13",
      categoryId: SEED_CAT_APPAREL,
      vendorId: SEED_STORE_5_ID,
      brand: "Levi's",
      name: "511 Slim Fit Premium Denim Jeans",
      basePrice: 290000,
      rating: 4.5,
      reviews: 124,
      image:
        "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 22,
      isRecommended: false,
    },
    {
      id: "arrival-14",
      categoryId: SEED_CAT_ELECTRONICS,
      vendorId: SEED_STORE_2_ID,
      brand: "Keychron",
      name: "K2 V2 Mechanical Wireless Keyboard",
      basePrice: 490000,
      rating: 4.8,
      reviews: 105,
      image:
        "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 7,
      isRecommended: true,
    },
    {
      id: "arrival-15",
      categoryId: SEED_CAT_FOOTWEAR,
      vendorId: SEED_STORE_1_ID,
      brand: "Vans",
      name: "Old Skool Classic Skate Shoes",
      basePrice: 240000,
      rating: 4.7,
      reviews: 340,
      image:
        "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 40,
      isRecommended: false,
    },
    {
      id: "arrival-16",
      categoryId: SEED_CAT_ACCESSORIES,
      vendorId: SEED_STORE_3_ID,
      brand: "Herschel",
      name: "Little America Premium Backpack",
      basePrice: 380000,
      compareAtPrice: 450000,
      rating: 4.6,
      reviews: 94,
      image:
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=85",
      inventoryCount: 11,
      isRecommended: false,
    },
  ] as Product[],

  collections: [
    {
      id: "col-1",
      volume: "Lookbook Vol. 01",
      name: "Minimalist Architecture Spring Drop",
      description:
        "Stripped-back utility lines, lightweight textile drops, and clean essential layouts curated carefully to elevate your daily rotations.",
      curatorName: "SmartDuka Official",
      isMerchantCurated: false,
      itemCount: 4,
      coverImage:
        "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=85",
      mediaGallery: [
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=85",
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85",
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85",
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1540221652346-e5dd6b50f3e7?auto=format&fit=crop&w=1200&q=85",
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85",
        },
      ],
    },
    {
      id: "col-2",
      volume: "Lookbook Vol. 02",
      name: "Nordic Luxury Comfort Living",
      description:
        "Cozy spatial coordinates mixing technical acoustic textures with raw premium organic cotton setups.",
      curatorName: "Classic Kampala Interiors",
      isMerchantCurated: true,
      itemCount: 8,
      coverImage:
        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85",
      mediaGallery: [
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85",
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=85",
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=85",
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=85",
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=85",
        },
      ],
    },
    {
      id: "col-3",
      volume: "Lookbook Vol. 03",
      name: "Performance Weatherproof Wardrobe",
      description:
        "High-tier technical configurations built to protect, adapt, and navigate active urban lifestyle flows.",
      curatorName: "Amani Premium Boutique",
      isMerchantCurated: true,
      itemCount: 19,
      coverImage:
        "https://images.unsplash.com/photo-1540221652346-e5dd6b50f3e7?auto=format&fit=crop&w=1200&q=85",
      mediaGallery: [
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1540221652346-e5dd6b50f3e7?auto=format&fit=crop&w=1200&q=85",
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85",
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85",
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=1200&q=85",
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85",
        },
      ],
    },
  ] as Collection[],

  reviews: [
    {
      id: "rev-001",
      productId: "deal-1",
      userId: "buyer-uuid-abc",
      userName: "Derrick K.",
      rating: 5,
      comment:
        "Incredibly fast fulfillment to Nakawa, shoes fit perfectly original quality!",
      createdAt: "2026-06-15T12:00:00Z",
    },
    {
      id: "rev-002",
      productId: "deal-2",
      userId: CURRENT_USER_ID,
      userName: "Brian Mukasa",
      rating: 4.8,
      comment:
        "Premium active noise cancelling. Best investment for coding workspaces.",
      createdAt: "2026-06-18T08:30:00Z",
    },
    {
      id: "rev-003",
      productId: "deal-3",
      userId: "buyer-uuid-xyz",
      userName: "Fiona N.",
      rating: 5,
      comment:
        "Authentic aviators. Verified tracking, safely wrapped. Highly recommended!",
      createdAt: "2026-06-19T14:15:00Z",
    },
  ],

  orders: [
    {
      id: "ORD-98211-ZM",
      userId: CURRENT_USER_ID,
      date: "June 14, 2026",
      status: "In Transit" as "Pending" | "In Transit" | "Delivered",
      total: 480000,
      vendor: "Apex Sportswear Kampala",
      storeId: SEED_STORE_1_ID,
      deliveryAddress: "Plot 42, Kampala Road, City Centre, Kampala",
      customerName: "Brian Mukasa",
      customerPhone: "+256 772 123456",
      paymentMethod: "Mobile Money Escrow",
      items: [
        {
          productId: "deal-1",
          quantity: 1,
          priceAtPurchase: 480000,
        },
      ],
    },
    {
      id: "ORD-95400-XY",
      userId: CURRENT_USER_ID,
      date: "June 10, 2026",
      status: "Pending" as "Pending" | "In Transit" | "Delivered",
      total: 1490000,
      vendor: "Sound & Vision Official",
      vendorId: SEED_STORE_2_ID,
      deliveryAddress: "Bukoto Heights Apartments, Block C, Kampala",
      customerName: "Brian Mukasa",
      customerPhone: "+256 772 123456",
      paymentMethod: "Mobile Money Escrow",
      items: [
        {
          productId: "deal-2",
          quantity: 1,
          priceAtPurchase: 1100000,
        },
        {
          productId: "arrival-8",
          quantity: 1,
          priceAtPurchase: 390000,
        },
      ],
    },
    {
      id: "ORD-90214-LK",
      userId: CURRENT_USER_ID,
      date: "May 29, 2026",
      status: "Delivered" as "Pending" | "In Transit" | "Delivered",
      total: 1100000,
      vendor: "Ray-Ban Kampala Boutique",
      vendorId: SEED_STORE_3_ID,
      deliveryAddress: "Makerere University, West Road, Kampala",
      customerName: "Brian Mukasa",
      customerPhone: "+256 772 123456",
      paymentMethod: "Mobile Money Escrow",
      items: [
        {
          productId: "deal-3",
          quantity: 1,
          priceAtPurchase: 650000,
        },
        {
          productId: "arrival-5",
          quantity: 1,
          priceAtPurchase: 450000,
        },
      ],
    },
  ] as Order[],

  coupons: [
    {
      code: "SMARTDUKA20",
      desc: "Get 25% off when you buy clothes and shoes from verified fashion dukas.",
      vendor: "Platform Offer",
    },
    {
      code: "APEXWELCOME",
      desc: "Save UGX 50,000 on your first purchase from the Apex Threads duka.",
      vendor: "Apex Threads Co.",
    },
  ] as Coupon[],
};