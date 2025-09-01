import { useState, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  Share,
  MapPin,
  Calendar,
  Send,
  MoreVertical,
  Flag,
  ArrowLeft,
  Navigation,
} from "lucide-react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Issue, Comment } from "../types";
import LoadingSpinner from "../components/LoadingSpinner";
import LocationMap from "../components/LocationMap";
import { formatRelativeTime } from "../lib/utils";

const IssueDetails = () => {
  const { id: issueId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMapExpanded, setShowMapExpanded] = useState(false);

  const fetchIssueDetails = async () => {
    if (!issueId) return;

    try {
      setError(null);

      // Fetch issue details
      const { data: issueData, error: issueError } = await supabase
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
        .eq("id", issueId)
        .single();

      if (issueError) {
        console.error("Error fetching issue:", issueError);
        setError("Issue not found");
        return;
      }

      setIssue(issueData);

      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
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
        .eq("issue_id", issueId)
        .order("created_at", { ascending: true });

      if (commentsError) {
        console.error("Error fetching comments:", commentsError);
      } else {
        setComments(commentsData || []);
      }
    } catch (err) {
      console.error("Error fetching issue details:", err);
      setError("Failed to load issue details");
    } finally {
      setLoading(false);
    }
  };

  // Fetch user profile data including avatar
  const fetchUserProfile = async () => {
    if (user) {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setUserProfile(data);
      }
    }
  };

  const handleUpvote = async () => {
    if (!user || !issue) return;

    // Prevent upvoting on resolved issues
    if (issue.status === "resolved") {
      alert("Cannot upvote a resolved issue");
      return;
    }

    try {
      const hasUpvoted = issue.upvoted_by?.includes(user.id) || false;
      const newUpvotedBy = hasUpvoted
        ? (issue.upvoted_by || []).filter((id) => id !== user.id)
        : [...(issue.upvoted_by || []), user.id];

      console.log("Updating upvote for issue:", issue.id, { hasUpvoted, newUpvotedBy });

      const { error } = await supabase
        .from("issues")
        .update({
          upvotes: newUpvotedBy.length,
          upvoted_by: newUpvotedBy,
          updated_at: new Date().toISOString(),
        })
        .eq("id", issue.id);

      if (error) {
        console.error("Error updating upvote:", error);
        return;
      }

      // Update local state immediately
      setIssue({
        ...issue,
        upvotes: newUpvotedBy.length,
        upvoted_by: newUpvotedBy,
      });

      console.log("Upvote updated successfully");
    } catch (error) {
      console.error("Error upvoting:", error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !issue || !newComment.trim()) return;

    // Prevent commenting on resolved issues (except for government users)
    if (
      issue.status === "resolved" &&
      user.user_metadata?.role !== "government"
    ) {
      alert(
        "Cannot comment on a resolved issue. Only government officials can add closure notes."
      );
      return;
    }

    setSubmittingComment(true);

    try {
      const { data: comment, error } = await supabase
        .from("comments")
        .insert({
          issue_id: issue.id,
          content: newComment.trim(),
          author_id: user.id,
          author_name: user.user_metadata?.full_name || user.email,
          author_role: user.user_metadata?.role || "citizen",
          is_official_response: user.role === "government",
        })
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
        .single();

      if (error) {
        console.error("Error submitting comment:", error);
        alert("Failed to submit comment. Please try again.");
        return;
      }

      setComments((prev) => [...prev, comment]);
      setNewComment("");
    } catch (err) {
      console.error("Error submitting comment:", err);
      alert("Failed to submit comment. Please try again.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCloseIssue = async () => {
    if (!user || !issue || user.user_metadata?.role !== "government") return;

    try {
      const newStatus =
        issue.status === "resolved" ? "under_review" : "resolved";
      const action = newStatus === "resolved" ? "closing" : "reopening";

      const { error } = await supabase
        .from("issues")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", issue.id);

      if (error) {
        console.error(`Error ${action} issue:`, error);
        alert(`Failed to ${action} issue. Please try again.`);
        return;
      }

      // Add a system comment about the status change
      await supabase.from("comments").insert({
        issue_id: issue.id,
        content: `Issue ${newStatus === "resolved" ? "closed" : "reopened"} by government official.`,
        author_id: user.id,
        author_name: user.user_metadata?.full_name || user.email,
        author_role: "government",
        is_official_response: true,
        is_system_comment: true,
      });

      setIssue((prev) => (prev ? { ...prev, status: newStatus } : null));

      // Refresh comments to show the system comment
      await fetchIssueDetails();
    } catch (err) {
      console.error("Error updating issue status:", err);
      alert("Failed to update issue status. Please try again.");
    }
  };

  useEffect(() => {
    fetchIssueDetails();
    fetchUserProfile();
  }, [issueId, user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDropdown]);

  // Check URL parameter for showMap and automatically show the map
  useEffect(() => {
    const showMapParam = searchParams.get('showMap');
    if (showMapParam === 'true') {
      setShowMapExpanded(true);
      // Scroll to the map section after a short delay to ensure it's rendered
      setTimeout(() => {
        const mapElement = document.getElementById('issue-location-map');
        if (mapElement) {
          mapElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    }
  }, [searchParams]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !issue) {
    return (
      <div className="w-full">
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Issue not found
          </h3>
          <p className="text-gray-500 mb-4">
            The issue you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

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
    <div className="w-full">
      {/* Header */}
      <div className="sticky top-16 md:top-0 bg-white border-b border-gray-200 z-10">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 flex-1 truncate">
            {issue.title}
          </h1>
          {/* More Options Dropdown */}
          <div className="relative dropdown-container">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <MoreVertical size={20} />
            </button>
            
            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                <div className="py-1">
                  <button
                    onClick={() => setShowDropdown(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Flag size={16} className="mr-2" />
                    Report Issue
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Issue Content */}
        <div className="bg-white border-b border-gray-200 md:border md:rounded-lg md:mt-6 overflow-hidden">
          {/* Issue Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-3 mb-3">
              <Link to={`/profile/${issue.reporter_id}`}>
                {issue.reporter?.avatar_url ? (
                  <img
                    src={issue.reporter.avatar_url}
                    alt={issue.reporter.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {issue.reporter?.full_name?.charAt(0).toUpperCase() ||
                        "U"}
                    </span>
                  </div>
                )}
              </Link>
              <div className="flex-1">
                <Link
                  to={`/profile/${issue.reporter_id}`}
                  className="hover:underline"
                >
                  <h3 className="font-medium text-gray-900">
                    {issue.reporter?.full_name || "Anonymous"}
                  </h3>
                </Link>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Calendar size={12} />
                  <span>{formatRelativeTime(issue.created_at)}</span>
                  <span>•</span>
                  <MapPin size={12} />
                  <div className="flex flex-col">
                    <span>{issue.location}</span>
                    {userProfile?.role === "government" && issue.latitude && issue.longitude && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1">
                        📍 GPS: {parseFloat(issue.latitude.toString()).toFixed(4)}, {parseFloat(issue.longitude.toString()).toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}
                >
                  {issue.status.replace("_", " ")}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(issue.priority)}`}
                >
                  {issue.priority}
                </span>
              </div>
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {issue.title}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              {issue.description}
            </p>

            <div className="flex items-center text-sm text-gray-500 space-x-4">
              <span className="bg-gray-100 px-2 py-1 rounded-full">
                {issue.category}
              </span>
            </div>
          </div>

          {/* Images */}
          {issue.image_urls && issue.image_urls.length > 0 && (
            <div className="relative">
              <div className="aspect-square bg-gray-100">
                <img
                  src={issue.image_urls[currentImageIndex]}
                  alt="Issue"
                  className="w-full h-full object-cover"
                />
                {issue.image_urls.length > 1 && (
                  <div className="absolute top-3 right-3 bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded-full">
                    {currentImageIndex + 1}/{issue.image_urls.length}
                  </div>
                )}
              </div>

              {issue.image_urls.length > 1 && (
                <div className="flex justify-center space-x-2 p-3">
                  {issue.image_urls.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full ${
                        index === currentImageIndex
                          ? "bg-blue-600"
                          : "bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleUpvote}
                  className={`flex items-center space-x-1 transition-colors ${
                    user && issue.upvoted_by.includes(user.id)
                      ? "text-red-600"
                      : "text-gray-600 hover:text-red-600"
                  }`}
                >
                  <Heart
                    size={24}
                    fill={
                      user && issue.upvoted_by.includes(user.id)
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>
                <button className="text-gray-600 hover:text-gray-800">
                  <MessageCircle size={24} />
                </button>
                <button className="text-gray-600 hover:text-gray-800">
                  <Share size={24} />
                </button>
                {/* Quick Location Button for Government Users */}
                {userProfile?.role === "government" && issue.latitude && issue.longitude && (
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps?q=${issue.latitude},${issue.longitude}`, '_blank')}
                    className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded-full transition-colors"
                    title="View location on Google Maps"
                  >
                    <Navigation size={20} />
                  </button>
                )}
              </div>
              <button className="text-gray-600 hover:text-gray-800">
                <Flag size={20} />
              </button>
            </div>

            <div className="text-sm">
              <span className="font-medium">
                {issue.upvotes} {issue.upvotes === 1 ? "upvote" : "upvotes"}
              </span>
            </div>

            {/* Government Close/Reopen Button */}
            {user && user.user_metadata?.role === "government" && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={handleCloseIssue}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    issue.status === "resolved"
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                  }`}
                >
                  {issue.status === "resolved" ? "Reopen Issue" : "Close Issue"}
                </button>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {issue.status === "resolved"
                    ? "Reopening will allow new comments and upvotes"
                    : "Closing will restrict new comments and upvotes to government users only"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Location Map - Only visible to Government Officials */}
        {userProfile?.role === "government" && issue.latitude && issue.longitude && (
          <div 
            id="issue-location-map"
            className={`bg-white md:border md:rounded-lg md:mt-6 overflow-hidden ${showMapExpanded ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
          >
            {showMapExpanded && (
              <div className="bg-blue-600 text-white p-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Problem Location - Ready to Solve
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  Use the map below to navigate to the issue location and resolve the problem.
                </p>
              </div>
            )}
            <LocationMap
              latitude={parseFloat(issue.latitude.toString())}
              longitude={parseFloat(issue.longitude.toString())}
              location={issue.location}
              title={showMapExpanded ? `${issue.title} - Action Required` : issue.title}
              showDirections={true}
            />
          </div>
        )}

        {/* Comments Section */}
        <div className="bg-white md:border md:rounded-lg md:mt-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">
              Comments ({comments.length})
            </h3>
          </div>

          {/* Comments List */}
          <div className="max-h-96 overflow-y-auto">
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No comments yet</p>
                <p className="text-sm text-gray-400">Be the first to comment</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-4">
                    <div className="flex space-x-3">
                      <Link to={`/profile/${comment.author_id}`}>
                        {comment.users?.avatar_url ? (
                          <img
                            src={comment.users.avatar_url}
                            alt={comment.users.full_name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-medium text-xs">
                              {comment.users?.full_name
                                ?.charAt(0)
                                .toUpperCase() || "U"}
                            </span>
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Link
                            to={`/profile/${comment.author_id}`}
                            className="font-medium text-sm text-gray-900 hover:underline"
                          >
                            {comment.users?.full_name || comment.author_name}
                          </Link>
                          {comment.is_official_response && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-medium">
                              Official
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comment Form */}
          {user && (
            <div className="border-t border-gray-200">
              {issue.status === "resolved" &&
              user.user_metadata?.role !== "government" ? (
                <div className="p-4 bg-gray-50">
                  <p className="text-sm text-gray-600 text-center">
                    This issue has been closed. Only government officials can
                    add comments.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitComment} className="p-4">
                  <div className="flex space-x-3">
                    {userProfile?.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt={userProfile.full_name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-xs">
                          {userProfile?.full_name?.charAt(0).toUpperCase() ||
                            user.user_metadata?.full_name
                              ?.charAt(0)
                              .toUpperCase() ||
                            user.email?.charAt(0).toUpperCase() ||
                            "U"}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder={
                            issue.status === "resolved"
                              ? "Add closure notes..."
                              : "Add a comment..."
                          }
                          className="flex-1 px-0 py-2 border-0 border-b border-gray-200 focus:outline-none focus:border-gray-400 text-sm"
                        />
                        <button
                          type="submit"
                          disabled={!newComment.trim() || submittingComment}
                          className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          {submittingComment ? (
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueDetails;
