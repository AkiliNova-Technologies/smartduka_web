import { describe, expect, it } from "vitest";
import { PLATFORM_PERSONALITIES } from "@/lib/appearance";
import { getPersonalityMessage, getPersonalityToastMessage, type PersonalityMessageKey } from "@/lib/personality-messages";

describe("platform personality messages", () => {
  it("defaults to Lovely and provides every supported personality", () => {
    expect(getPersonalityMessage("home.welcome", "LOVELY")).toBe("Welcome back, lovely!");
    for (const personality of PLATFORM_PERSONALITIES) {
      expect(getPersonalityMessage("home.welcome", personality)).toBeTruthy();
      expect(getPersonalityMessage("cart.empty.title", personality)).toBeTruthy();
      expect(getPersonalityMessage("wishlist.empty.description", personality)).toBeTruthy();
    }
  });

  it("provides the approved action feedback for every personality", () => {
    expect(getPersonalityToastMessage("toast.wishlist.added", "LOVELY")).toBe("Saved to your favourites, lovely! 💕");
    expect(getPersonalityToastMessage("toast.wishlist.removed", "PLAYFUL")).toBe("Changed your mind? Removed from your wishlist.");
    expect(getPersonalityToastMessage("toast.cart.added", "ELEGANT")).toBe("Your selection has been added to your bag.");
    expect(getPersonalityToastMessage("toast.cart.removed", "CLASSIC")).toBe("Removed from your cart.");
    expect(getPersonalityToastMessage("toast.profile.updated", "LOVELY")).toBe("Your details are looking lovely! Changes saved.");
    expect(getPersonalityToastMessage("toast.preferences.updated", "PLAYFUL")).toBe("New vibe, unlocked! ✨");
    expect(getPersonalityToastMessage("toast.review.submitted", "ELEGANT")).toBe("Thank you for sharing your experience.");
  });

  it("keeps transactional and security messages outside the noncritical catalog", () => {
    const noncriticalKeys: PersonalityMessageKey[] = [
      "home.welcome",
      "cart.empty.title",
      "wishlist.empty.title",
      "toast.cart.added",
      "discovery.empty.title",
    ];
    expect(noncriticalKeys.some((key) => /payment|order|refund|security|verification/.test(key))).toBe(false);
  });
});
