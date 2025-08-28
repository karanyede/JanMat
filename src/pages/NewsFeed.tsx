import { useState, useEffect } from "react";
import { News } from "../types";
import { supabase } from "../lib/supabase";
import LoadingSpinner from "../components/LoadingSpinner";
import { Calendar, ExternalLink, Eye, Share, RefreshCw } from "lucide-react";
import { formatRelativeTime } from "../lib/utils";

// Dummy news data for testing (now unused as we fetch real data)
/*
const dummyNews: News[] = [
  {
    id: "1",
    title: "New Metro Line to Connect Major IT Hubs",
    content:
      "The state government announced the launch of a new metro line connecting major IT hubs in the city. This initiative aims to reduce traffic congestion and provide better connectivity for daily commuters. The project is expected to be completed within 24 months with an estimated budget of ₹5,000 crores.",
    category: "development",
    image_url:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800",
    author_id: "gov-1",
    published: true,
    priority: "high",
    location: "Mumbai, Maharashtra",
    likes: 245,
    liked_by: [],
    views: 1245,
    published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: "gov-1",
      email: "mumbai@metro.gov.in",
      full_name: "Mumbai Metro Rail Corporation",
      role: "government",
      avatar_url:
        "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100",
      bio: "Official account of Mumbai Metro Rail Corporation",
      is_public: true,
      followers: [],
      following: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "2",
    title: "Digital Health Cards for All Citizens",
    content:
      "The health department launches a digital health card initiative providing every citizen with a unique health ID. This will streamline medical records, enable faster emergency response, and improve healthcare delivery across all government hospitals and clinics in the state.",
    category: "services",
    image_url:
      "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800",
    author_id: "gov-2",
    published: true,
    priority: "medium",
    location: "Delhi, India",
    likes: 189,
    liked_by: [],
    views: 892,
    published_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: "gov-2",
      email: "health@delhi.gov.in",
      full_name: "Department of Health & Family Welfare",
      role: "government",
      avatar_url:
        "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=100",
      bio: "Official health department communications",
      is_public: true,
      followers: [],
      following: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "3",
    title: "₹200 Crore Sanitation Drive Approved",
    content:
      "The municipal corporation approved a comprehensive sanitation drive worth ₹200 crores to improve waste management and cleanliness across the city. The initiative includes installation of smart dustbins, waste segregation plants, and public toilet facilities in high-traffic areas.",
    category: "budget",
    image_url:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    author_id: "gov-3",
    published: true,
    priority: "medium",
    location: "Pune, Maharashtra",
    likes: 134,
    liked_by: [],
    views: 567,
    published_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: "gov-3",
      email: "info@pmc.gov.in",
      full_name: "Pune Municipal Corporation",
      role: "government",
      avatar_url:
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100",
      bio: "Official PMC communications",
      is_public: true,
      followers: [],
      following: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "4",
    title: "Online Property Tax Payment Portal Live",
    content:
      "Citizens can now pay property taxes online through the new digital portal. The system supports multiple payment methods and provides instant receipts. This paperless initiative aims to reduce queues at municipal offices and improve citizen convenience.",
    category: "services",
    image_url:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
    author_id: "gov-4",
    published: true,
    priority: "low",
    location: "Bangalore, Karnataka",
    likes: 98,
    liked_by: [],
    views: 1034,
    published_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: "gov-4",
      email: "info@bbmp.gov.in",
      full_name: "Bruhat Bengaluru Mahanagara Palike",
      role: "government",
      avatar_url:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
      bio: "Official BBMP communications",
      is_public: true,
      followers: [],
      following: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "5",
    title: "Emergency Flood Relief Measures Activated",
    content:
      "Following heavy rainfall warnings, the state government has activated emergency flood relief measures. Relief camps are being set up in vulnerable areas, and the disaster management team is on standby. Citizens are advised to stay updated and follow safety guidelines.",
    category: "emergency",
    image_url:
      "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800",
    author_id: "gov-5",
    published: true,
    priority: "high",
    location: "Kerala, India",
    likes: 445,
    liked_by: [],
    views: 2156,
    published_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: "gov-5",
      email: "emergency@kerala.gov.in",
      full_name: "Kerala State Disaster Management Authority",
      role: "government",
      avatar_url:
        "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=100",
      bio: "Emergency management and disaster response",
      is_public: true,
      followers: [],
      following: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
];
*/

const NewsFeed = () => {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async (isRefresh = false) => {
    try {
      setError(null);
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch real news from database (from government and journalist users only)
      // Temporarily show all news until journalist role is added to database
      const { data: newsData, error: newsError } = await supabase
        .from("news")
        .select(
          `
          *,
          users!author_id (
            id,
            full_name,
            avatar_url,
            role
          )
        `
        )
        .eq("published", true)
        // Temporarily comment out role filter until migration is run
        .in("users.role", ["government", "journalist"]) // Only government and journalist news
        .order("published_at", { ascending: false })
        .limit(20);

      if (newsError) {
        console.error("Error fetching news:", newsError);
        setError("Failed to load news. Please try again.");
        return;
      }

      setNews(newsData || []);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error("Error fetching news:", err);
      setError("Failed to load news. Please check your connection.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="w-full max-w-md mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 shadow-sm">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">News</h1>
          <button
            onClick={() => fetchNews(true)}
            disabled={refreshing}
            className={`p-2 rounded-full transition-colors ${
              refreshing
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
            title="Refresh news"
          >
            <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="px-4 pb-2">
          <p className="text-sm text-gray-600">
            Government updates in 60 words
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => fetchNews()}
            className="mt-2 text-red-600 text-sm underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {/* News Feed - Inshorts Style */}
      <div className="divide-y divide-gray-200">
        {news.length === 0 && !error ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No news yet
            </h3>
            <p className="text-gray-500">
              Official announcements will appear here when published
            </p>
          </div>
        ) : (
          news.map((article, index) => (
            <div key={article.id} className="bg-white">
              {/* Article Image */}
              {article.image_url && (
                <div className="aspect-video bg-gray-200">
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Article Content */}
              <div className="p-4">
                {/* Author Info */}
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-xs">
                      {article.author?.full_name?.charAt(0).toUpperCase() ||
                        "G"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {article.author?.full_name || "Government Official"}
                    </p>
                    <div className="flex items-center text-xs text-gray-500">
                      <span>
                        {formatRelativeTime(
                          article.published_at || article.created_at
                        )}
                      </span>
                      {article.location && (
                        <>
                          <span className="mx-1">•</span>
                          <span className="truncate">{article.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        article.category === "emergency"
                          ? "bg-red-100 text-red-800"
                          : article.category === "announcement"
                            ? "bg-blue-100 text-blue-800"
                            : article.category === "development"
                              ? "bg-green-100 text-green-800"
                              : article.category === "budget"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {article.category}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h2 className="font-bold text-gray-900 text-lg leading-tight mb-3">
                  {article.title}
                </h2>

                {/* Content - Limited to ~60 words like Inshorts */}
                <p className="text-gray-700 text-sm leading-relaxed mb-4">
                  {article.content.split(" ").slice(0, 60).join(" ")}
                  {article.content.split(" ").length > 60 && "..."}
                </p>

                {/* Engagement Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <Eye size={14} />
                      <span>{(article.views || 0).toLocaleString()}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>❤️</span>
                      <span>{article.likes || 0}</span>
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full font-medium ${
                      article.priority === "high"
                        ? "bg-red-100 text-red-700"
                        : article.priority === "medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {article.priority} priority
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <button
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: article.title,
                          text: article.content,
                          url: `${window.location.origin}/news/${article.id}`,
                        });
                      } else {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/news/${article.id}`
                        );
                        alert("Link copied to clipboard!");
                      }
                    }}
                  >
                    <Share size={16} />
                    <span className="text-sm font-medium">Share</span>
                  </button>

                  {article.external_url && (
                    <a
                      href={article.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <span className="text-sm font-medium">Read Full</span>
                      <ExternalLink size={14} />
                    </a>
                  )}

                  <button className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
                    Save
                  </button>
                </div>
              </div>

              {/* Swipe indicator for next story */}
              {index < news.length - 1 && (
                <div className="bg-gray-100 py-2 px-4 text-center">
                  <span className="text-xs text-gray-500">
                    ↓ Swipe for next story ↓
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bottom spacing for mobile navigation */}
      <div className="h-20 md:h-8"></div>
    </div>
  );
};

export default NewsFeed;
