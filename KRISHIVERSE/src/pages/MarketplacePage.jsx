import { 
  MagnifyingGlass,
  Faders,
  CaretRight,
  PlusCircle,
  Wrench,
  Plant,
  Bug,
  Cow,
  ArrowLeft,
  ChatTeardropText,
  User,
  Trash,
  Check,
  PaperPlaneRight
} from "@phosphor-icons/react";
import { dbGet, dbPut, dbDelete, dbGetAll } from "../services/db/indexedDb";
import { DB_STORES } from "../services/db/schemas";
import { useState, useEffect } from "react";

const CATEGORIES = [
  { id: "all", label: "All", icon: null },
  { id: "equipment", label: "Equipment", icon: Wrench },
  { id: "seeds", label: "Seeds", icon: Plant },
  { id: "livestock", label: "Livestock", icon: Cow },
  { id: "pesticides", label: "Pesticides", icon: Bug },
];

const MOCK_LISTINGS = [
  {
    id: 1,
    title: "John Deere 5050D Tractor",
    price: "₹4,50,000",
    location: "Erode, TN",
    category: "equipment",
    image: "https://images.unsplash.com/photo-1595055530932-9ecb52994966?auto=format&fit=crop&q=80&w=400",
    condition: "Used - 3 years",
    owner: "Senthil Kumar",
  },
  {
    id: 2,
    title: "Organic Ponni Paddy Seeds",
    price: "₹1,200 / 25kg",
    location: "Pollachi, TN",
    category: "seeds",
    image: "https://images.unsplash.com/photo-1536633100340-9755675e4695?auto=format&fit=crop&q=80&w=400",
    condition: "Fresh Stock",
    owner: "Ramya Agri",
  },
  {
    id: 3,
    title: "Desi Gir Cow (Healthy)",
    price: "₹65,000",
    location: "Udumalaipettai, TN",
    category: "livestock",
    image: "https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=400",
    condition: "2nd Lactation",
    owner: "Farmer Murugan",
  },
  {
    id: 4,
    title: "Mini Power Tiller",
    price: "₹18,000",
    location: "Salem, TN",
    category: "equipment",
    image: "https://images.unsplash.com/photo-1592833159057-6fdc2a5dc074?auto=format&fit=crop&q=80&w=400",
    condition: "Brand New",
    owner: "Kisan Stores",
  },
];

export default function MarketplacePage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState("buyer"); // buyer, seller, create, chat
  const [userListings, setUserListings] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [newListing, setNewListing] = useState({
    title: "", price: "", location: "", category: "equipment", condition: "New"
  });

  useEffect(() => {
    loadUserListings();
  }, []);

  const loadUserListings = async () => {
    const all = await dbGetAll(DB_STORES.marketplace);
    // Filter for current user (simulated as ones we created)
    setUserListings(all || []);
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    const listing = {
      ...newListing,
      id: Date.now(),
      owner: "You",
      image: "https://images.unsplash.com/photo-1592833159057-6fdc2a5dc074?auto=format&fit=crop&q=80&w=400",
      createdAt: new Date().toISOString()
    };
    await dbPut(DB_STORES.marketplace, listing);
    setNewListing({ title: "", price: "", location: "", category: "equipment", condition: "New" });
    loadUserListings();
    setView("seller");
  };

  const handleDeleteListing = async (id) => {
    await dbDelete(DB_STORES.marketplace, id);
    loadUserListings();
  };

  const allListings = [...MOCK_LISTINGS, ...userListings];

  const filteredListings = allListings.filter(item => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (view === "create") {
    return (
      <div className="pb-20">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView("buyer")} className="btn btn-ghost btn-circle">
            <ArrowLeft />
          </button>
          <h1 className="text-xl font-black">Create Listing</h1>
        </div>

        <form onSubmit={handleCreateListing} className="space-y-4 bg-base-100 p-6 rounded-[2.5rem] border border-base-content/5 shadow-sm">
          <div className="space-y-1">
            <label className="text-xs font-bold pl-2 opacity-50 uppercase">Item Title</label>
            <input 
              required
              className="input input-bordered w-full rounded-2xl bg-base-200/50 border-none" 
              placeholder="e.g. Sonalika Tractor"
              value={newListing.title}
              onChange={e => setNewListing({...newListing, title: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold pl-2 opacity-50 uppercase">Price</label>
              <input 
                required
                className="input input-bordered w-full rounded-2xl bg-base-200/50 border-none" 
                placeholder="₹ 50,000"
                value={newListing.price}
                onChange={e => setNewListing({...newListing, price: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold pl-2 opacity-50 uppercase">Category</label>
              <select 
                className="select select-bordered w-full rounded-2xl bg-base-200/50 border-none"
                value={newListing.category}
                onChange={e => setNewListing({...newListing, category: e.target.value})}
              >
                {CATEGORIES.slice(1).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold pl-2 opacity-50 uppercase">Location</label>
            <input 
              required
              className="input input-bordered w-full rounded-2xl bg-base-200/50 border-none" 
              placeholder="e.g. Coimbatore, TN"
              value={newListing.location}
              onChange={e => setNewListing({...newListing, location: e.target.value})}
            />
          </div>
          <button type="submit" className="btn btn-primary w-full rounded-2xl mt-4 h-14 font-black text-lg">
            Post Listing
          </button>
        </form>
      </div>
    );
  }

  if (view === "seller") {
    return (
      <div className="pb-20">
         <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setView("buyer")} className="btn btn-ghost btn-circle">
              <ArrowLeft />
            </button>
            <h1 className="text-xl font-black">My Dashboard</h1>
          </div>
          <button onClick={() => setView("create")} className="btn btn-primary btn-sm rounded-full">
            <PlusCircle size={18} weight="fill" /> Add
          </button>
        </div>

        <div className="grid gap-4">
          <div className="bg-primary/5 p-6 rounded-[2.5rem] border border-primary/20">
            <p className="text-xs font-bold opacity-50 uppercase mb-1">Active Listings</p>
            <p className="text-4xl font-black text-primary">{userListings.length}</p>
          </div>

          <h2 className="text-lg font-black mt-4 ml-2">Currently Selling</h2>
          {userListings.length === 0 ? (
            <div className="text-center py-10 opacity-30">No active listings</div>
          ) : (
            userListings.map(item => (
              <div key={item.id} className="bg-base-100 p-4 rounded-3xl border border-base-content/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-base-200 overflow-hidden">
                    <img src={item.image} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{item.title}</h4>
                    <p className="text-xs opacity-50">{item.price}</p>
                  </div>
                </div>
                <button onClick={() => handleDeleteListing(item.id)} className="btn btn-ghost btn-sm btn-circle text-error">
                  <Trash size={20} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (view === "chat") {
    return (
      <div className="fixed inset-0 bg-base-100 z-50 flex flex-col pb-safe">
        <div className="p-4 border-b border-base-content/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button onClick={() => setView("buyer")} className="btn btn-ghost btn-sm btn-circle"><ArrowLeft /></button>
             <div>
               <p className="font-black text-sm">{activeChat?.owner}</p>
               <p className="text-[10px] text-success font-bold">Online</p>
             </div>
          </div>
          <div className="flex -space-x-2">
             <div className="w-8 h-8 rounded-full border-2 border-base-100 bg-base-200 flex items-center justify-center text-[10px] font-bold"><User size={14} weight="fill" /></div>
          </div>
        </div>
        <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto bg-base-200/30">
           <div className="bg-base-100 p-3 rounded-2xl rounded-tl-none self-start max-w-[80%] border border-base-content/5 shadow-sm">
              <p className="text-xs font-semibold">Hello! Is the {activeChat?.title} still available?</p>
              <p className="text-[9px] opacity-40 mt-1">10:42 AM</p>
           </div>
           <div className="bg-primary text-primary-content p-3 rounded-2xl rounded-tr-none self-end max-w-[80%] shadow-md">
              <p className="text-xs font-bold">Yes, it is available. Where are you located?</p>
              <p className="text-[9px] opacity-70 mt-1">10:45 AM</p>
           </div>
           <div className="bg-base-100 p-3 rounded-2xl rounded-tl-none self-start max-w-[80%] border border-base-content/5 shadow-sm">
              <p className="text-xs font-semibold">I'm in {activeChat?.location}. Can I see it tomorrow?</p>
              <p className="text-[9px] opacity-40 mt-1">10:46 AM</p>
           </div>
        </div>
        <div className="p-4 bg-base-100 border-t border-base-content/10 flex gap-2">
            <input className="input flex-1 bg-base-200/50 border-none rounded-2xl text-xs font-bold" placeholder="Type a message..." />
            <button className="btn btn-primary btn-circle"><PaperPlaneRight size={20} weight="fill" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-base-content">Krishi Marketplace</h1>
        <div className="flex gap-2">
          <button onClick={() => setView("seller")} className="btn btn-ghost btn-sm rounded-full text-xs font-bold">
            <User size={16} weight="fill" /> Dashboard
          </button>
          <button onClick={() => setView("create")} className="btn btn-primary btn-sm rounded-full gap-1 shadow-lg shadow-primary/20">
            <PlusCircle size={18} weight="fill" />
            Sell
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" size={20} />
        <input 
          type="text" 
          placeholder="Search tractors, seeds, livestock..."
          className="w-full pl-10 pr-4 py-3 bg-base-200 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none text-sm shadow-inner"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
          <Faders size={20} weight="fill" />
        </button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
              activeCategory === cat.id 
                ? "bg-primary text-primary-content shadow-md shadow-primary/20" 
                : "bg-base-100 border border-base-200 text-base-content/70 hover:bg-base-200"
            }`}
          >
            {cat.icon && <cat.icon size={16} weight="fill" />}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 gap-4 mt-2">
        {filteredListings.length > 0 ? (
          filteredListings.map((item) => (
            <div 
              key={item.id}
              className="bg-base-100 rounded-3xl overflow-hidden border border-base-200 shadow-sm hover:shadow-md transition-shadow flex h-36"
            >
              <div className="w-1/3 relative">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  {item.category}
                </div>
              </div>
              
              <div className="w-2/3 p-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-base-content text-sm line-clamp-1">{item.title}</h3>
                    <CaretRight size={16} className="text-base-content/30" />
                  </div>
                  <p className="text-primary font-black text-lg">{item.price}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] text-base-content/60 flex items-center gap-1">
                    📍 {item.location} • {item.condition}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-base-content/40">By {item.owner}</p>
                    <button 
                      onClick={() => { setActiveChat(item); setView("chat"); }}
                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <ChatTeardropText size={14} weight="fill" /> Contact
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 opacity-50">
            <div className="bg-base-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MagnifyingGlass size={32} />
            </div>
            <p className="text-base-content/60 font-medium">No listings found for your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
