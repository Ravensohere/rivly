import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";

const NotFound = () => (
  <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center page-container">
    {/* An SPA 404 still returns HTTP 200, so noIndex is the only signal crawlers get. */}
    <SEO title="Page not found" noIndex />
    <div
      aria-hidden="true"
      className="mb-8 h-24 w-24 rounded-full opacity-80 animate-breathe"
      style={{
        background:
          "radial-gradient(circle at 35% 30%, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.25) 60%, transparent 75%)",
      }}
    />
    <h2
      className="mb-3 text-3xl"
      style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic" }}
    >
      This page wandered off
    </h2>
    <p className="mb-8 max-w-sm text-muted-foreground">
      Nothing here — but your day is still waiting for you.
    </p>
    <Link
      to="/app"
      className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
    >
      Back to your day
    </Link>
  </div>
);

export default NotFound;
