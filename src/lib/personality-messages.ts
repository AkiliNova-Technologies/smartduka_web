import type { PlatformPersonality } from "@/lib/appearance";

export type PersonalityMessageKey =
  | "home.welcome"
  | "cart.empty.title"
  | "cart.empty.description"
  | "wishlist.empty.title"
  | "wishlist.empty.description"
  | "toast.cart.added"
  | "toast.cart.removed"
  | "toast.wishlist.added"
  | "toast.wishlist.removed"
  | "toast.profile.updated"
  | "toast.preferences.updated"
  | "toast.review.submitted"
  | "discovery.empty.title"
  | "discovery.empty.description";

type MessageCatalog = Record<PersonalityMessageKey, Record<PlatformPersonality, string>>;

const messages: MessageCatalog = {
  "home.welcome": {
    LOVELY: "Welcome back, lovely!",
    ELEGANT: "Welcome back. Discover something extraordinary.",
    PLAYFUL: "Hey there! Ready for your next favourite find? ✨",
    CLASSIC: "Welcome back to Mwezora.",
  },
  "cart.empty.title": {
    LOVELY: "Your lovely finds are waiting",
    ELEGANT: "Your cart is ready when you are",
    PLAYFUL: "Your cart is ready for a little magic ✨",
    CLASSIC: "Your cart is empty",
  },
  "cart.empty.description": {
    LOVELY: "Explore beautiful finds from local shops.",
    ELEGANT: "Explore a considered selection from local shops.",
    PLAYFUL: "Let’s find something brilliant from a local shop.",
    CLASSIC: "Browse products from local shops.",
  },
  "wishlist.empty.title": {
    LOVELY: "A lovely wishlist starts here",
    ELEGANT: "Your wishlist is ready to curate",
    PLAYFUL: "Save your next favourites here 💫",
    CLASSIC: "Your wishlist is empty",
  },
  "wishlist.empty.description": {
    LOVELY: "Save the pieces you love and return whenever you like.",
    ELEGANT: "Save considered finds to revisit at your convenience.",
    PLAYFUL: "Tap the heart on anything that catches your eye.",
    CLASSIC: "Save products you like and come back to them anytime.",
  },
  "toast.cart.added": {
    LOVELY: "A lovely find! Added to your bag. 💕",
    ELEGANT: "Your selection has been added to your bag.",
    PLAYFUL: "Great pick! It's in your bag. ✨",
    CLASSIC: "Added to your cart.",
  },
  "toast.cart.removed": {
    LOVELY: "Removed from your shopping bag.",
    ELEGANT: "Item removed from your bag.",
    PLAYFUL: "Making room for something else? Item removed.",
    CLASSIC: "Removed from your cart.",
  },
  "toast.wishlist.added": {
    LOVELY: "Saved to your favourites, lovely! 💕",
    ELEGANT: "A beautiful choice. Added to your wishlist.",
    PLAYFUL: "Ooh, good taste! Added to your wishlist. ✨",
    CLASSIC: "Added to your wishlist.",
  },
  "toast.wishlist.removed": {
    LOVELY: "Removed from your favourites.",
    ELEGANT: "Removed from your wishlist.",
    PLAYFUL: "Changed your mind? Removed from your wishlist.",
    CLASSIC: "Removed from your wishlist.",
  },
  "toast.profile.updated": {
    LOVELY: "Your details are looking lovely! Changes saved.",
    ELEGANT: "Your profile has been updated.",
    PLAYFUL: "All updated! You're good to go. ✨",
    CLASSIC: "Profile updated successfully.",
  },
  "toast.preferences.updated": {
    LOVELY: "Just the way you like it! Preferences saved. 💕",
    ELEGANT: "Your preferences have been updated.",
    PLAYFUL: "New vibe, unlocked! ✨",
    CLASSIC: "Preferences saved.",
  },
  "toast.review.submitted": {
    LOVELY: "Thank you, lovely! Your review has been shared.",
    ELEGANT: "Thank you for sharing your experience.",
    PLAYFUL: "Love your feedback! Thanks for sharing. ✨",
    CLASSIC: "Review submitted successfully.",
  },
  "discovery.empty.title": {
    LOVELY: "More lovely finds are on the way",
    ELEGANT: "New selections are coming soon",
    PLAYFUL: "Fresh finds are loading up soon ✨",
    CLASSIC: "No products available yet",
  },
  "discovery.empty.description": {
    LOVELY: "Beautiful products from Mwezora shops will appear here.",
    ELEGANT: "Products from Mwezora shops will appear here shortly.",
    PLAYFUL: "Check back soon for something new to discover.",
    CLASSIC: "Products from Mwezora shops will appear here.",
  },
};

export function getPersonalityMessage(
  key: PersonalityMessageKey,
  personality: PlatformPersonality,
): string {
  return messages[key]?.[personality] ?? messages[key].CLASSIC;
}

export type PersonalityToastKey = Extract<PersonalityMessageKey, `toast.${string}`>;

export function getPersonalityToastMessage(
  key: PersonalityToastKey,
  personality: PlatformPersonality,
): string {
  return getPersonalityMessage(key, personality);
}
