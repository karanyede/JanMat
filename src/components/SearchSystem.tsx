import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Issue, News, User } from "../types";
import { Search, X, MapPin, Calendar } from "lucide-react";
import { formatRelativeTime } from "../lib/utils";

interface SearchResult {
  type: "issue" | "news" | "user";
  id: string;
  title: string;
  description?: string;
  author?: string;
  timestamp?: string;
  location?: string;
  data: Issue | News | User;
}

interface SearchSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchSystem = ({ isOpen, onClose }: SearchSystemProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem("janmat_recent_searches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const updated = [
      searchQuery,
      ...recentSearches.filter((s) => s !== searchQuery),
    ].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("janmat_recent_searches", JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("janmat_recent_searches");
  };

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search issues
      const { data: issues } = await supabase
        .from("issues")
        .select(
          `
          *,
          reporter:users!reporter_id (
            id,
            full_name,
            avatar_url,
            role
          )
        `
        )
        .eq("is_public", true)
        .or(
          `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`
        )
        .limit(5);

      if (issues) {
        issues.forEach((issue: any) => {
          searchResults.push({
            type: "issue",
            id: issue.id,
            title: issue.title,
            description: issue.description,
            author: issue.reporter?.full_name,
            timestamp: issue.created_at,
            location: issue.location,
            data: issue,
          });
        });
      }

      // Search news
      const { data: news } = await supabase
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
        .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
        .limit(5);

      if (news) {
        news.forEach((article: any) => {
          searchResults.push({
            type: "news",
            id: article.id,
            title: article.title,
            description: article.content.substring(0, 100) + "...",
            author: article.author?.full_name,
            timestamp: article.published_at || article.created_at,
            data: article,
          });
        });
      }

      // Search users
      const { data: users } = await supabase
        .from("users")
        .select("*")
        .eq("is_public", true)
        .ilike("full_name", `%${searchQuery}%`)
        .limit(3);

      if (users) {
        users.forEach((user: any) => {
          searchResults.push({
            type: "user",
            id: user.id,
            title: user.full_name,
            description: user.bio || `${user.role} • Community member`,
            timestamp: user.created_at,
            data: user,
          });
        });
      }

      setResults(searchResults);
      saveRecentSearch(searchQuery);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const getResultIcon = (type: string) => {
    switch (type) {
      case "issue":
        return "🚨";
      case "news":
        return "📰";
      case "user":
        return "👤";
      default:
        return "🔍";
    }
  };

  const handleResultClick = () => {
    saveRecentSearch(query);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 lg:bg-transparent lg:inset-auto lg:top-16 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:w-96">
      <div className="bg-white h-full lg:h-auto lg:rounded-lg lg:shadow-xl lg:border border-gray-200 lg:max-h-96 flex flex-col">
        {/* Search Header */}
        <div className="flex items-center p-4 border-b border-gray-200">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search issues, news, people..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : query.trim() === "" ? (
            /* Recent Searches */
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Recent Searches
                </h3>
                {recentSearches.length > 0 && (
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {recentSearches.length === 0 ? (
                <p className="text-sm text-gray-500">No recent searches</p>
              ) : (
                <div className="space-y-2">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(search)}
                      className="flex items-center w-full p-2 text-left hover:bg-gray-50 rounded-lg"
                    >
                      <Search className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-700">{search}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Quick Suggestions */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Suggestions
                </h3>
                <div className="space-y-2">
                  {[
                    "Infrastructure issues",
                    "Recent announcements",
                    "Active polls",
                    "Government officials",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setQuery(suggestion)}
                      className="flex items-center w-full p-2 text-left hover:bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm text-gray-600">
                        {suggestion}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No results found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try searching with different keywords
              </p>
            </div>
          ) : (
            /* Search Results */
            <div className="divide-y divide-gray-100">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  to={
                    result.type === "issue"
                      ? `/issues/${result.id}`
                      : result.type === "news"
                        ? `/news/${result.id}`
                        : `/profile/${result.id}`
                  }
                  onClick={handleResultClick}
                  className="block p-4 hover:bg-gray-50"
                >
                  <div className="flex space-x-3">
                    <div className="text-2xl">{getResultIcon(result.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {result.title}
                        </h4>
                        <span className="text-xs text-gray-500 capitalize ml-2">
                          {result.type}
                        </span>
                      </div>
                      {result.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                          {result.description}
                        </p>
                      )}
                      <div className="flex items-center text-xs text-gray-500 space-x-3">
                        {result.author && <span>by {result.author}</span>}
                        {result.timestamp && (
                          <>
                            <Calendar className="w-3 h-3" />
                            <span>{formatRelativeTime(result.timestamp)}</span>
                          </>
                        )}
                        {result.location && (
                          <>
                            <MapPin className="w-3 h-3" />
                            <span>{result.location}</span>
                          </>
                        )}
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

export default SearchSystem;
