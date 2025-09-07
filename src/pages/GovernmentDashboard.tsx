import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Issue, News, Poll } from "../types";
import {
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Filter,
  MapPin,
} from "lucide-react";
import { formatRelativeTime } from "../lib/utils";

interface DashboardStats {
  totalIssues: number;
  pendingIssues: number;
  resolvedIssues: number;
  activePolls: number;
  totalCitizens: number;
  thisMonthIssues: number;
}

const GovernmentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalIssues: 0,
    pendingIssues: 0,
    resolvedIssues: 0,
    activePolls: 0,
    totalCitizens: 0,
    thisMonthIssues: 0,
  });

  const [recentIssues, setRecentIssues] = useState<Issue[]>([]);
  const [_recentNews, setRecentNews] = useState<News[]>([]);
  const [_activePolls, setActivePolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showIssueReview, setShowIssueReview] = useState(false);

  // Fetch user profile to get role
  useEffect(() => {
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

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (userProfile?.role === "government") {
      fetchDashboardData();
    }
  }, [userProfile]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch statistics
      await Promise.all([
        fetchStats(),
        fetchRecentIssues(),
        fetchRecentNews(),
        fetchActivePolls(),
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Total issues
      const { count: totalIssues } = await supabase
        .from("issues")
        .select("*", { count: "exact", head: true });

      // Pending issues (not resolved)
      const { count: pendingIssues } = await supabase
        .from("issues")
        .select("*", { count: "exact", head: true })
        .neq("status", "resolved");

      // Resolved issues
      const { count: resolvedIssues } = await supabase
        .from("issues")
        .select("*", { count: "exact", head: true })
        .eq("status", "resolved");

      // Active polls
      const { count: activePolls } = await supabase
        .from("polls")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Total citizens
      const { count: totalCitizens } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "citizen");

      // This month issues
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const { count: thisMonthIssues } = await supabase
        .from("issues")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thisMonth.toISOString());

      setStats({
        totalIssues: totalIssues || 0,
        pendingIssues: pendingIssues || 0,
        resolvedIssues: resolvedIssues || 0,
        activePolls: activePolls || 0,
        totalCitizens: totalCitizens || 0,
        thisMonthIssues: thisMonthIssues || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchRecentIssues = async () => {
    try {
      const { data, error } = await supabase
        .from("issues")
        .select(
          `
          *,
          reporter:users!reporter_id (
            id,
            full_name,
            email,
            role
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentIssues(data || []);
    } catch (error) {
      console.error("Error fetching recent issues:", error);
    }
  };

  const fetchRecentNews = async () => {
    try {
      const { data, error } = await supabase
        .from("news")
        .select(
          `
          *,
          users!author_id (
            id,
            full_name,
            role
          )
        `
        )
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentNews(data || []);
    } catch (error) {
      console.error("Error fetching recent news:", error);
    }
  };

  const fetchActivePolls = async () => {
    try {
      const { data, error } = await supabase
        .from("polls")
        .select(
          `
          *,
          creator:users!creator_id (
            id,
            full_name,
            role
          )
        `
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setActivePolls(data || []);
    } catch (error) {
      console.error("Error fetching active polls:", error);
    }
  };

  const updateIssueStatus = async (issueId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("issues")
        .update({ status: newStatus })
        .eq("id", issueId);

      if (error) throw error;

      // Refresh data
      fetchDashboardData();
    } catch (error) {
      console.error("Error updating issue status:", error);
      alert("Failed to update issue status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-yellow-100 text-yellow-800";
      case "under_review":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-purple-100 text-purple-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDepartmentName = (category: string) => {
    switch (category) {
      case "infrastructure":
        return "Public Works Department";
      case "sanitation":
        return "Sanitation & Hygiene Department";
      case "transportation":
        return "Transportation Department";
      case "safety":
        return "Public Safety Department";
      case "environment":
        return "Environmental Department";
      case "utilities":
        return "Utilities & Services Department";
      case "healthcare":
        return "Health Department";
      case "education":
        return "Education Department";
      case "other":
        return "General Administration";
      default:
        return "General Administration";
    }
  };

  const handleCreatePost = async (postData: any) => {
    try {
      // Temporarily use news table until posts table is created
      const { error } = await supabase.from("news").insert([
        {
          ...postData,
          author_id: user?.id,
          published: true,
          published_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      setShowCreatePost(false);
      fetchDashboardData();
      alert("Post created successfully!");
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post");
    }
  };

  const handleCreatePoll = async (pollData: any) => {
    try {
      console.log("Creating poll with data:", pollData);

      const { error } = await supabase.from("polls").insert([
        {
          ...pollData,
          creator_id: user?.id, // Fixed: was 'created_by', should be 'creator_id'
          is_active: true,
          voted_by: [],
        },
      ]);

      if (error) {
        console.error("Database error creating poll:", error);
        throw error;
      }

      setShowCreatePoll(false);
      fetchDashboardData();
      alert("Poll created successfully!");
    } catch (error) {
      console.error("Error creating poll:", error);
      alert("Failed to create poll");
    }
  };

  if (userProfile?.role !== "government") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            This dashboard is only accessible to government users.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Government Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Manage civic issues, news, and community engagement
          </p>
        </div>

        {/* Stats Grid - Essential Metrics Only */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Issues
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalIssues}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  +{stats.thisMonthIssues} this month
                </p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending Issues
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.pendingIssues}
                </p>
                <p className="text-xs text-gray-500 mt-1">Needs attention</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.resolvedIssues}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalIssues > 0
                    ? Math.round(
                        (stats.resolvedIssues / stats.totalIssues) * 100
                      )
                    : 0}
                  % completion
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Polls
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.activePolls}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Community engagement
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate("/post-news")}
              className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create News
            </button>
            <button
              onClick={() => setShowCreatePost(true)}
              className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Post
            </button>
            <button
              onClick={() => setShowCreatePoll(true)}
              className="flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Poll
            </button>
            <button
              onClick={() => setShowIssueReview(true)}
              className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Review All Issues
            </button>
          </div>
        </div>

        {/* Recent Issues - Full Width */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Issues
              </h2>
              <div className="flex items-center space-x-2">
                <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                  <Filter className="w-4 h-4 mr-1" />
                  Filter
                </button>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {recentIssues.map((issue) => (
              <div key={issue.id} className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between space-y-4 md:space-y-0">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {issue.title}
                      </h3>
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
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                      >
                        📋 {issue.category.charAt(0).toUpperCase() + issue.category.slice(1).replace('_', ' ')} Dept.
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">
                      {issue.description}
                    </p>
                    
                    {/* Department Assignment Info */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-700">Department:</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {getDepartmentName(issue.category)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-700">Category:</span>
                          <span className="text-gray-600">{issue.category.charAt(0).toUpperCase() + issue.category.slice(1).replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center text-sm text-gray-500 gap-4">
                      <span>
                        By: {issue.reporter?.full_name || "Anonymous"}
                      </span>
                      <span>📍 {issue.location}</span>
                      <span>{formatRelativeTime(issue.created_at)}</span>
                      <span>👍 {issue.upvotes}</span>
                    </div>
                    
                    {/* Solve Problem - View Location Button - Available for Everyone */}
                    {/* Solve Problem - View Location Button - ONLY for Government Officials and only if location is available */}
                    {userProfile?.role === "government" && issue.latitude && issue.longitude && (
                      <div className="mt-3">
                        <Link
                          to={`/issues/${issue.id}?showMap=true`}
                          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          <MapPin size={16} strokeWidth={1.5} />
                          <span>Solve Problem - View Location</span>
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 md:ml-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={issue.status}
                      onChange={(e) =>
                        updateIssueStatus(issue.id, e.target.value)
                      }
                      className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[140px] w-full md:w-auto"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="under_review">Under Review</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create Announcement</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                handleCreatePost({
                  title: formData.get("title"),
                  content: formData.get("content"),
                  category: formData.get("category"),
                });
              }}
            >
              <div className="space-y-4">
                <input
                  name="title"
                  type="text"
                  placeholder="Announcement Title"
                  className="w-full p-2 border rounded-lg"
                  required
                />
                <select
                  name="category"
                  className="w-full p-2 border rounded-lg"
                  required
                >
                  <option value="announcement">General Announcement</option>
                  <option value="update">Update</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="event">Event</option>
                  <option value="notice">Notice</option>
                </select>
                <textarea
                  name="content"
                  placeholder="Announcement Content"
                  rows={4}
                  className="w-full p-2 border rounded-lg"
                  required
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
                  >
                    Create Post
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreatePost(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Poll Modal */}
      {showCreatePoll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create Poll</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 7); // 1 week from now
                handleCreatePoll({
                  title: formData.get("title"),
                  description: formData.get("description"),
                  options: [
                    formData.get("option1"),
                    formData.get("option2"),
                    formData.get("option3"),
                    formData.get("option4"),
                  ].filter(Boolean),
                  end_date: endDate.toISOString(),
                });
              }}
            >
              <div className="space-y-4">
                <input
                  name="title"
                  type="text"
                  placeholder="Poll Question"
                  className="w-full p-2 border rounded-lg"
                  required
                />
                <textarea
                  name="description"
                  placeholder="Poll Description (optional)"
                  rows={2}
                  className="w-full p-2 border rounded-lg"
                />
                <input
                  name="option1"
                  type="text"
                  placeholder="Option 1"
                  className="w-full p-2 border rounded-lg"
                  required
                />
                <input
                  name="option2"
                  type="text"
                  placeholder="Option 2"
                  className="w-full p-2 border rounded-lg"
                  required
                />
                <input
                  name="option3"
                  type="text"
                  placeholder="Option 3 (optional)"
                  className="w-full p-2 border rounded-lg"
                />
                <input
                  name="option4"
                  type="text"
                  placeholder="Option 4 (optional)"
                  className="w-full p-2 border rounded-lg"
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
                  >
                    Create Poll
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreatePoll(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Review Modal */}
      {showIssueReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Review Issues</h3>
            <div className="space-y-4">
              {recentIssues.map((issue) => (
                <div key={issue.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{issue.title}</h4>
                    <span
                      className={`px-2 py-1 rounded text-xs ${getStatusColor(issue.status)}`}
                    >
                      {issue.status}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">
                    {issue.description}
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() =>
                        updateIssueStatus(issue.id, "under_review")
                      }
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                    >
                      Under Review
                    </button>
                    <button
                      onClick={() => updateIssueStatus(issue.id, "in_progress")}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => updateIssueStatus(issue.id, "resolved")}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                    >
                      Resolved
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowIssueReview(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GovernmentDashboard;
