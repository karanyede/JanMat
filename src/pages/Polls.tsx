import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Poll, Post } from "../types";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  Calendar,
  Users,
  BarChart3,
  RefreshCw,
  Eye,
  Heart,
} from "lucide-react";
import { formatRelativeTime } from "../lib/utils";

const Polls = () => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [governmentPosts, setGovernmentPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPolls = async (isRefresh = false) => {
    try {
      setError(null);
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch polls
      const { data: pollsData, error: pollsError } = await supabase
        .from("polls")
        .select(
          `
          *,
          creator:users!creator_id (
            id,
            full_name,
            avatar_url,
            role
          )
        `
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (pollsError) {
        console.error("Error fetching polls:", pollsError);
        setError("Failed to load polls. Please try again.");
        return;
      }

      // Fetch government posts/announcements
      // Temporarily fall back to news if posts table doesn't exist
      let govPostsData = [];
      let govPostsError = null;

      try {
        const { data, error } = await supabase
          .from("posts")
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
          .eq("users.role", "government") // Only government posts
          .order("published_at", { ascending: false })
          .limit(10);

        govPostsData = data || [];
        govPostsError = error;
      } catch (err) {
        console.log("Posts table not found, using news fallback");
        // Fallback to news table for now
        const { data, error } = await supabase
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
          .eq("users.role", "government")
          .order("published_at", { ascending: false })
          .limit(10);

        govPostsData = data || [];
        govPostsError = error;
      }

      if (govPostsError) {
        console.error("Error fetching government posts:", govPostsError);
        setError("Failed to load government announcements. Please try again.");
        return;
      }

      setPolls(pollsData || []);
      setGovernmentPosts(govPostsData || []);
    } catch (err) {
      console.error("Error fetching content:", err);
      setError("Failed to load content. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!user) return;

    try {
      // Get the current poll
      const poll = polls.find((p) => p.id === pollId);
      if (!poll) return;

      // Check if user already voted
      if (poll.voted_by.includes(user.id)) {
        alert("You have already voted on this poll!");
        return;
      }

      // Update the poll with the vote
      const updatedOptions = [...poll.options];
      updatedOptions[optionIndex].votes += 1;

      const { error } = await supabase
        .from("polls")
        .update({
          options: updatedOptions,
          voted_by: [...poll.voted_by, user.id],
        })
        .eq("id", pollId);

      if (error) {
        console.error("Error voting:", error);
        alert("Failed to submit vote. Please try again.");
        return;
      }

      // Update local state
      setPolls((prev) =>
        prev.map((p) =>
          p.id === pollId
            ? {
                ...p,
                options: updatedOptions,
                voted_by: [...p.voted_by, user.id],
              }
            : p
        )
      );
    } catch (err) {
      console.error("Error voting:", err);
      alert("Failed to submit vote. Please try again.");
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    try {
      // Get the current post item
      const post = governmentPosts.find((n) => n.id === postId);
      if (!post) return;

      // Check if user already liked
      const hasLiked = post.liked_by.includes(user.id);
      const updatedLikedBy = hasLiked
        ? post.liked_by.filter((id) => id !== user.id)
        : [...post.liked_by, user.id];

      const updatedLikes = hasLiked ? post.likes - 1 : post.likes + 1;

      const { error } = await supabase
        .from("posts")
        .update({
          likes: updatedLikes,
          liked_by: updatedLikedBy,
        })
        .eq("id", postId);

      if (error) {
        console.error("Error updating like:", error);
        return;
      }

      // Update local state
      setGovernmentPosts((prev) =>
        prev.map((n) =>
          n.id === postId
            ? {
                ...n,
                likes: updatedLikes,
                liked_by: updatedLikedBy,
              }
            : n
        )
      );
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  const calculatePercentage = (votes: number, totalVotes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  // Combine and sort polls and government posts by date
  const combinedContent = [
    ...polls.map((poll) => ({
      ...poll,
      type: "poll",
      date: new Date(poll.created_at),
    })),
    ...governmentPosts.map((post) => ({
      ...post,
      type: "post",
      date: new Date(post.published_at || post.created_at),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="w-full">
      {/* Header */}
      <div className="sticky top-16 md:top-0 bg-white border-b border-gray-200 z-10 md:hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Polls & Announcements
            </h1>
            <p className="text-sm text-gray-600">
              Vote on polls and see government updates
            </p>
          </div>
          <button
            onClick={() => fetchPolls(true)}
            disabled={refreshing}
            className={`p-2 rounded-full transition-colors ${
              refreshing
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
            title="Refresh content"
          >
            <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Polls & Government Announcements
        </h1>
        <p className="text-gray-600">
          Participate in community decision-making and stay updated
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => fetchPolls()}
            className="mt-2 text-red-600 text-sm underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {/* Content List */}
      <div className="space-y-0 md:space-y-6">
        {combinedContent.length === 0 && !error ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No content available
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Check back later for polls and government announcements
            </p>
          </div>
        ) : (
          combinedContent.map((item) => {
            if (item.type === "poll") {
              const poll = item as Poll & { type: string; date: Date };
              const totalVotes = poll.options.reduce(
                (sum, option) => sum + option.votes,
                0
              );
              const hasVoted = user && poll.voted_by.includes(user.id);
              const isExpired = new Date(poll.end_date) < new Date();

              return (
                <div
                  key={`poll-${poll.id}`}
                  className="bg-white border-b border-gray-200 md:border md:rounded-lg overflow-hidden"
                >
                  {/* Poll Header */}
                  <div className="flex items-center space-x-3 p-4 border-b border-gray-100">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {poll.creator?.full_name?.charAt(0).toUpperCase() ||
                          "G"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">
                          {poll.creator?.full_name || "Government Official"}
                        </h3>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                          Poll
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-0.5">
                        <Calendar size={12} className="mr-1" />
                        <span>Ends {formatRelativeTime(poll.end_date)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-sm text-gray-500">
                        <Users size={14} className="mr-1" />
                        <span>{totalVotes} votes</span>
                      </div>
                    </div>
                  </div>

                  {/* Poll Content */}
                  <div className="p-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      {poll.title}
                    </h2>
                    {poll.description && (
                      <p className="text-gray-700 mb-4">{poll.description}</p>
                    )}

                    {/* Poll Options */}
                    <div className="space-y-3">
                      {poll.options.map((option, index) => {
                        const percentage = calculatePercentage(
                          option.votes,
                          totalVotes
                        );

                        return (
                          <div key={index} className="relative">
                            <button
                              onClick={() => handleVote(poll.id, index)}
                              disabled={hasVoted || isExpired}
                              className={`w-full text-left p-3 rounded-lg border transition-all ${
                                hasVoted || isExpired
                                  ? "cursor-not-allowed border-gray-200 bg-gray-50"
                                  : "hover:border-purple-300 hover:bg-purple-50 border-gray-200"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-900">
                                  {option.text}
                                </span>
                                {(hasVoted || isExpired) && (
                                  <span className="text-sm font-medium text-purple-600">
                                    {percentage}%
                                  </span>
                                )}
                              </div>

                              {(hasVoted || isExpired) && (
                                <>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-gray-500">
                                      {option.votes} votes
                                    </span>
                                  </div>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Poll Status */}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {hasVoted
                            ? "✓ You voted"
                            : isExpired
                              ? "Poll ended"
                              : "Tap to vote"}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isExpired
                              ? "bg-gray-100 text-gray-600"
                              : "bg-green-100 text-green-600"
                          }`}
                        >
                          {isExpired ? "Closed" : "Active"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            } else {
              // Render government posts
              const post = item as Post & { type: string; date: Date };
              return (
                <div
                  key={`post-${post.id}`}
                  className="bg-white border-b border-gray-200 md:border md:rounded-lg overflow-hidden"
                >
                  {/* Post Header */}
                  <div className="flex items-center space-x-3 p-4 border-b border-gray-100">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {post.author?.full_name?.charAt(0).toUpperCase() || "G"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">
                          {post.author?.full_name || "Government Official"}
                        </h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          Announcement
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-0.5">
                        <Calendar size={12} className="mr-1" />
                        <span>
                          {formatRelativeTime(
                            post.published_at || post.created_at
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-sm text-gray-500">
                        <Eye size={14} className="mr-1" />
                        <span>{post.views || 0} views</span>
                      </div>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="p-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      {post.title}
                    </h2>
                    <p className="text-gray-700 mb-4 line-clamp-3">
                      {post.content}
                    </p>

                    {/* Post Image */}
                    {post.image_url && (
                      <div className="mb-4">
                        <img
                          src={post.image_url}
                          alt={post.title}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}

                    {/* Post Category & Priority */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            post.category === "emergency"
                              ? "bg-red-100 text-red-800"
                              : post.category === "development"
                                ? "bg-green-100 text-green-800"
                                : post.category === "services"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {post.category}
                        </span>
                        {post.priority === "high" && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                            High Priority
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center space-x-1 hover:text-red-500 transition-colors ${
                            post.liked_by.includes(user?.id || "")
                              ? "text-red-500"
                              : "text-gray-500"
                          }`}
                        >
                          <Heart
                            size={16}
                            className={
                              post.liked_by.includes(user?.id || "")
                                ? "fill-current"
                                : ""
                            }
                          />
                          <span>{post.likes} likes</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          })
        )}
      </div>

      {/* Load more */}
      {combinedContent.length > 0 && (
        <div className="flex justify-center py-8">
          <button
            onClick={() => fetchPolls()}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Load more content
          </button>
        </div>
      )}
    </div>
  );
};

export default Polls;
