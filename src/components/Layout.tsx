import React, { useState, useEffect } from "react";
import { Outlet, Navigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import Navbar from "./Navbar";
import LoadingSpinner from "./LoadingSpinner";

const Layout: React.FC = () => {
  const { user, loading } = useAuth();
  const [communityStats, setCommunityStats] = useState({
    activeIssues: 0,
    thisWeekNew: 0,
    resolved: 0,
  });
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchCommunityStats = async () => {
      try {
        // Get total active issues
        const { count: activeCount } = await supabase
          .from("issues")
          .select("*", { count: "exact", head: true })
          .in("status", ["submitted", "under_review", "in_progress"]);

        // Get this week's new issues
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const { count: thisWeekCount } = await supabase
          .from("issues")
          .select("*", { count: "exact", head: true })
          .gte("created_at", oneWeekAgo.toISOString());

        // Get resolved issues
        const { count: resolvedCount } = await supabase
          .from("issues")
          .select("*", { count: "exact", head: true })
          .eq("status", "resolved");

        setCommunityStats({
          activeIssues: activeCount || 0,
          thisWeekNew: thisWeekCount || 0,
          resolved: resolvedCount || 0,
        });

        // Get active users (those who have created issues, votes, or comments recently)
        const activeTimeFrame = new Date();
        activeTimeFrame.setDate(activeTimeFrame.getDate() - 7);

        const { data: activeUserIds } = await supabase
          .from("issues")
          .select("reporter_id")
          .gte("created_at", activeTimeFrame.toISOString())
          .limit(10);

        if (activeUserIds && activeUserIds.length > 0) {
          const userIds = [
            ...new Set(activeUserIds.map((issue) => issue.reporter_id)),
          ];

          const { data: activeUsers } = await supabase
            .from("users")
            .select("id, full_name, email, role, avatar_url")
            .in("id", userIds)
            .neq("id", user?.id)
            .limit(5);

          setSuggestedUsers(activeUsers || []);
        } else {
          // Fallback to recent users if no active issues
          const { data: recentUsers } = await supabase
            .from("users")
            .select("id, full_name, email, role, avatar_url")
            .neq("id", user?.id)
            .order("created_at", { ascending: false })
            .limit(3);

          setSuggestedUsers(recentUsers || []);
        }
      } catch (error) {
        console.error("Error fetching community stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (user) {
      fetchCommunityStats();
    }
  }, [user]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Instagram-style main container */}
      <main className="pt-16 pb-20 md:pb-0">
        {/* Container with Instagram-like max width and centering */}
        <div className="max-w-6xl mx-auto">
          <div className="md:flex md:gap-8 lg:gap-12">
            {/* Main content area */}
            <div className="flex-1 max-w-2xl mx-auto md:mx-0">
              <Outlet />
            </div>

            {/* Right sidebar for larger screens (Instagram-style) */}
            <aside className="hidden lg:block w-80 mt-8">
              <div className="sticky top-24 space-y-4">
                {/* Active Community Members */}
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">
                      Active Community Members
                    </h3>
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      Recently Active
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                    Citizens who recently reported issues, participated in
                    polls, or engaged with the community. Connect with them to
                    stay updated on local matters.
                  </p>
                  {loadingStats ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                          <div className="flex-1">
                            <div className="h-3 bg-gray-200 rounded animate-pulse mb-1"></div>
                            <div className="h-2 bg-gray-200 rounded animate-pulse w-2/3"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : suggestedUsers.length > 0 ? (
                    <div className="space-y-3">
                      {suggestedUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.full_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                                  <span className="text-white text-xs font-semibold">
                                    {user.full_name?.charAt(0) ||
                                      user.email?.charAt(0) ||
                                      "U"}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {user.full_name || user.email?.split("@")[0]}
                              </p>
                              <p className="text-xs text-gray-500 capitalize flex items-center">
                                {user.role === "government" ? (
                                  <>
                                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                                    Government Official
                                  </>
                                ) : (
                                  <>
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                    Community Member
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <Link
                            to={`/profile/${user.id}`}
                            className="text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors"
                          >
                            View Profile
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No active members found
                    </p>
                  )}
                </div>

                {/* Real-time Community Stats */}
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Community Stats
                  </h3>
                  {loadingStats ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex justify-between">
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-8"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Active Issues</span>
                        <span className="font-medium text-blue-600">
                          {communityStats.activeIssues}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">This Week</span>
                        <span className="font-medium text-orange-600">
                          {communityStats.thisWeekNew} new
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Resolved</span>
                        <span className="font-medium text-green-600">
                          {communityStats.resolved}
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Resolution Rate</span>
                          <span className="font-medium text-purple-600">
                            {communityStats.activeIssues +
                              communityStats.resolved >
                            0
                              ? Math.round(
                                  (communityStats.resolved /
                                    (communityStats.activeIssues +
                                      communityStats.resolved)) *
                                    100
                                )
                              : 0}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
