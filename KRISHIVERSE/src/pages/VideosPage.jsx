import React, { useEffect, useState } from "react";
import { VideoCamera, Play, Tag, X } from "@phosphor-icons/react";

const VIDEO_DATA = [
  {
    id: "organic_1",
    youtubeId: "vB-B06t_4xU",
    title: "Introduction to Organic Farming Techniques",
    category: "Organic Farming",
    duration: "10:15",
  },
  {
    id: "pest_1",
    youtubeId: "2n10pA4g9yA",
    title: "Natural Pest Control Methods",
    category: "Pest Management",
    duration: "08:45",
  },
  {
    id: "water_1",
    youtubeId: "7K0Z6B79mX8",
    title: "Drip Irrigation Best Practices",
    category: "Water Management",
    duration: "12:30",
  },
  {
    id: "soil_1",
    youtubeId: "",
    title: "Improving Soil Health Naturally",
    category: "Soil Health",
    duration: "15:20",
  },
  {
    id: "equip_1",
    youtubeId: "",
    title: "Basic Tractor Maintenance",
    category: "Equipment",
    duration: "09:10",
  },
  {
    id: "organic_2",
    youtubeId: "",
    title: "Making Compost at Home",
    category: "Organic Farming",
    duration: "06:55",
  },
];

const CATEGORIES = ["All", ...new Set(VIDEO_DATA.map((v) => v.category))];

function isValidYoutubeId(id) {
  return /^[A-Za-z0-9_-]{11}$/.test(String(id));
}

export default function VideosPage() {
  const [filter, setFilter] = useState("All");
  const [openVideo, setOpenVideo] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  const visibleVideos =
    filter === "All" ? VIDEO_DATA : VIDEO_DATA.filter((v) => v.category === filter);

  useEffect(() => {
    if (!openVideo) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenVideo(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openVideo]);

  return (
    <div className="flex flex-col gap-5 pt-2 pb-6">
      <div>
        <h1 className="text-[22px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)] flex items-center gap-2">
          <VideoCamera weight="fill" size={28} className="text-[var(--kv-green)]" />
          Krishi TV
        </h1>
        <p className="text-[13px] text-[var(--kv-grey-mid)] mt-1">
          Expert tutorials and guides for modern farming.
        </p>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-2 pb-1 scrollbar-hide -mx-4 px-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            type="button"
            className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-bold transition-all flex items-center gap-1.5 border active:scale-95 ${
              filter === cat
                ? "bg-[var(--kv-green)] text-white border-[var(--kv-green)] shadow-sm"
                : "bg-white text-[var(--kv-grey-dark)] border-[var(--kv-divider)] hover:bg-[var(--kv-off-white)]"
            }`}
            aria-pressed={filter === cat}
          >
            {cat !== "All" && <Tag weight="fill" size={14} />}
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visibleVideos.map((video) => (
          <div
            key={video.id}
            className="kv-card !p-0 overflow-hidden border border-[var(--kv-divider)] !shadow-sm"
          >
            <button
              type="button"
              className="relative aspect-video bg-[var(--kv-off-white)] cursor-pointer overflow-hidden"
              onClick={() => {
                if (isValidYoutubeId(video.youtubeId)) setOpenVideo(video);
              }}
              disabled={!isValidYoutubeId(video.youtubeId)}
              aria-label={
                isValidYoutubeId(video.youtubeId)
                  ? `Play video: ${video.title}`
                  : `Preview unavailable for ${video.title}`
              }
            >
              {isValidYoutubeId(video.youtubeId) && !imageErrors[video.id] ? (
                <img
                  src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                  alt={video.title}
                  width="480"
                  height="360"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    setImageErrors((prev) => ({ ...prev, [video.id]: true }));
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--kv-green-light)] via-white to-[var(--kv-off-white)] flex flex-col items-center justify-center text-[var(--kv-grey-dark)] px-4 text-center">
                  <VideoCamera size={36} weight="duotone" className="text-[var(--kv-green)] mb-2" />
                  <span className="text-[13px] font-semibold leading-snug">
                    {isValidYoutubeId(video.youtubeId) ? "Thumbnail unavailable" : "Video preview coming soon"}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="w-12 h-12 bg-[var(--kv-green)] text-white rounded-full flex items-center justify-center shadow-lg">
                  <Play weight="fill" className="ml-0.5" size={22} />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-bold px-2 py-1 rounded-md">
                {video.duration}
              </div>
            </button>

            <div className="p-4">
              <span className="kv-chip kv-chip-green text-[10px] mb-2">{video.category}</span>
              <h3 className="font-bold text-[15px] text-[var(--kv-near-black)] leading-snug line-clamp-2">
                {video.title}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {openVideo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-dialog-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setOpenVideo(null);
            }
          }}
        >
          <div className="w-full max-w-4xl bg-[var(--kv-white)] rounded-[20px] overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 bg-[var(--kv-off-white)] border-b border-[var(--kv-divider)]">
              <h2 id="video-dialog-title" className="font-bold text-[15px] text-[var(--kv-near-black)] truncate pr-4">
                {openVideo.title}
              </h2>
              <button
                onClick={() => setOpenVideo(null)}
                type="button"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--kv-divider)] active:scale-95"
                aria-label="Close video player"
              >
                <X size={20} weight="bold" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${openVideo.youtubeId}?autoplay=1`}
                title={openVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
