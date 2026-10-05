import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Newspaper, RefreshCw, ExternalLink, Calendar, MapPin, Search, Clock } from "lucide-react";
import PullToRefresh from "../components/PullToRefresh";
import { openDB } from 'idb';

const DB_NAME = 'krishiverse-db';
const NEWS_STORE = 'news-cache';

const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(NEWS_STORE)) {
        db.createObjectStore(NEWS_STORE);
      }
    },
  });
};

const REGIONS = [
  "Punjab", "Haryana", "Maharashtra", "Uttar Pradesh", "Gujarat", "Tamil Nadu", 
  "Karnataka", "Andhra Pradesh", "Bihar", "Madhya Pradesh", "Rajasthan"
];

const CATEGORIES = ["All", "Local", "Industry", "Government"];

export default function NewsPage() {
  const { t } = useTranslation();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [userRegion, setUserRegion] = useState(() => localStorage.getItem("krishiverse_region") || "Maharashtra");
  const [lastUpdated, setLastUpdated] = useState(null);

  const getRssUrl = () => {
    let query = "agriculture+india";
    if (activeCategory === "Local") {
      query = `agriculture+${userRegion.replace(" ", "+")}`;
    } else if (activeCategory === "Industry") {
      query = "agritech+india+startup";
    } else if (activeCategory === "Government") {
      query = "PM+Kisan+scheme+subsidy+agriculture+india";
    }
    
    const feedUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
    return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
  };

  const fetchNews = async () => {
    setLoading(true);
    setError("");
    const cacheKey = `${activeCategory}_${userRegion}`;
    
    try {
      const response = await fetch(getRssUrl());
      const data = await response.json();
      
      if (data.status === "ok") {
        setNews(data.items);
        setLastUpdated(new Date());
        
        // Update Cache
        try {
          const db = await initDB();
          await db.put(NEWS_STORE, { items: data.items, timestamp: Date.now() }, cacheKey);
        } catch (dbErr) {
          console.warn("Could not save to cache:", dbErr);
        }
      } else {
        throw new Error("Failed to parse RSS feed");
      }
    } catch (err) {
      console.error("Error fetching news:", err);
      
      // Fallback to cache
      try {
        const db = await initDB();
        const cached = await db.get(NEWS_STORE, cacheKey);
        if (cached) {
          setNews(cached.items);
          setLastUpdated(new Date(cached.timestamp));
          // Don't show error if we have cached data
          return;
        }
      } catch (cacheErr) {
        console.error("Cache read failed:", cacheErr);
      }
      
      setError(t("news.error", "Failed to load recent news. Please try again later."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [activeCategory, userRegion]);

  useEffect(() => {
    localStorage.setItem("krishiverse_region", userRegion);
  }, [userRegion]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  return (
    <PullToRefresh onRefresh={fetchNews}>
      <div className="space-y-6 pb-20 animate-fade-in relative z-10 min-h-[85vh]">
        {/* Header Section */}
        <div className="flex flex-col gap-4 px-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Newspaper className="text-primary w-6 h-6" />
                {t("news.title", "Agri News & Alerts")}
              </h2>
              <p className="text-base-content/70 mt-1">
                {t("news.subtitle", "Latest updates, subsidies, and government policies.")}
              </p>
            </div>
            <button 
              onClick={fetchNews}
              className={`btn btn-circle btn-ghost ${loading ? 'animate-spin' : ''}`}
              disabled={loading}
            >
              <RefreshCw className="w-5 h-5 text-primary" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-grow flex items-center gap-2 bg-base-100 p-1 rounded-xl shadow-sm border border-base-200 overflow-x-auto no-scrollbar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeCategory === cat 
                      ? "bg-primary text-primary-content shadow-md" 
                      : "hover:bg-base-200 text-base-content/70"
                  }`}
                >
                  {t(`news.categories.${cat.toLowerCase()}`, cat)}
                </button>
              ))}
            </div>
            
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-sm bg-base-100 border-base-200 shadow-sm hover:border-primary flex items-center gap-2 rounded-xl h-10 px-4">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="max-w-[100px] truncate">{userRegion}</span>
              </label>
              <ul tabIndex={0} className="dropdown-content z-[20] menu p-2 shadow-xl bg-base-100 rounded-box w-52 border border-base-200 mt-2 max-h-60 overflow-y-auto">
                <li className="menu-title flex flex-row items-center gap-2 px-4 py-2 text-primary">
                  <MapPin className="w-4 h-4" />
                  Select Region
                </li>
                {REGIONS.map(reg => (
                  <li key={reg}>
                    <button 
                      onClick={() => {
                        setUserRegion(reg);
                        const elem = document.activeElement;
                        if (elem) elem.blur();
                      }}
                      className={userRegion === reg ? "bg-primary/10 text-primary font-bold" : ""}
                    >
                      {reg}
                      {userRegion === reg && <div className="badge badge-primary badge-xs ml-auto">Active</div>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card bg-base-100 shadow-sm border border-base-200 animate-pulse">
                <div className="h-48 bg-base-200 rounded-t-2xl"></div>
                <div className="card-body p-4">
                  <div className="h-4 bg-base-200 rounded w-1/4 mb-4"></div>
                  <div className="h-6 bg-base-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-base-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-base-100 rounded-3xl border border-base-200 shadow-sm">
            <div className="bg-error/10 p-4 rounded-full mb-4">
              <Newspaper className="w-10 h-10 text-error" />
            </div>
            <h3 className="text-lg font-bold mb-2">Connection Issues</h3>
            <p className="text-base-content/70 mb-6 max-w-xs">{error}</p>
            <button onClick={fetchNews} className="btn btn-primary px-8 rounded-xl">
              Try Again
            </button>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-20 bg-base-100 rounded-3xl shadow-sm border border-base-200">
            <div className="bg-base-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-base-content/20" />
            </div>
            <h3 className="text-xl font-bold mb-2">No news found</h3>
            <p className="text-base-content/60 max-w-xs mx-auto px-4">
              We couldn't find any specific news for "{activeCategory}" in {userRegion} right now.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
            {news.map((item, idx) => (
              <a 
                key={idx} 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="card bg-base-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] transition-all duration-300 border border-base-200 overflow-hidden group flex flex-col h-full rounded-2xl"
              >
                {item.thumbnail || item.enclosure?.link ? (
                  <figure className="h-48 overflow-hidden relative">
                    <img 
                      src={item.thumbnail || item.enclosure?.link} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                    <div className="absolute top-3 left-3">
                      <div className="badge badge-primary font-bold shadow-sm backdrop-blur-md bg-opacity-80">
                        {activeCategory}
                      </div>
                    </div>
                  </figure>
                ) : (
                  <div className="h-3 bg-primary/10 w-full"></div>
                )}
                <div className="card-body p-5 flex flex-col flex-grow">
                  <div className="flex items-center justify-between text-[11px] font-bold text-base-content/50 uppercase tracking-wider mb-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {formatDate(item.pubDate)}
                    </div>
                    {item.author && <span className="truncate max-w-[120px]">{item.author}</span>}
                  </div>
                  <h3 className="text-lg font-bold leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-sm text-base-content/60 line-clamp-3 mb-4 flex-grow leading-relaxed">
                    {item.description.replace(/(<([^>]+)>)/gi, "")}
                  </p>
                  <div className="card-actions justify-between items-center mt-auto pt-4 border-t border-base-200/50">
                    <span className="text-[10px] text-base-content/40 font-medium">
                      Source: {new URL(item.link).hostname.replace('www.', '')}
                    </span>
                    <span className="text-primary text-sm font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      {t("news.readFull", "Read More")}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
