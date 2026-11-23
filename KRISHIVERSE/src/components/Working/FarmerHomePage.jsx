import React from "react";
import { Link } from "react-router-dom";

export default function FarmerHomePage() {
  const mainActions = [
    { icon: "🌱", label: "Check Plant", path: "/diagnose" },
    { icon: "💬", label: "Ask Help", path: "/ask" },
    { icon: "☀️", label: "Weather", path: "/weather" },
    { icon: "💰", label: "Prices", path: "/prices" }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        {/* Welcome Message */}
        <div className="bg-green-600 rounded-3xl p-8 text-white text-center mb-8">
          <div className="text-6xl mb-4">👨‍🌾</div>
          <h1 className="text-4xl font-bold mb-4">Welcome Farmer!</h1>
          <p className="text-2xl">Your Farm Helper</p>
        </div>

        {/* Main Actions - HUGE BUTTONS */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {mainActions.map((action, index) => (
            <Link
              key={index}
              to={action.path}
              className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-4 border-gray-200 hover:border-green-400"
            >
              <div className="text-center">
                <div className="text-6xl mb-4">{action.icon}</div>
                <div className="text-2xl font-bold text-gray-800">{action.label}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Info */}
        <div className="bg-white rounded-3xl p-6 shadow-lg mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Today's Farm Info</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-2xl">
              <div className="text-4xl mb-2">🌡️</div>
              <div className="text-xl font-bold text-blue-800">28°C</div>
              <div className="text-lg text-blue-600">Temperature</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-2xl">
              <div className="text-4xl mb-2">💧</div>
              <div className="text-xl font-bold text-green-800">65%</div>
              <div className="text-lg text-green-600">Soil Water</div>
            </div>
          </div>
        </div>

        {/* Important News */}
        <div className="bg-yellow-50 rounded-3xl p-6 border-4 border-yellow-300">
          <h2 className="text-3xl font-bold text-yellow-800 mb-4 text-center">⚠️ Important</h2>
          <div className="bg-white rounded-2xl p-4">
            <p className="text-xl text-gray-800 text-center">Heavy rain expected tomorrow</p>
            <p className="text-lg text-gray-600 text-center mt-2">Protect your crops</p>
          </div>
        </div>

        {/* Help Button */}
        <div className="text-center mt-8">
          <button className="bg-blue-600 text-white rounded-2xl px-8 py-4 text-2xl font-bold hover:bg-blue-700 transition-colors">
            📞 Call Help
          </button>
        </div>
      </div>
    </div>
  );
}
