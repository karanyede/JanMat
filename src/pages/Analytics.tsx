import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  AlertTriangle,
  Download,
  MapPin,
} from "lucide-react";

interface AnalyticsData {
  issuesByCategory: { [key: string]: number };
  issuesByStatus: { [key: string]: number };
  issuesByPriority: { [key: string]: number };
  issuesByMonth: { month: string; count: number }[];
  topLocations: { location: string; count: number }[];
  averageResolutionTime: number;
  citizenEngagement: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
  };
}

const Analytics = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [data, setData] = useState<AnalyticsData>({
    issuesByCategory: {},
    issuesByStatus: {},
    issuesByPriority: {},
    issuesByMonth: [],
    topLocations: [],
    averageResolutionTime: 0,
    citizenEngagement: {
      totalUsers: 0,
      activeUsers: 0,
      newUsersThisMonth: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState("6months");

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
      fetchAnalyticsData();
    }
  }, [userProfile, selectedTimeframe]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [
        issuesByCategory,
        issuesByStatus,
        issuesByPriority,
        issuesByMonth,
        topLocations,
        resolutionTime,
        citizenEngagement,
      ] = await Promise.all([
        fetchIssuesByCategory(),
        fetchIssuesByStatus(),
        fetchIssuesByPriority(),
        fetchIssuesByMonth(),
        fetchTopLocations(),
        fetchAverageResolutionTime(),
        fetchCitizenEngagement(),
      ]);

      setData({
        issuesByCategory,
        issuesByStatus,
        issuesByPriority,
        issuesByMonth,
        topLocations,
        averageResolutionTime: resolutionTime,
        citizenEngagement,
      });
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIssuesByCategory = async () => {
    try {
      const { data, error } = await supabase.from("issues").select("category");

      if (error) throw error;

      const categories: { [key: string]: number } = {};
      data?.forEach((issue) => {
        // Clean up and normalize category names
        const category = issue.category ? issue.category.trim().toLowerCase() : 'other';
        const displayCategory = category.charAt(0).toUpperCase() + category.slice(1);
        categories[displayCategory] = (categories[displayCategory] || 0) + 1;
      });

      return categories;
    } catch (error) {
      console.error("Error fetching issues by category:", error);
      return {};
    }
  };

  const fetchIssuesByStatus = async () => {
    try {
      const { data, error } = await supabase.from("issues").select("status");

      if (error) throw error;

      const statuses: { [key: string]: number } = {};
      data?.forEach((issue) => {
        // Clean up and normalize status names
        const status = issue.status ? issue.status.trim().toLowerCase() : 'submitted';
        const displayStatus = status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        statuses[displayStatus] = (statuses[displayStatus] || 0) + 1;
      });

      return statuses;
    } catch (error) {
      console.error("Error fetching issues by status:", error);
      return {};
    }
  };

  const fetchIssuesByPriority = async () => {
    try {
      const { data, error } = await supabase.from("issues").select("priority");

      if (error) throw error;

      const priorities: { [key: string]: number } = {};
      data?.forEach((issue) => {
        // Clean up and normalize priority names
        const priority = issue.priority ? issue.priority.trim().toLowerCase() : 'medium';
        const displayPriority = priority.charAt(0).toUpperCase() + priority.slice(1);
        priorities[displayPriority] = (priorities[displayPriority] || 0) + 1;
      });

      return priorities;
    } catch (error) {
      console.error("Error fetching issues by priority:", error);
      return {};
    }
  };

  const fetchIssuesByMonth = async () => {
    try {
      const monthsBack = selectedTimeframe === "12months" ? 12 : 6;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);

      const { data, error } = await supabase
        .from("issues")
        .select("created_at")
        .gte("created_at", startDate.toISOString());

      if (error) throw error;

      const monthlyData: { [key: string]: number } = {};
      data?.forEach((issue) => {
        const date = new Date(issue.created_at);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      });

      // Convert to array and sort chronologically
      return Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, count]) => {
          const [year, month] = monthKey.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1);
          const monthName = date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
          });
          return { month: monthName, count };
        });
    } catch (error) {
      console.error("Error fetching issues by month:", error);
      return [];
    }
  };

  const fetchTopLocations = async () => {
    try {
      const { data, error } = await supabase.from("issues").select("location");

      if (error) throw error;

      const locations: { [key: string]: number } = {};
      data?.forEach((issue) => {
        if (issue.location) {
          // Filter out GPS coordinate entries and clean up location names
          let locationName = issue.location.trim();
          
          // If it's a GPS coordinate format, extract meaningful info or skip
          if (locationName.startsWith('GPS:')) {
            // Extract coordinates and create a more readable format
            const coordMatch = locationName.match(/GPS:\s*([-\d.]+),\s*([-\d.]+)/);
            if (coordMatch) {
              const [, lat, lng] = coordMatch;
              locationName = `Location (${parseFloat(lat).toFixed(2)}, ${parseFloat(lng).toFixed(2)})`;
            } else {
              return; // Skip invalid GPS formats
            }
          }
          
          // Group similar locations and clean up names
          locationName = locationName.replace(/\s+/g, ' ').trim();
          
          // Capitalize first letter of each word for consistency
          locationName = locationName.replace(/\b\w/g, (l: string) => l.toUpperCase());
          
          locations[locationName] = (locations[locationName] || 0) + 1;
        }
      });

      return Object.entries(locations)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([location, count]) => ({ location, count }));
    } catch (error) {
      console.error("Error fetching top locations:", error);
      return [];
    }
  };

  const fetchAverageResolutionTime = async () => {
    try {
      const { data, error } = await supabase
        .from("issues")
        .select("created_at, updated_at")
        .eq("status", "resolved");

      if (error) throw error;

      if (!data || data.length === 0) return 0;

      const totalDays = data.reduce((sum, issue) => {
        const created = new Date(issue.created_at);
        const resolved = new Date(issue.updated_at);
        const diffDays = Math.ceil(
          (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + diffDays;
      }, 0);

      return Math.round(totalDays / data.length);
    } catch (error) {
      console.error("Error fetching resolution time:", error);
      return 0;
    }
  };

  const fetchCitizenEngagement = async () => {
    try {
      // Total users
      const { count: totalUsers } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "citizen");

      // Active users (users who created issues in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activeUserIds } = await supabase
        .from("issues")
        .select("reporter_id")
        .gte("created_at", thirtyDaysAgo.toISOString());

      const uniqueActiveUsers = new Set(
        activeUserIds?.map((issue) => issue.reporter_id)
      ).size;

      // New users this month
      const thisMonth = new Date();
      thisMonth.setDate(1);

      const { count: newUsersThisMonth } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "citizen")
        .gte("created_at", thisMonth.toISOString());

      return {
        totalUsers: totalUsers || 0,
        activeUsers: uniqueActiveUsers,
        newUsersThisMonth: newUsersThisMonth || 0,
      };
    } catch (error) {
      console.error("Error fetching citizen engagement:", error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        newUsersThisMonth: 0,
      };
    }
  };

  const generateReport = () => {
    // Create a simple text report
    let report = "JanMat Analytics Report\n";
    report += "=".repeat(30) + "\n\n";

    report += `Generated: ${new Date().toLocaleDateString()}\n\n`;

    report += "ISSUE STATISTICS:\n";
    report += "-".repeat(20) + "\n";
    Object.entries(data.issuesByStatus).forEach(([status, count]) => {
      report += `${status}: ${count}\n`;
    });

    report += "\nCATEGORY BREAKDOWN:\n";
    report += "-".repeat(20) + "\n";
    Object.entries(data.issuesByCategory).forEach(([category, count]) => {
      report += `${category}: ${count}\n`;
    });

    report += `\nAverage Resolution Time: ${data.averageResolutionTime} days\n`;
    report += `Total Citizens: ${data.citizenEngagement.totalUsers}\n`;
    report += `Active Citizens: ${data.citizenEngagement.activeUsers}\n`;

    // Download as text file
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `janmat-analytics-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
            This page is only accessible to government users.
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
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Analytics & Reports
              </h1>
              <p className="text-gray-600 mt-2">
                Insights into civic engagement and issue management
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="6months">Last 6 Months</option>
                <option value="12months">Last 12 Months</option>
              </select>
              <button
                onClick={generateReport}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Issues
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.values(data.issuesByStatus).reduce(
                    (a, b) => a + b,
                    0
                  )}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg. Resolution
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {data.averageResolutionTime} days
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Citizens
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {data.citizenEngagement.activeUsers}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Users</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {data.citizenEngagement.newUsersThisMonth}
                </p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              <TrendingUp className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Issues by Status */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Issues by Status
            </h3>
            <div className="space-y-4">
              {Object.entries(data.issuesByStatus).length > 0 ? (
                Object.entries(data.issuesByStatus).map(([status, count]) => {
                  const total = Object.values(data.issuesByStatus).reduce(
                    (a, b) => a + b,
                    0
                  );
                  const percentage = total > 0 ? (count / total) * 100 : 0;

                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {status}
                      </span>
                      <div className="flex items-center space-x-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No status data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Issues by Category */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Issues by Category
            </h3>
            <div className="space-y-4">
              {Object.entries(data.issuesByCategory).length > 0 ? (
                Object.entries(data.issuesByCategory).map(
                  ([category, count]) => {
                    const total = Object.values(data.issuesByCategory).reduce(
                      (a, b) => a + b,
                      0
                    );
                    const percentage = total > 0 ? (count / total) * 100 : 0;

                    return (
                      <div
                        key={category}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {category}
                        </span>
                        <div className="flex items-center space-x-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    );
                  }
                )
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No category data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Trends and Top Locations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Monthly Trends */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Monthly Issue Trends
            </h3>
            {data.issuesByMonth.length > 0 ? (
              <div className="h-64 flex items-end justify-between space-x-2">
                {data.issuesByMonth.map((item, index) => {
                  const maxCount = Math.max(
                    ...data.issuesByMonth.map((d) => d.count),
                    1
                  );
                  const height = (item.count / maxCount) * 100;

                  return (
                    <div
                      key={index}
                      className="flex flex-col items-center flex-1"
                    >
                      <div className="text-xs text-gray-600 mb-2">
                        {item.count}
                      </div>
                      <div
                        className="bg-blue-500 w-full rounded-t transition-all duration-300 hover:bg-blue-600"
                        style={{ height: `${height}%`, minHeight: "4px" }}
                      ></div>
                      <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                        {item.month}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No trend data available</p>
                  <p className="text-xs text-gray-400 mt-1">Data will appear as issues are reported over time</p>
                </div>
              </div>
            )}
          </div>

          {/* Top Locations */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top Issue Locations
            </h3>
            <div className="space-y-3">
              {data.topLocations.length > 0 ? (
                data.topLocations.slice(0, 8).map((location, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700 truncate max-w-32">
                        {location.location}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {location.count}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No location data available</p>
                  <p className="text-xs text-gray-400 mt-1">Locations will appear as issues are reported</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
