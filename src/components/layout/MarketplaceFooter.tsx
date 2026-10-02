import Link from "next/link";
import Image from "next/image";
import { CookieSettingsButton } from "@/components/legal/cookie-consent";

const groups = [
  {
    title: "Shop",
    links: [
      { label: "Products", href: "/products" },
      { label: "Categories", href: "/categories" },
      { label: "Shops", href: "/shops" },
      { label: "Current offers", href: "/deals" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "My orders", href: "/orders" },
      { label: "Wishlist", href: "/wishlist" },
      { label: "Account settings", href: "/settings" },
    ],
  },
  { title: "Help", links: [{ label: "Help center", href: "/help" }, { label: "Privacy Policy", href: "/privacy-policy" }, { label: "Cookie Policy", href: "/cookie-policy" }] },
  {
    title: "Sell on SmartDuka",
    links: [{ label: "Become a seller", href: "/become-seller" }],
  },
];

const paymentMethods = [
  { name: "MTN MoMo", src: "/payment-logos/mtn-momo.svg", width: 60 },
  { name: "Airtel Money", src: "/payment-logos/airtel.svg", width: 28 },
  { name: "Visa", src: "/payment-logos/visa.svg", width: 36 },
  { name: "Mastercard", src: "/payment-logos/mastercard.svg", width: 28 },
];

export function MarketplaceFooter() {
  return (
    <footer className="border-t border-border/70 bg-muted/30 pb-20 pt-9 text-card-foreground md:pb-7 md:pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.7fr)_repeat(4,minmax(0,1fr))] lg:gap-7">
          <section className="max-w-sm" aria-labelledby="footer-brand">
            <Link
              href="/"
              id="footer-brand"
              className="inline-flex text-lg font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              SmartDuka
            </Link>
            <p className="mt-3 text-sm font-medium leading-6 text-foreground">
              Shop from local businesses in one place.
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Discover products, explore categories, and support local sellers.
            </p>
            <Link
              href="/products"
              className="mt-4 inline-flex min-h-10 items-center rounded-full bg-primary px-3.5  text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:text-white">
              Browse products
            </Link>
          </section>
          {groups.map((group) => (
            <section
              key={group.title}
              aria-labelledby={`footer-${group.title.replaceAll(" ", "-").toLowerCase()}`}>
              <h2
                id={`footer-${group.title.replaceAll(" ", "-").toLowerCase()}`}
                className="text-sm font-semibold text-foreground">
                {group.title}
              </h2>
              <ul className="mt-3 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-1 border-t border-border/70 pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SmartDuka. All Rights Reserved</p>

          <div className="flex flex-wrap items-center gap-2" aria-label="Accepted payment methods">
            <CookieSettingsButton />
            <span aria-hidden="true">·</span>
            <span className="mr-1">Pay with</span>
            {paymentMethods.map((method) => (
              <div
                key={method.name}
                className="inline-flex h-7 items-center justify-center shadow-sm">
                <Image src={method.src} alt={method.name} width={method.width} height={24} className="h-8 w-auto object-cover" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
