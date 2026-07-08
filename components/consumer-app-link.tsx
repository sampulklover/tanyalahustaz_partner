import { CONSUMER_APP_NAME, CONSUMER_APP_URL } from "@/lib/brand";

/**
 * Standard footer link on developer-portal auth pages (Stripe/Twilio pattern):
 * one subtle line pointing consumers to the main product — not a prominent banner.
 */
export function ConsumerAppLink() {
  return (
    <p className="text-center text-sm text-[color:var(--muted)]">
      Looking for the {CONSUMER_APP_NAME} app?{" "}
      <a
        href={CONSUMER_APP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-brand-600 hover:underline dark:text-brand-500"
      >
        Go to {CONSUMER_APP_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")} →
      </a>
    </p>
  );
}
