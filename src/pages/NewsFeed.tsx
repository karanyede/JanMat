import { useState, useEffect } from "react";
import { News, NewsCategory } from "../types";
import { supabase } from "../lib/supabase";
import { newsAPI, ExternalNewsArticle } from "../lib/newsAPI";
import LoadingSpinner from "../components/LoadingSpinner";
import NewsDetailModal from "../components/NewsDetailModal";
import { 
  ExternalLink, 
  Eye, 
  Share, 
  RefreshCw, 
  Heart,
  MessageCircle,
  Bookmark,
  Globe,
  Flag,
  MapPin,
  Building,
  Filter,
  Grid,
  List,
  TrendingUp,
  Clock,
  User,
  Plus,
  Newspaper,
  Wifi,
  WifiOff
} from "lucide-react";
import { formatRelativeTime } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";

const NewsFeed = () => {
  const { user } = useAuth();
  const [news, setNews] = useState<News[]>([]);
  const [externalNews, setExternalNews] = useState<ExternalNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | "all" | "external">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [likedNews, setLikedNews] = useState<Set<string>>(new Set());
  const [apiConnected, setApiConnected] = useState(false);
  
  // Modal state
  const [selectedArticle, setSelectedArticle] = useState<ExternalNewsArticle | News | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExternalArticle, setIsExternalArticle] = useState(false);

  const fetchNews = async (isRefresh = false) => {
    try {
      setError(null);
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch local JanMat news from Supabase
      const { data: newsData, error: newsError } = await supabase
        .from("news")
        .select(`
          *,
          author:users(
            id,
            full_name,
            role,
            avatar_url,
            department
          )
        `)
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (newsError) {
        throw newsError;
      }

      setNews(newsData || []);

      // Fetch real-time external news
      try {
        setApiConnected(newsAPI.isConfigured());
        
        if (newsAPI.isConfigured()) {
          // Fetch different types of news
          const [
            indiaHeadlines,
            governmentNews,
            emergencyNews
          ] = await Promise.allSettled([
            newsAPI.getIndiaNews(),
            newsAPI.getGovernmentNews(),
            newsAPI.getEmergencyNews()
          ]);

          // Combine all external news
          const allExternalNews: ExternalNewsArticle[] = [];
          
          if (indiaHeadlines.status === 'fulfilled') {
            allExternalNews.push(...indiaHeadlines.value);
          }
          if (governmentNews.status === 'fulfilled') {
            allExternalNews.push(...governmentNews.value);
          }
          if (emergencyNews.status === 'fulfilled') {
            allExternalNews.push(...emergencyNews.value);
          }

          // Remove duplicates and sort by date
          const uniqueNews = allExternalNews
            .filter((article, index, self) => 
              index === self.findIndex(a => a.id === article.id || a.title === article.title)
            )
            .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
            .slice(0, 20); // Limit to 20 articles

          setExternalNews(uniqueNews);
        } else {
          // Use demo data when API is not configured
          setExternalNews(newsAPI.getDemoNews());
        }
      } catch (apiError) {
        console.warn('External news API failed, using demo data:', apiError);
        setExternalNews(newsAPI.getDemoNews());
        setApiConnected(false);
      }

      // Set liked news from user data
      if (user && newsData) {
        const userLikedNews = newsData
          .filter(n => n.liked_by?.includes(user.id))
          .map(n => n.id);
        setLikedNews(new Set(userLikedNews));
      }

    } catch (err) {
      console.error("Error fetching news:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch news");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [user]);

  const openNewsModal = (article: ExternalNewsArticle | News, isExternal: boolean = false) => {
    setSelectedArticle(article);
    setIsExternalArticle(isExternal);
    setIsModalOpen(true);
  };

  const closeNewsModal = () => {
    setSelectedArticle(null);
    setIsModalOpen(false);
    setIsExternalArticle(false);
  };

  const handleLike = async (newsId: string) => {
    if (!user) return;

    try {
      const newsItem = news.find(n => n.id === newsId);
      if (!newsItem) return;

      const isLiked = likedNews.has(newsId);
      const newLikedBy = isLiked 
        ? newsItem.liked_by.filter(id => id !== user.id)
        : [...newsItem.liked_by, user.id];

      const { error } = await supabase
        .from("news")
        .update({
          liked_by: newLikedBy,
          likes: newLikedBy.length
        })
        .eq("id", newsId);

      if (error) throw error;

      // Update local state
      setNews(prev => prev.map(n => 
        n.id === newsId 
          ? { ...n, liked_by: newLikedBy, likes: newLikedBy.length }
          : n
      ));

      // Update liked news set
      const newLikedNews = new Set(likedNews);
      if (isLiked) {
        newLikedNews.delete(newsId);
      } else {
        newLikedNews.add(newsId);
      }
      setLikedNews(newLikedNews);

    } catch (err) {
      console.error("Error updating like:", err);
    }
  };

  const getCategoryIcon = (category: NewsCategory | "all" | "external") => {
    switch (category) {
      case "all": return <Grid className="w-4 h-4" />;
      case "external": return <Wifi className="w-4 h-4" />;
      case "announcement": return <Globe className="w-4 h-4" />;
      case "policy": return <Flag className="w-4 h-4" />;
      case "development": return <Building className="w-4 h-4" />;
      case "emergency": return <TrendingUp className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: NewsCategory) => {
    switch (category) {
      case "announcement": return "bg-blue-500";
      case "policy": return "bg-green-500";
      case "development": return "bg-purple-500";
      case "emergency": return "bg-red-500";
      case "event": return "bg-yellow-500";
      case "budget": return "bg-indigo-500";
      case "services": return "bg-pink-500";
      default: return "bg-gray-500";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <span className="px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-full">High Priority</span>;
      case "medium":
        return <span className="px-2 py-1 text-xs font-semibold text-white bg-yellow-500 rounded-full">Medium</span>;
      case "low":
        return <span className="px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded-full">Low</span>;
      default:
        return null;
    }
  };

  const filteredNews = selectedCategory === "all" 
    ? news 
    : selectedCategory === "external"
      ? [] // External news will be handled separately
      : news.filter(item => item.category === selectedCategory);

  const categories: Array<{key: NewsCategory | "all" | "external", label: string, count: number}> = [
    { key: "all", label: "JanMat News", count: news.length },
    { key: "external", label: `Live News ${apiConnected ? '🟢' : '🔴'}`, count: externalNews.length },
    { key: "announcement", label: "Announcements", count: news.filter(n => n.category === "announcement").length },
    { key: "policy", label: "Policies", count: news.filter(n => n.category === "policy").length },
    { key: "development", label: "Development", count: news.filter(n => n.category === "development").length },
    { key: "emergency", label: "Emergency", count: news.filter(n => n.category === "emergency").length },
    { key: "event", label: "Events", count: news.filter(n => n.category === "event").length },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <Globe className="w-10 h-10" />
              JanMat News Hub
            </h1>
            <p className="text-xl text-blue-100 mb-6">
              Stay informed with the latest updates from your community and live news
              {apiConnected && <span className="inline-flex items-center gap-1 ml-2 text-green-200">
                <Wifi className="w-4 h-4" />
                Live
              </span>}
            </p>
            <div className="flex items-center justify-center gap-8 text-blue-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{news.length}+</div>
                <div className="text-sm">JanMat News</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{externalNews.length}+</div>
                <div className="text-sm">Live News</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">Real-time</div>
                <div className="text-sm">Updates</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter by Category
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid" 
                    ? "bg-blue-100 text-blue-600" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "list" 
                    ? "bg-blue-100 text-blue-600" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => fetchNews(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                  selectedCategory === key
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {getCategoryIcon(key)}
                <span>{label}</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  selectedCategory === key
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {selectedCategory === "external" ? (
          // External News Rendering
          externalNews.length === 0 ? (
            <div className="text-center py-12">
              {apiConnected ? (
                <>
                  <Wifi className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading live news...</h3>
                  <p className="text-gray-600">Fetching the latest news from across India</p>
                </>
              ) : (
                <>
                  <WifiOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">API Not Configured</h3>
                  <p className="text-gray-600">Add your GNews API key to get real-time news</p>
                  <p className="text-sm text-blue-600 mt-2">
                    Get free API key at{" "}
                    <a href="https://gnews.io/register" target="_blank" rel="noopener noreferrer" className="underline">
                      gnews.io
                    </a>
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className={
              viewMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-6"
            }>
              {externalNews.map((article) => (
                <article
                  key={article.id}
                  className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer ${
                    viewMode === "list" ? "flex" : ""
                  }`}
                  onClick={() => openNewsModal(article, true)}
                >
                  {/* External News Image */}
                  <div className={`relative overflow-hidden ${
                    viewMode === "list" ? "w-48 flex-shrink-0" : "h-48"
                  }`}>
                    {article.image ? (
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                        <Newspaper className="w-12 h-12 text-white opacity-50" />
                      </div>
                    )}
                    
                    {/* Live News Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white bg-red-500 animate-pulse">
                        <Wifi className="w-3 h-3" />
                        LIVE
                      </span>
                    </div>

                    {/* Source Country Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full">
                        {article.source.country.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* External News Content */}
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                    </div>

                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {article.description}
                    </p>

                    {/* External News Meta */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <Globe className="w-4 h-4" />
                        <span>{article.source.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatRelativeTime(article.publishedAt)}</span>
                      </div>
                    </div>

                    {/* External News Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openNewsModal(article, true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        Read Full
                      </button>
                      
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Original
                      </a>
                      
                      <button 
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: article.title,
                              text: article.description,
                              url: article.url,
                            });
                          } else {
                            navigator.clipboard.writeText(article.url);
                            alert("Link copied to clipboard!");
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Share className="w-4 h-4" />
                        Share
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : (
          // Internal JanMat News Rendering
          filteredNews.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No news found</h3>
              <p className="text-gray-600">
                {selectedCategory === "all" 
                  ? "No news articles are available at the moment." 
                  : `No news found for the ${selectedCategory} category.`}
              </p>
            </div>
          ) : (
            <div className={
              viewMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-6"
            }>
              {filteredNews.map((item) => (
                <article
                  key={item.id}
                  className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group ${
                    viewMode === "list" ? "flex" : ""
                  }`}
                >
                  {/* Image Section */}
                  <div className={`relative overflow-hidden ${
                    viewMode === "list" ? "w-48 flex-shrink-0" : "h-48"
                  }`}>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <Globe className="w-12 h-12 text-white opacity-50" />
                      </div>
                    )}
                    
                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white ${getCategoryColor(item.category)}`}>
                        {getCategoryIcon(item.category)}
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                      </span>
                    </div>

                    {/* Priority Badge */}
                    {item.priority === "high" && (
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full animate-pulse">
                          <TrendingUp className="w-3 h-3" />
                          Urgent
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {item.title}
                      </h3>
                      {getPriorityBadge(item.priority)}
                    </div>

                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {item.content}
                    </p>

                    {/* Meta Information */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{item.author?.full_name || "Government"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatRelativeTime(item.created_at)}</span>
                      </div>
                      {item.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{item.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{item.views || 0} views</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span>{item.likes} likes</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLike(item.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                          likedNews.has(item.id)
                            ? "bg-red-100 text-red-600 hover:bg-red-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${likedNews.has(item.id) ? "fill-current" : ""}`} />
                        {item.likes}
                      </button>
                      
                      <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        Comment
                      </button>
                      
                      <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                        <Share className="w-4 h-4" />
                        Share
                      </button>
                      
                      <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors ml-auto">
                        <Bookmark className="w-4 h-4" />
                      </button>
                    </div>

                    {/* External Link */}
                    {item.external_url && (
                      <a
                        href={item.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Read full article
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )
        )}

        {/* Load More Button */}
        {(selectedCategory === "external" ? externalNews.length > 0 : filteredNews.length > 0) && (
          <div className="text-center mt-12">
            <button className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              <Plus className="w-5 h-5" />
              Load More Articles
            </button>
          </div>
        )}
      </div>

      {/* Bottom CTA Section */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Connected with JanMat</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of citizens making a difference in their communities
          </p>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <span className="block font-semibold">Track Progress</span>
            </div>
            <div className="text-center">
              <Globe className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <span className="block font-semibold">Stay Informed</span>
            </div>
            <div className="text-center">
              <Heart className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <span className="block font-semibold">Make Impact</span>
            </div>
          </div>
        </div>
      </div>

      {/* News Detail Modal */}
      {isModalOpen && selectedArticle && (
        <NewsDetailModal
          article={selectedArticle}
          isOpen={isModalOpen}
          isExternal={isExternalArticle}
          onClose={closeNewsModal}
        />
      )}
    </div>
  );
};

export default NewsFeed;
