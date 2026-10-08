import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { appConfig } from "../../services/config/appConfig";

const DEFAULT_DESCRIPTION =
  "KrishiVerse is an offline-first agricultural advisory app for farmers in South India with weather, mandi prices, crop diagnosis, government schemes, videos, and helpline access.";

const ROUTE_META = {
  "/": {
    title: "KrishiVerse | Agricultural Advisory for Farmers",
    description:
      "Get crop advice, local weather, mandi prices, and practical farming tools in one offline-first app.",
  },
  "/ask": {
    title: "Ask KrishiVerse AI | Farmer Advisory Chat",
    description:
      "Ask farming questions about crops, pests, fertilizers, irrigation, and schemes with online and offline advisory support.",
  },
  "/diagnose": {
    title: "Crop Doctor AI | Plant Disease Diagnosis",
    description:
      "Upload a plant photo and get a crop disease diagnosis with treatment guidance and offline fallback support.",
  },
  "/weather": {
    title: "Weather Forecast | KrishiVerse",
    description:
      "View current farm weather, hourly updates, and a five-day outlook with practical agricultural advisories.",
  },
  "/prices": {
    title: "Mandi Prices | KrishiVerse",
    description:
      "Track crop prices, watch your favorite commodities, and compare mandi market data with offline support.",
  },
  "/schemes": {
    title: "Government Schemes | KrishiVerse",
    description:
      "Browse agricultural schemes, farmer benefits, and support programs designed for growers in India.",
  },
  "/videos": {
    title: "Krishi TV | Farming Videos",
    description:
      "Watch curated farming tutorials on irrigation, soil health, pest control, and organic growing techniques.",
  },
  "/finance": {
    title: "Farm Finance | KrishiVerse",
    description:
      "Explore farmer-focused finance information, planning tools, and support resources from KrishiVerse.",
  },
  "/marketplace": {
    title: "Krishi Marketplace | Buy and Sell Farm Goods",
    description:
      "Discover farm equipment, seeds, livestock, and other agricultural listings in the KrishiVerse marketplace.",
  },
  "/helpline": {
    title: "Helpline | KrishiVerse",
    description:
      "Reach agricultural support contacts and essential farmer helpline information from one place.",
  },
  "/onboarding": {
    title: "Welcome to KrishiVerse",
    description:
      "Complete a quick onboarding flow so KrishiVerse can personalize weather, crop, and advisory experiences.",
  },
  "/welcome": {
    title: "Welcome to KrishiVerse",
    description:
      "Create a KrishiVerse account for personalised crop advice and offline sync, or keep exploring signed out.",
  },
  "/login": {
    title: "Sign In | KrishiVerse",
    description: "Sign in to your KrishiVerse account to sync your farm profile across devices.",
  },
  "/register": {
    title: "Create Account | KrishiVerse",
    description: "Create a free KrishiVerse account to save your village, crops, and preferences.",
  },
  "/verify": {
    title: "Verify Email | KrishiVerse",
    description: "Enter the verification code we sent you to confirm your KrishiVerse email address.",
  },
  "/forgot": {
    title: "Forgot Password | KrishiVerse",
    description: "Reset your KrishiVerse account password securely by email.",
  },
  "/reset": {
    title: "New Password | KrishiVerse",
    description: "Choose a new password for your KrishiVerse account.",
  },
  "/profile": {
    title: "My Profile | KrishiVerse",
    description: "Manage your KrishiVerse profile — village, farm size, crops, language, and account security.",
  },
};

function getActiveMeta(pathname) {
  return ROUTE_META[pathname] || {
    title: "KrishiVerse | Agricultural Advisory for Farmers",
    description: DEFAULT_DESCRIPTION,
  };
}

function upsertMeta(selector, attribute, value) {
  if (!value) return;

  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("meta");
    const [, attrName, attrValue] = selector.match(/\[(.+?)="(.+?)"\]/) || [];
    if (attrName && attrValue) {
      node.setAttribute(attrName, attrValue);
    }
    document.head.appendChild(node);
  }
  node.setAttribute(attribute, value);
}

function upsertLink(rel, href) {
  if (!href) return;

  let node = document.head.querySelector(`link[rel="${rel}"]`);
  if (!node) {
    node = document.createElement("link");
    node.setAttribute("rel", rel);
    document.head.appendChild(node);
  }
  node.setAttribute("href", href);
}

function getBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin?.startsWith("http")) {
    return window.location.origin;
  }

  return appConfig.siteUrl;
}

export default function Seo() {
  const location = useLocation();

  useEffect(() => {
    const { title, description } = getActiveMeta(location.pathname);
    const baseUrl = getBaseUrl();
    const canonicalUrl = new URL(location.pathname, `${baseUrl.replace(/\/$/, "")}/`).toString();

    document.title = title;
    document.documentElement.lang = appConfig.defaultLanguage || "en";

    upsertMeta('meta[name="description"]', "content", description);
    upsertMeta('meta[name="robots"]', "content", "index, follow");
    upsertMeta('meta[name="theme-color"]', "content", "#2E7D52");
    upsertMeta('meta[property="og:type"]', "content", "website");
    upsertMeta('meta[property="og:site_name"]', "content", appConfig.siteName);
    upsertMeta('meta[property="og:title"]', "content", title);
    upsertMeta('meta[property="og:description"]', "content", description);
    upsertMeta('meta[property="og:url"]', "content", canonicalUrl);
    upsertMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', "content", title);
    upsertMeta('meta[name="twitter:description"]', "content", description);
    upsertLink("canonical", canonicalUrl);

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: appConfig.siteName,
      applicationCategory: "AgricultureApplication",
      operatingSystem: "Any",
      url: canonicalUrl,
      description,
      inLanguage: appConfig.defaultLanguage || "en",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
      },
    };

    let script = document.getElementById("kv-structured-data");
    if (!script) {
      script = document.createElement("script");
      script.id = "kv-structured-data";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);
  }, [location.pathname]);

  return null;
}
