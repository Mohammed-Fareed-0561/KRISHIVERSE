import React, { useState, useEffect } from "react";
import { IconCalendarEvent, IconPlus, IconCheck, IconSearch, IconInfoCircle } from "@tabler/icons-react";
import { dbGet, dbPut } from "../services/db/indexedDb";
import { DB_STORES } from "../services/db/schemas";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Sample fallback data
const CROP_DATA = [
  { id: "rice", name: "Rice", type: "Kharif", regions: ["north", "south", "central"], sowing: [5, 6], growth: [7, 8], harvest: [9, 10] },
  { id: "wheat", name: "Wheat", type: "Rabi", regions: ["north", "central"], sowing: [10, 11], growth: [0, 1, 2], harvest: [3, 4] },
  { id: "millets", name: "Millets", type: "Kharif", regions: ["south", "central"], sowing: [6, 7], growth: [8, 9], harvest: [10, 11] },
  { id: "maize", name: "Maize", type: "Kharif", regions: ["north", "south", "central"], sowing: [5, 6], growth: [7, 8], harvest: [9] },
  { id: "pulses", name: "Pulses", type: "Rabi", regions: ["north", "south", "central"], sowing: [9, 10], growth: [11, 0], harvest: [1, 2] },
  { id: "sugarcane", name: "Sugarcane", type: "Annual", regions: ["north", "south", "central"], sowing: [1, 2], growth: [3, 4, 5, 6, 7, 8, 9, 10], harvest: [11, 0] },
  { id: "cotton", name: "Cotton", type: "Kharif", regions: ["north", "south", "central"], sowing: [4, 5, 6], growth: [7, 8, 9], harvest: [10, 11, 0] },
  { id: "jute", name: "Jute", type: "Kharif", regions: ["north", "central"], sowing: [2, 3], growth: [4, 5, 6], harvest: [7, 8] },
  { id: "oilseeds", name: "Oilseeds", type: "Rabi", regions: ["north", "south", "central"], sowing: [9, 10], growth: [11, 0, 1], harvest: [2, 3] },
  { id: "tea", name: "Tea", type: "Perennial", regions: ["north", "south"], sowing: [0, 1, 2], growth: [3, 4, 5, 6, 7, 8, 9, 10, 11], harvest: [3, 4, 5, 6, 7, 8, 9, 10] },
  { id: "coffee", name: "Coffee", type: "Perennial", regions: ["south"], sowing: [5, 6, 7], growth: [7, 8, 9, 10, 11, 0, 1], harvest: [10, 11, 0, 1] },
  { id: "rubber", name: "Rubber", type: "Perennial", regions: ["south"], sowing: [5, 6], growth: [7, 8, 9, 10, 11, 0], harvest: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { id: "spices", name: "Spices", type: "Kharif", regions: ["south", "north"], sowing: [5, 6], growth: [7, 8, 9, 10], harvest: [11, 0, 1] },
  { id: "fruits", name: "Fruits", type: "Perennial", regions: ["north", "south", "central"], sowing: [6, 7, 8], growth: [9, 10, 11, 0, 1], harvest: [3, 4, 5, 6, 7] },
  { id: "vegetables", name: "Vegetables", type: "Zaid", regions: ["north", "south", "central"], sowing: [1, 2], growth: [3, 4], harvest: [5, 6] },
  
  // South India specific
  { id: "arecanut", name: "Arecanut", type: "Perennial", regions: ["south"], sowing: [5, 6, 7], growth: [8, 9, 10, 11, 0, 1], harvest: [2, 3, 4] },
  { id: "black_pepper", name: "Black Pepper", type: "Perennial", regions: ["south"], sowing: [5, 6], growth: [7, 8, 9, 10, 11], harvest: [0, 1, 2] },
  { id: "cardamom", name: "Cardamom", type: "Perennial", regions: ["south"], sowing: [5, 6], growth: [7, 8, 9, 10, 11, 0], harvest: [1, 2, 3] },
  { id: "cashew", name: "Cashew", type: "Perennial", regions: ["south"], sowing: [6, 7, 8], growth: [9, 10, 11], harvest: [2, 3, 4, 5] },
  { id: "cinnamon", name: "Cinnamon", type: "Perennial", regions: ["south"], sowing: [5, 6], growth: [7, 8, 9, 10], harvest: [11, 0, 1] },
  { id: "clove", name: "Clove", type: "Perennial", regions: ["south"], sowing: [6, 7, 8], growth: [9, 10, 11, 0], harvest: [1, 2, 3] },
  { id: "cocoa", name: "Cocoa", type: "Perennial", regions: ["south"], sowing: [5, 6, 7], growth: [8, 9, 10, 11], harvest: [0, 1, 2, 3] },
  { id: "coconut", name: "Coconut", type: "Perennial", regions: ["south", "central"], sowing: [5, 6], growth: [7, 8, 9], harvest: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { id: "finger_millet", name: "Finger Millet (Ragi)", type: "Kharif", regions: ["south"], sowing: [6, 7], growth: [8, 9], harvest: [10, 11] },
  { id: "tapioca", name: "Tapioca (Cassava)", type: "Kharif", regions: ["south"], sowing: [4, 5], growth: [6, 7, 8, 9, 10], harvest: [11, 0, 1] },
  { id: "vanilla", name: "Vanilla", type: "Perennial", regions: ["south"], sowing: [2, 3], growth: [4, 5, 6, 7, 8, 9, 10], harvest: [11, 0, 1] },
  
  // North India specific
  { id: "almond", name: "Almond", type: "Perennial", regions: ["north"], sowing: [1, 2], growth: [3, 4, 5, 6], harvest: [7, 8] },
  { id: "apple", name: "Apple", type: "Perennial", regions: ["north"], sowing: [1, 2], growth: [3, 4, 5, 6], harvest: [7, 8, 9] },
  { id: "barley", name: "Barley", type: "Rabi", regions: ["north", "central"], sowing: [10, 11], growth: [0, 1, 2], harvest: [3, 4] },
  { id: "carrot", name: "Carrot", type: "Rabi", regions: ["north", "central", "south"], sowing: [8, 9], growth: [10, 11], harvest: [0, 1, 2] },
  { id: "cherry", name: "Cherry", type: "Perennial", regions: ["north"], sowing: [0, 1], growth: [2, 3, 4], harvest: [5, 6] },
  { id: "mustard", name: "Mustard", type: "Rabi", regions: ["north", "central"], sowing: [9, 10], growth: [11, 0, 1], harvest: [2, 3] },
  { id: "peach", name: "Peach", type: "Perennial", regions: ["north"], sowing: [0, 1], growth: [2, 3, 4], harvest: [5, 6] },
  { id: "pearl_millet", name: "Pearl Millet (Bajra)", type: "Kharif", regions: ["north", "central"], sowing: [6, 7], growth: [8, 9], harvest: [10, 11] },
  { id: "plum", name: "Plum", type: "Perennial", regions: ["north"], sowing: [0, 1], growth: [2, 3, 4], harvest: [5, 6] },
  { id: "potato", name: "Potato", type: "Rabi", regions: ["north", "central", "south"], sowing: [9, 10], growth: [11, 0], harvest: [1, 2, 3] },
  { id: "saffron", name: "Saffron", type: "Rabi", regions: ["north"], sowing: [7, 8], growth: [9], harvest: [10, 11] },
  { id: "walnut", name: "Walnut", type: "Perennial", regions: ["north"], sowing: [1, 2], growth: [3, 4, 5, 6, 7], harvest: [8, 9] },
  
  // Central India specific
  { id: "castor", name: "Castor", type: "Kharif", regions: ["central", "south"], sowing: [6, 7], growth: [8, 9, 10, 11], harvest: [0, 1, 2] },
  { id: "coriander", name: "Coriander", type: "Rabi", regions: ["central", "north"], sowing: [9, 10], growth: [11, 0, 1], harvest: [2, 3] },
  { id: "cumin", name: "Cumin", type: "Rabi", regions: ["central", "north"], sowing: [10, 11], growth: [0, 1], harvest: [2, 3] },
  { id: "fennel", name: "Fennel", type: "Rabi", regions: ["central", "north"], sowing: [9, 10], growth: [11, 0, 1], harvest: [2, 3] },
  { id: "fenugreek", name: "Fenugreek", type: "Rabi", regions: ["central", "north"], sowing: [9, 10], growth: [11, 0, 1], harvest: [2, 3] },
  { id: "garlic", name: "Garlic", type: "Rabi", regions: ["central", "north", "south"], sowing: [9, 10], growth: [11, 0, 1], harvest: [2, 3, 4] },
  { id: "groundnut", name: "Groundnut", type: "Kharif", regions: ["central", "south", "north"], sowing: [5, 6], growth: [7, 8], harvest: [9, 10] },
  { id: "linseed", name: "Linseed", type: "Rabi", regions: ["central", "north"], sowing: [9, 10], growth: [11, 0, 1], harvest: [2, 3] },
  { id: "onion", name: "Onion", type: "Rabi", regions: ["central", "north", "south"], sowing: [8, 9], growth: [10, 11, 0], harvest: [1, 2, 3, 4] },
  { id: "orange", name: "Orange", type: "Perennial", regions: ["central", "north", "south"], sowing: [6, 7], growth: [8, 9, 10], harvest: [11, 0, 1, 2] },
  { id: "safflower", name: "Safflower", type: "Rabi", regions: ["central", "south"], sowing: [9, 10], growth: [11, 0, 1], harvest: [2, 3] },
  { id: "sorghum", name: "Sorghum (Jowar)", type: "Kharif", regions: ["central", "south"], sowing: [6, 7], growth: [8, 9], harvest: [10, 11] },
  { id: "soybean", name: "Soybean", type: "Kharif", regions: ["central", "north", "south"], sowing: [5, 6], growth: [7, 8], harvest: [9, 10] },

  // General widespread crops to complete the 50
  { id: "banana", name: "Banana", type: "Perennial", regions: ["north", "south", "central"], sowing: [5, 6, 7], growth: [8, 9, 10, 11, 0, 1, 2], harvest: [3, 4, 5, 6] },
  { id: "cabbage", name: "Cabbage", type: "Rabi", regions: ["north", "south", "central"], sowing: [8, 9, 10], growth: [11, 0], harvest: [1, 2, 3] },
  { id: "cauliflower", name: "Cauliflower", type: "Rabi", regions: ["north", "south", "central"], sowing: [8, 9, 10], growth: [11, 0], harvest: [1, 2, 3] },
  { id: "chilli", name: "Chilli", type: "Kharif", regions: ["north", "south", "central"], sowing: [5, 6, 7], growth: [8, 9, 10], harvest: [11, 0, 1, 2] },
  { id: "ginger", name: "Ginger", type: "Kharif", regions: ["north", "south", "central"], sowing: [4, 5], growth: [6, 7, 8, 9, 10], harvest: [11, 0, 1] },
  { id: "grapes", name: "Grapes", type: "Perennial", regions: ["north", "south", "central"], sowing: [0, 1], growth: [2, 3, 4, 5], harvest: [6, 7, 8] },
  { id: "mango", name: "Mango", type: "Perennial", regions: ["north", "south", "central"], sowing: [5, 6, 7], growth: [8, 9, 10, 11, 0], harvest: [1, 2, 3, 4, 5] },
  { id: "papaya", name: "Papaya", type: "Perennial", regions: ["north", "south", "central"], sowing: [5, 6], growth: [7, 8, 9, 10, 11], harvest: [0, 1, 2, 3, 4] },
  { id: "pomegranate", name: "Pomegranate", type: "Perennial", regions: ["north", "south", "central"], sowing: [0, 1], growth: [2, 3, 4, 5, 6], harvest: [7, 8, 9, 10] },
  { id: "sesame", name: "Sesame", type: "Kharif", regions: ["north", "south", "central"], sowing: [6, 7], growth: [8, 9], harvest: [10, 11] },
  { id: "tomato", name: "Tomato", type: "Kharif", regions: ["north", "south", "central"], sowing: [5, 6, 7], growth: [8, 9], harvest: [10, 11, 0] },
  { id: "turmeric", name: "Turmeric", type: "Kharif", regions: ["north", "south", "central"], sowing: [4, 5], growth: [6, 7, 8, 9, 10], harvest: [11, 0, 1] },
];

const CalendarPage = () => {
  const [filterRegion, setFilterRegion] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [myCrops, setMyCrops] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Load tracked crops
    const loadData = async () => {
      const data = await dbGet(DB_STORES.meta, "my_crops");
      if (data && data.value) {
        setMyCrops(data.value);
      }
    };
    loadData();
  }, []);

  const toggleTrackCrop = async (cropId) => {
    let fresh;
    if (myCrops.includes(cropId)) {
      fresh = myCrops.filter(id => id !== cropId);
    } else {
      fresh = [...myCrops, cropId];
    }
    setMyCrops(fresh);
    await dbPut(DB_STORES.meta, { key: "my_crops", value: fresh });
  };

  const visibleCrops = CROP_DATA.filter(c => {
    if (activeTab === "my" && !myCrops.includes(c.id)) return false;
    if (filterRegion !== "all" && !c.regions?.includes(filterRegion)) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getPhaseClass = (crop, monthIndex) => {
    if (crop.sowing.includes(monthIndex)) return "bg-blue-400"; // Sowing
    if (crop.growth.includes(monthIndex)) return "bg-green-400"; // Growth
    if (crop.harvest.includes(monthIndex)) return "bg-amber-500"; // Harvest
    return "bg-gray-100";
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-base-content flex items-center gap-2">
            <IconCalendarEvent size={32} className="text-primary" />
            Crop Calendar
          </h1>
          <p className="text-base-content/70 mt-1">Track sowing, growth, and harvesting timelines</p>
        </div>
        <div className="flex bg-base-200 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "all" ? "bg-base-100 shadow-sm text-primary" : "text-base-content/80 hover:text-base-content"
            }`}
          >
            All Crops
          </button>
          <button
            onClick={() => setActiveTab("my")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "my" ? "bg-base-100 shadow-sm text-primary" : "text-base-content/80 hover:text-base-content"
            }`}
          >
            My Tracked
          </button>
        </div>
      </div>

      {/* Filters & Legend */}
      <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative max-w-sm flex-1">
            <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
            <input
              type="text"
              placeholder="Search crops..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-base-200 border border-base-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
          </div>
          <select 
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="px-4 py-2 bg-base-200 border border-base-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium text-base-content/80"
          >
            <option value="all">All Regions (India)</option>
            <option value="north">North India</option>
            <option value="south">South India</option>
            <option value="central">Central India</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-base-200/50 text-sm">
          <span className="text-base-content/70 font-medium mr-2">Phases:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-400"></span>
            <span className="text-base-content/80">Sowing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-400"></span>
            <span className="text-base-content/80">Growth</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-base-content/80">Harvesting</span>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      {visibleCrops.length === 0 ? (
        <div className="bg-base-100 border border-base-200 rounded-2xl p-10 text-center">
          <IconInfoCircle size={40} className="mx-auto text-base-content/30 mb-3" />
          <h3 className="text-lg font-bold text-base-content">No crops found</h3>
          <p className="text-base-content/70 mt-1">Try adjusting your search or add crops to My Tracked list.</p>
        </div>
      ) : (
        <div className="bg-base-100 rounded-2xl border border-base-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[700px]">
              {/* Header Row: Months */}
              <div className="grid grid-cols-[200px_repeat(12,1fr)] gap-1 px-4 py-3 bg-base-200/80 border-b border-base-200">
                <div className="font-semibold text-base-content/70 text-xs tracking-wider uppercase pl-2">Crop</div>
                {MONTHS.map((m, i) => (
                  <div key={i} className="text-center font-bold text-base-content/50 text-xs">{m}</div>
                ))}
              </div>

              {/* Body Rows: Crops */}
              <div className="divide-y divide-base-200/50">
                {visibleCrops.map(crop => {
                  const isTracked = myCrops.includes(crop.id);
                  return (
                    <div key={crop.id} className="grid grid-cols-[200px_repeat(12,1fr)] gap-1 px-4 py-4 hover:bg-base-200/50 transition-colors group">
                      <div className="flex items-center justify-between pr-4">
                        <div>
                          <div className="font-semibold text-base-content text-sm">{crop.name}</div>
                          <div className="text-[10px] text-base-content/50 uppercase tracking-wide font-medium mt-0.5">{crop.type} Crop</div>
                        </div>
                        <button
                          onClick={() => toggleTrackCrop(crop.id)}
                          className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                            isTracked 
                              ? "bg-primary text-primary-content" 
                              : "bg-base-200 text-base-content/50 hover:bg-base-300"
                          } md:opacity-0 group-hover:opacity-100 focus:opacity-100`}
                          title={isTracked ? "Remove from My Tracked" : "Add to My Tracked"}
                        >
                          {isTracked ? <IconCheck size={16} /> : <IconPlus size={16} />}
                        </button>
                      </div>
                      
                      {/* Timeline Bars */}
                      <div className="col-span-12 grid grid-cols-12 gap-1 items-center h-8">
                        {MONTHS.map((_, i) => (
                          <div 
                            key={i} 
                            className={`h-6 rounded-sm w-full transition-colors ${getPhaseClass(crop, i)} 
                            ${i === new Date().getMonth() ? "ring-2 ring-base-content ring-offset-1 ring-offset-base-100" : ""}`}
                            title={`Month: ${MONTHS[i]} - ${
                                crop.sowing.includes(i) ? "Sowing" :
                                crop.growth.includes(i) ? "Growth" :
                                crop.harvest.includes(i) ? "Harvest" : "Inactive"
                            }`}
                          ></div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
