import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function FarmerNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: "/", icon: "", label: "Home" },
    { path: "/ask", icon: "", label: "Ask" },
    { path: "/diagnose", icon: "", label: "Diagnose" },
    { path: "/weather", icon: "", label: "Weather" },
    { path: "/prices", icon: "", label: "Prices" },
    { path: "/calendar", icon: "", label: "Calendar" },
    { path: "/maps", icon: "", label: "Maps" },
    { path: "/schemes", icon: "", label: "Schemes" },
    { path: "/marketplace", icon: "", label: "Market" },
    { path: "/finance", icon: "", label: "Finance" },
    { path: "/drone", icon: "", label: "Drone" },
    { path: "/videos", icon: "", label: "Videos" },
    { path: "/news", icon: "", label: "News" },
    { path: "/settings", icon: "", label: "Settings" }
  ];

  return (
    <nav className="bg-green-600 border-b-4 border-green-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2">
        {/* Mobile First - Always Visible */}
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center">
              <span className="text-3xl">🌾</span>
            </div>
            <span className="text-white text-2xl font-bold">KrishiVerse</span>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="bg-white p-3 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <span className="text-3xl">{mobileMenuOpen ? '✕' : '☰'}</span>
          </button>
        </div>

        {/* Mobile Menu - Full Width Grid */}
        {mobileMenuOpen && (
          <div className="bg-white border-t-4 border-green-600 py-4">
            <div className="grid grid-cols-3 gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex flex-col items-center p-6 rounded-2xl transition-all ${
                    location.pathname === item.path 
                      ? 'bg-green-100 border-4 border-green-500' 
                      : 'hover:bg-green-50 border-4 border-transparent hover:border-green-200'
                  }`}
                >
                  <span className="text-5xl mb-3">{item.icon}</span>
                  <span className="text-lg font-bold text-gray-800">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
