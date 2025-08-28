import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router-dom";
import {
  Search,
  X,
  MapPin,
  Clock,
  TrendingUp,
  Newspaper,
  BarChart3,
  User,
  SlidersHorizontal,
} from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: "issue" | "news" | "poll" | "user";
  location?: string;
  created_at: string;
  status?: string;
  category?: string;
  reporter_name?: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface AdvancedSearchSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdvancedSearchSystem = ({
  isOpen,
  onClose,
}: AdvancedSearchSystemProps) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: "all" as "all" | "issue" | "news" | "poll" | "user",
    category: "all",
    status: "all",
    dateRange: "all" as "all" | "today" | "week" | "month",
    location: "",
  });
  // Removed unused suggestions state
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    // Load recent searches from localStorage
    const savedSearches = localStorage.getItem("janmat-recent-searches");
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
  }, []);

  useEffect(() => {
    if (query.length > 2) {
      const delayedSearch = setTimeout(() => {
        performSearch();
      }, 300);
      return () => clearTimeout(delayedSearch);
    } else {
      setResults([]);
    }
  }, [query, filters]);

  const performSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Build date filter
      let dateFilter = "";
      const now = new Date();
      if (filters.dateRange === "today") {
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        dateFilter = today.toISOString();
      } else if (filters.dateRange === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = weekAgo.toISOString();
      } else if (filters.dateRange === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = monthAgo.toISOString();
      }

      // Search Issues
      if (filters.type === "all" || filters.type === "issue") {
        let issueQuery = supabase
          .from("issues")
          .select(
            `
            id,
            title,
            description,
            location,
            created_at,
            status,
            category,
            users!reporter_id(user_metadata)
          `
          )
          .or(
            `title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`
          )
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(10);

        if (filters.category !== "all") {
          issueQuery = issueQuery.eq("category", filters.category);
        }
        if (filters.status !== "all") {
          issueQuery = issueQuery.eq("status", filters.status);
        }
        if (dateFilter) {
          issueQuery = issueQuery.gte("created_at", dateFilter);
        }
        if (filters.location) {
          issueQuery = issueQuery.ilike("location", `%${filters.location}%`);
        }

        const { data: issues } = await issueQuery;
        if (issues) {
          searchResults.push(
            ...issues.map((issue) => ({
              id: issue.id,
              title: issue.title,
              description: issue.description,
              type: "issue" as const,
              location: issue.location,
              created_at: issue.created_at,
              status: issue.status,
              category: issue.category,
              reporter_name:
                (issue.users as any)?.user_metadata?.full_name || "Anonymous",
            }))
          );
        }
      }

      // Search News
      if (filters.type === "all" || filters.type === "news") {
        let newsQuery = supabase
          .from("news")
          .select("id, title, content, created_at")
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .order("created_at", { ascending: false })
          .limit(5);

        if (dateFilter) {
          newsQuery = newsQuery.gte("created_at", dateFilter);
        }

        const { data: news } = await newsQuery;
        if (news) {
          searchResults.push(
            ...news.map((item) => ({
              id: item.id,
              title: item.title,
              description: item.content?.substring(0, 100) + "...",
              type: "news" as const,
              created_at: item.created_at,
            }))
          );
        }
      }

      // Search Polls
      if (filters.type === "all" || filters.type === "poll") {
        let pollQuery = supabase
          .from("polls")
          .select("id, question, description, created_at")
          .or(`question.ilike.%${query}%,description.ilike.%${query}%`)
          .order("created_at", { ascending: false })
          .limit(5);

        if (dateFilter) {
          pollQuery = pollQuery.gte("created_at", dateFilter);
        }

        const { data: polls } = await pollQuery;
        if (polls) {
          searchResults.push(
            ...polls.map((poll) => ({
              id: poll.id,
              title: poll.question,
              description: poll.description,
              type: "poll" as const,
              created_at: poll.created_at,
            }))
          );
        }
      }

      // Search Users (if government user)
      if (
        (filters.type === "all" || filters.type === "user") &&
        user?.user_metadata?.role === "government"
      ) {
        const { data: users } = await supabase
          .from("users")
          .select("id, email, user_metadata")
          .ilike("user_metadata->>full_name", `%${query}%`)
          .limit(5);

        if (users) {
          searchResults.push(
            ...users.map((userItem) => ({
              id: userItem.id,
              title: userItem.user_metadata?.full_name || userItem.email,
              description: userItem.email,
              type: "user" as const,
              created_at: new Date().toISOString(),
            }))
          );
        }
      }

      // Sort results by relevance and date
      const sortedResults = searchResults.sort((a, b) => {
        // Prioritize exact matches in title
        const aExactMatch = a.title.toLowerCase().includes(query.toLowerCase());
        const bExactMatch = b.title.toLowerCase().includes(query.toLowerCase());

        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;

        // Then sort by date
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      setResults(sortedResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSearch = (searchQuery: string) => {
    const updated = [
      searchQuery,
      ...recentSearches.filter((s) => s !== searchQuery),
    ].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("janmat-recent-searches", JSON.stringify(updated));
  };

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    saveSearch(searchQuery);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "issue":
        return <MapPin className="w-4 h-4 text-blue-500" />;
      case "news":
        return <Newspaper className="w-4 h-4 text-green-500" />;
      case "poll":
        return <BarChart3 className="w-4 h-4 text-purple-500" />;
      case "user":
        return <User className="w-4 h-4 text-gray-500" />;
      default:
        return <Search className="w-4 h-4 text-gray-500" />;
    }
  };

  const getResultLink = (result: SearchResult) => {
    switch (result.type) {
      case "issue":
        return `/issues/${result.id}`;
      case "news":
        return `/news`;
      case "poll":
        return `/polls`;
      case "user":
        return `/profile/${result.id}`;
      default:
        return "#";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-25"
        onClick={onClose}
      />

      {/* Search Panel */}
      <div className="absolute inset-x-0 top-0 bg-white shadow-xl max-h-full overflow-hidden">
        {/* Search Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) {
                    handleSearch(query);
                  }
                }}
                placeholder="Search issues, news, polls..."
                className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              {query && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-lg border transition-colors ${
                showFilters
                  ? "bg-blue-50 border-blue-200 text-blue-600"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-3 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        type: e.target.value as any,
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="issue">Issues</option>
                    <option value="news">News</option>
                    <option value="poll">Polls</option>
                    {user?.user_metadata?.role === "government" && (
                      <option value="user">Users</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateRange: e.target.value as any,
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Past Week</option>
                    <option value="month">Past Month</option>
                  </select>
                </div>

                {filters.type === "issue" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={filters.category}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="all">All Categories</option>
                        <option value="infrastructure">Infrastructure</option>
                        <option value="sanitation">Sanitation</option>
                        <option value="transportation">Transportation</option>
                        <option value="safety">Safety</option>
                        <option value="environment">Environment</option>
                        <option value="utilities">Utilities</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="education">Education</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={filters.status}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            status: e.target.value,
                          }))
                        }
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="all">All Status</option>
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Search Content */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : query.length === 0 ? (
            <div className="p-6">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Recent Searches
                  </h3>
                  <div className="space-y-2">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearch(search)}
                        className="flex items-center space-x-3 w-full text-left p-2 rounded-lg hover:bg-gray-50"
                      >
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{search}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Trending
                </h3>
                <div className="space-y-2">
                  {[
                    "Road maintenance",
                    "Water supply",
                    "Street lights",
                    "Garbage collection",
                  ].map((trend, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(trend)}
                      className="flex items-center space-x-3 w-full text-left p-2 rounded-lg hover:bg-gray-50"
                    >
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      <span className="text-gray-700">{trend}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No results found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search terms or filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  to={getResultLink(result)}
                  onClick={onClose}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {result.title}
                          </h4>
                          {result.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {result.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span className="capitalize">{result.type}</span>
                            {result.location && (
                              <span className="flex items-center space-x-1">
                                <MapPin className="w-3 h-3" />
                                <span>{result.location}</span>
                              </span>
                            )}
                            <span>{formatDate(result.created_at)}</span>
                            {result.status && (
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  result.status === "resolved"
                                    ? "bg-green-100 text-green-600"
                                    : result.status === "in_progress"
                                      ? "bg-blue-100 text-blue-600"
                                      : result.status === "rejected"
                                        ? "bg-red-100 text-red-600"
                                        : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {result.status.replace("_", " ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchSystem;
