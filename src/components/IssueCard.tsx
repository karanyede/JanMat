import { Link } from "react-router-dom";
import { Heart, MessageCircle, Share, MapPin } from "lucide-react";
import { Issue } from "../types";
import { useAuth } from "../hooks/useAuth";
import { formatRelativeTime } from "../lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface IssueCardProps {
  issue: Issue;
  onUpvote: () => void;
  onDownvote: () => void;
}

const IssueCard = ({ issue, onUpvote }: IssueCardProps) => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch user role when component mounts
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          // First try to get role from user_metadata (for auth users)
          if (user.user_metadata?.role) {
            setUserRole(user.user_metadata.role);
          } else {
            // Fallback to database query
            const { data: userData, error } = await supabase
              .from("users")
              .select("role")
              .eq("id", user.id)
              .single();
            
            if (!error && userData) {
              setUserRole(userData.role);
            }
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      }
    };

    fetchUserRole();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-100 text-blue-800";
      case "under_review":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-orange-100 text-orange-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-gray-100 text-gray-600";
      case "medium":
        return "bg-blue-100 text-blue-600";
      case "high":
        return "bg-orange-100 text-orange-600";
      case "urgent":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <article className="bg-white border border-gray-200 rounded-lg mb-6 overflow-hidden shadow-sm hover:shadow-md transition-shadow max-w-2xl mx-auto">
      {/* Header - Instagram style */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white">
              {issue.reporter?.avatar_url ? (
                <img
                  src={issue.reporter.avatar_url}
                  alt={issue.reporter.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-pink-500 to-orange-500 flex items-center justify-center">
                  <span className="text-white font-medium text-xs">
                    {issue.reporter?.full_name?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-1">
              <h3 className="font-medium text-gray-900 text-sm">
                {issue.reporter?.full_name || "Anonymous"}
              </h3>
              <span className="text-gray-500">•</span>
              <span className="text-xs text-gray-500">
                {formatRelativeTime(issue.created_at)}
              </span>
            </div>
            <div className="flex items-center text-xs text-gray-500 mt-0.5">
              <MapPin size={10} className="mr-1" />
              <span>{issue.location}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}
          >
            {issue.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Images - Clickable to view issue details */}
      {issue.image_urls && issue.image_urls.length > 0 && (
        <div className="relative">
          <Link to={`/issues/${issue.id}`} className="block">
            <div className="w-full max-h-96 bg-gray-100 cursor-pointer hover:opacity-95 transition-opacity">
              <img
                src={issue.image_urls[0]}
                alt="Issue"
                className="w-full h-full object-contain max-h-96"
              />
              {issue.image_urls.length > 1 && (
                <div className="absolute top-3 right-3 bg-black bg-opacity-70 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
                  1/{issue.image_urls.length} 📷
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                Click to view details
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Content */}
      <div className="px-3 py-2">
        <div className="text-sm mb-3">
          <Link to={`/issues/${issue.id}`} className="hover:opacity-60">
            <span className="font-medium mr-1">
              {issue.reporter?.full_name || "Anonymous"}
            </span>
            <span className="text-gray-900">{issue.title}</span>
          </Link>
          {issue.description && (
            <p className="text-gray-700 mt-1 leading-relaxed">
              {issue.description.length > 100
                ? `${issue.description.substring(0, 100)}...`
                : issue.description}
            </p>
          )}
        </div>

        {/* Actions - Below content */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-4">
            <button
              onClick={onUpvote}
              className={`hover:text-gray-600 transition-colors flex items-center space-x-1 ${
                user && issue.upvoted_by?.includes(user.id)
                  ? "text-red-500"
                  : "text-gray-700"
              }`}
            >
              <Heart
                size={24}
                strokeWidth={1.5}
                fill={
                  user && issue.upvoted_by?.includes(user.id)
                    ? "currentColor"
                    : "none"
                }
              />
              <span className="text-sm">{issue.upvotes}</span>
            </button>
            <Link
              to={`/issues/${issue.id}`}
              className="hover:text-gray-600 transition-colors"
            >
              <MessageCircle size={24} strokeWidth={1.5} />
            </Link>
            <button
              className="hover:text-gray-600 transition-colors"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: issue.title,
                    text: issue.description,
                    url: `${window.location.origin}/issues/${issue.id}`,
                  });
                } else {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/issues/${issue.id}`
                  );
                  alert("Link copied to clipboard!");
                }
              }}
            >
              <Share size={24} strokeWidth={1.5} />
            </button>
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(issue.priority)}`}
          >
            {issue.priority}
          </span>
        </div>

        {/* Debug Info - Only in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
            <div><strong>Debug - GPS Status:</strong></div>
            <div>issue.latitude: {issue.latitude} (type: {typeof issue.latitude})</div>
            <div>issue.longitude: {issue.longitude} (type: {typeof issue.longitude})</div>
            <div>userRole: {userRole}</div>
            <div>user exists: {user ? 'YES' : 'NO'}</div>
            <div>Should show button: {(user && userRole === "government" && issue.latitude && issue.longitude) ? 'YES' : 'NO'}</div>
          </div>
        )}

        {/* View Location/Details Button - Available for Everyone on All Posts */}
        <div className="mt-3 mb-2">
          <Link
            to={issue.latitude && issue.longitude 
              ? `/issues/${issue.id}?showMap=true`
              : `/issues/${issue.id}`
            }
            className="flex items-center justify-center space-x-2 w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <MapPin size={18} strokeWidth={1.5} />
            <span>
              {issue.latitude && issue.longitude 
                ? "View Location" 
                : "View Details"
              }
            </span>
          </Link>
        </div>

        {/* View comments link */}
        <Link
          to={`/issues/${issue.id}`}
          className="text-gray-500 text-sm mt-2 block hover:text-gray-700"
        >
          View all comments
        </Link>
      </div>
    </article>
  );
};

export default IssueCard;
