import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Issue } from "../types";
import { useAuth } from "../hooks/useAuth";
import IssueCard from "../components/IssueCard";
import StoryCarousel from "../components/StoryCarousel";
import LoadingSpinner from "../components/LoadingSpinner";
import { createUpvoteNotification } from "../lib/notificationUtils";

const Dashboard = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect government users to their specialized dashboard
  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (userData?.role === "government") {
          window.location.href = "/government";
        }
      }
    };

    checkUserRole();
  }, [user]);

  const fetchIssues = async () => {
    try {
      setError(null);

      // Fetch issues with user profiles
      const { data: issuesData, error: issuesError } = await supabase
        .from("issues")
        .select(
          `
          *,
          reporter:users!reporter_id (
            id,
            full_name,
            avatar_url,
            email,
            role
          )
        `
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (issuesError) {
        console.error("Error fetching issues:", issuesError);
        setError("Failed to load issues. Please try again.");
        return;
      }

      // Transform the data to match our Issue type
      const transformedIssues: Issue[] = (issuesData || []).map(
        (issue: any) => ({
          id: issue.id,
          title: issue.title,
          description: issue.description,
          category: issue.category,
          status: issue.status,
          priority: issue.priority,
          location: issue.location,
          latitude: issue.latitude,
          longitude: issue.longitude,
          image_urls: issue.image_urls || [],
          upvotes: issue.upvotes || 0,
          upvoted_by: issue.upvoted_by || [],
          downvotes: issue.downvotes || 0,
          downvoted_by: issue.downvoted_by || [],
          is_public: issue.is_public,
          reporter_id: issue.reporter_id,
          reporter: issue.reporter
            ? {
                id: issue.reporter.id,
                full_name: issue.reporter.full_name,
                avatar_url: issue.reporter.avatar_url,
                email: issue.reporter.email,
                role: issue.reporter.role,
                is_public: true,
                followers: [],
                following: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : undefined,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
        })
      );

      setIssues(transformedIssues);
    } catch (err) {
      console.error("Error fetching issues:", err);
      setError("Failed to load issues. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchIssues();
  };

  const [upvotingIds, setUpvotingIds] = useState<Set<string>>(new Set());

  const handleUpvote = async (issueId: string) => {
    if (!user || upvotingIds.has(issueId)) return;

    try {
      setUpvotingIds((prev) => new Set([...prev, issueId]));

      const issue = issues.find((i) => i.id === issueId);
      if (!issue) {
        console.error("Issue not found for upvote:", issueId);
        return;
      }

      // Use RPC with SECURITY DEFINER to safely toggle upvote under RLS
      const { data: toggled, error } = await supabase.rpc("upvote_issue", {
        issue_id: issueId,
      });

      if (error) {
        console.error("Error updating upvote via RPC:", error);
        alert("Failed to update upvote. Please try again.");
        return;
      }

      // 'toggled' returns true if upvote was added, false if removed
      const addingUpvote = Boolean(toggled);
      const newUpvotedBy = addingUpvote
        ? Array.from(new Set([...(issue.upvoted_by || []), user.id]))
        : (issue.upvoted_by || []).filter((id) => id !== user.id);

      // Update local state immediately
      setIssues((prevIssues) =>
        prevIssues.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                upvotes: newUpvotedBy.length,
                upvoted_by: newUpvotedBy,
              }
            : issue
        )
      );

      // Create notification for the issue owner (if it's not the same user)
      if (issue.reporter_id && issue.reporter_id !== user.id) {
        await createUpvoteNotification(issue.reporter_id, issue.title, issueId);
      }

      console.log("Upvote updated successfully");
    } catch (error) {
      console.error("Error updating upvote:", error);
      alert("Failed to update upvote. Please try again.");
    } finally {
      setUpvotingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(issueId);
        return newSet;
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="w-full">
      {/* Stories for mobile */}
      <div className="md:hidden">
        <StoryCarousel />
      </div>

      {/* Desktop header with stories */}
      <div className="hidden md:block">
        <div className="mb-8">
          <StoryCarousel />
        </div>
      </div>

      {/* Pull to refresh indicator */}
      {refreshing && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={fetchIssues}
            className="mt-2 text-red-600 text-sm underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {/* Issues Feed - Instagram style */}
      <div className="space-y-0 md:space-y-6">
        {issues.length === 0 && !error ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No issues yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Be the first to report an issue in your community and help make a
              difference
            </p>
            <button
              onClick={() => (window.location.href = "/report")}
              className="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-8 py-3 rounded-lg hover:from-pink-600 hover:to-orange-600 transition-all transform hover:scale-105 font-medium"
            >
              Report First Issue
            </button>
          </div>
        ) : (
          issues.map((issue) => (
            <div
              key={issue.id}
              className="bg-white border border-gray-200 md:rounded-lg overflow-hidden"
            >
              <IssueCard
                issue={issue}
                onUpvote={() => handleUpvote(issue.id)}
                onDownvote={() => console.log("Downvote", issue.id)}
              />
            </div>
          ))
        )}
      </div>

      {/* Load more indicator */}
      {issues.length > 0 && (
        <div className="flex justify-center py-8">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg
              className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="text-sm font-medium">
              {refreshing ? "Loading..." : "Load more"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
