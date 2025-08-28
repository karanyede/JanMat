import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { News } from "../types";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Calendar,
  Share,
  Bookmark,
  Heart,
  MessageCircle,
} from "lucide-react";
import { formatRelativeTime } from "../lib/utils";

const NewsReels = () => {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    fetchNews();
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === "ArrowDown" && currentIndex < news.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentIndex, news.length]);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching news:", error);
      } else {
        setNews(data || []);
      }
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > 50;
    const isDownSwipe = distance < -50;

    if (isUpSwipe && currentIndex < news.length - 1) {
      // Swipe up - next news
      setCurrentIndex(currentIndex + 1);
    }

    if (isDownSwipe && currentIndex > 0) {
      // Swipe down - previous news
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < news.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (news.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-600 mb-4">
            No News Available
          </h2>
          <p className="text-gray-500">Check back later for updates.</p>
        </div>
      </div>
    );
  }

  const currentNews = news[currentIndex];

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navigation indicators */}
      <div className="absolute top-4 right-4 z-20 flex flex-col space-y-1">
        {news.map((_, index) => (
          <div
            key={index}
            className={`w-1 h-8 rounded-full transition-all ${
              index === currentIndex ? "bg-white" : "bg-white/30"
            }`}
          />
        ))}
      </div>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          onClick={goToPrevious}
          className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-all"
        >
          <ChevronUp size={20} />
        </button>
      )}

      {currentIndex < news.length - 1 && (
        <button
          onClick={goToNext}
          className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-20 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-all"
        >
          <ChevronDown size={20} />
        </button>
      )}

      {/* News content */}
      <div className="relative h-full w-full">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${currentNews.image_url || "https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=1200"})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40" />
        </div>

        {/* Side action buttons (Instagram style) */}
        <div className="absolute right-4 bottom-32 z-20 flex flex-col space-y-4">
          <button className="flex flex-col items-center text-white">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-1">
              <Heart size={24} />
            </div>
            <span className="text-xs">Like</span>
          </button>

          <button className="flex flex-col items-center text-white">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-1">
              <MessageCircle size={24} />
            </div>
            <span className="text-xs">Comment</span>
          </button>

          <button className="flex flex-col items-center text-white">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-1">
              <Share size={24} />
            </div>
            <span className="text-xs">Share</span>
          </button>

          <button className="flex flex-col items-center text-white">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-1">
              <Bookmark size={24} />
            </div>
            <span className="text-xs">Save</span>
          </button>
        </div>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 text-white">
          {/* Author info */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {currentNews.author_name?.charAt(0).toUpperCase() || "N"}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg">{currentNews.author_name}</p>
              <div className="flex items-center space-x-3 text-sm opacity-90">
                <span className="bg-white/20 px-2 py-1 rounded-full capitalize text-xs">
                  {currentNews.category}
                </span>
                <div className="flex items-center space-x-1">
                  <Calendar size={14} />
                  <span>{formatRelativeTime(currentNews.created_at)}</span>
                </div>
              </div>
            </div>
            {currentNews.external_url && (
              <a
                href={currentNews.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 px-3 py-2 rounded-full hover:bg-blue-700 transition-all"
              >
                <ExternalLink size={16} />
              </a>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-3 leading-tight">
            {currentNews.title}
          </h1>

          {/* Content */}
          <p className="text-base mb-4 leading-relaxed opacity-95 line-clamp-4">
            {currentNews.content}
          </p>

          {/* Progress indicator */}
          <div className="flex justify-center">
            <div className="text-sm opacity-70">
              {currentIndex + 1} of {news.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsReels;
