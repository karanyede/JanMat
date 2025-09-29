import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  BarChart3,
  TrendingUp,
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
        citizenEngagement,
      ] = await Promise.all([
        fetchIssuesByCategory(),
        fetchIssuesByStatus(),
        fetchIssuesByPriority(),
        fetchIssuesByMonth(),
        fetchTopLocations(),
        fetchCitizenEngagement(),
      ]);

      setData({
        issuesByCategory,
        issuesByStatus,
        issuesByPriority,
        issuesByMonth,
        topLocations,
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
        const category = issue.category
          ? issue.category.trim().toLowerCase()
          : "other";
        const displayCategory =
          category.charAt(0).toUpperCase() + category.slice(1);
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
        const status = issue.status
          ? issue.status.trim().toLowerCase()
          : "submitted";
        const displayStatus = status
          .replace("_", " ")
          .replace(/\b\w/g, (l: string) => l.toUpperCase());
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
        const priority = issue.priority
          ? issue.priority.trim().toLowerCase()
          : "medium";
        const displayPriority =
          priority.charAt(0).toUpperCase() + priority.slice(1);
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
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      });

      // Convert to array and sort chronologically
      return Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, count]) => {
          const [year, month] = monthKey.split("-");
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
          if (locationName.startsWith("GPS:")) {
            // Extract coordinates and create a more readable format
            const coordMatch = locationName.match(
              /GPS:\s*([-\d.]+),\s*([-\d.]+)/
            );
            if (coordMatch) {
              const [, lat, lng] = coordMatch;
              locationName = `Location (${parseFloat(lat).toFixed(2)}, ${parseFloat(lng).toFixed(2)})`;
            } else {
              return; // Skip invalid GPS formats
            }
          }

          // Group similar locations and clean up names
          locationName = locationName.replace(/\s+/g, " ").trim();

          // Capitalize first letter of each word for consistency
          locationName = locationName.replace(/\b\w/g, (l: string) =>
            l.toUpperCase()
          );

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
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Analytics & Reports
              </h1>
              <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
                Insights into civic engagement and issue management
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="6months">Last 6 Months</option>
                <option value="12months">Last 12 Months</option>
              </select>
              <button
                onClick={generateReport}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Generate Report</span>
                <span className="sm:hidden">Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">
                  Total Issues
                </p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">
                  {Object.values(data.issuesByStatus).reduce(
                    (a, b) => a + b,
                    0
                  )}
                </p>
              </div>
              <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">
                  Active Citizens
                </p>
                <p className="text-xl md:text-2xl font-bold text-purple-600">
                  {data.citizenEngagement.activeUsers}
                </p>
              </div>
              <Users className="w-6 h-6 md:w-8 md:h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">
                  New Users
                </p>
                <p className="text-xl md:text-2xl font-bold text-indigo-600">
                  {data.citizenEngagement.newUsersThisMonth}
                </p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
          {/* Issues by Status */}
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900">
                Issues by Status
              </h3>
            </div>
            <div className="space-y-4 md:space-y-5">
              {Object.entries(data.issuesByStatus).length > 0 ? (
                Object.entries(data.issuesByStatus).map(([status, count]) => {
                  const total = Object.values(data.issuesByStatus).reduce(
                    (a, b) => a + b,
                    0
                  );
                  const percentage = total > 0 ? (count / total) * 100 : 0;
                  
                  // Color mapping for different statuses
                  const getStatusColor = (status: string) => {
                    switch (status.toLowerCase()) {
                      case 'submitted': return 'bg-yellow-500';
                      case 'under_review': return 'bg-blue-500';
                      case 'in_progress': return 'bg-orange-500';
                      case 'resolved': return 'bg-green-500';
                      default: return 'bg-gray-500';
                    }
                  };

                  return (
                    <div
                      key={status}
                      className="group p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-800 capitalize">
                          {status.replace('_', ' ')}
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          {count}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-3 shadow-inner">
                          <div
                            className={`${getStatusColor(status)} h-3 rounded-full transition-all duration-500 shadow-sm`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-600 min-w-[3rem] text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto" />
                  </div>
                  <p className="text-base text-gray-600 font-medium">
                    No status data available
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Data will appear as issues are reported
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Issues by Category */}
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900">
                Issues by Category
              </h3>
            </div>
            <div className="space-y-4 md:space-y-5">
              {Object.entries(data.issuesByCategory).length > 0 ? (
                Object.entries(data.issuesByCategory).map(
                  ([category, count]) => {
                    const total = Object.values(data.issuesByCategory).reduce(
                      (a, b) => a + b,
                      0
                    );
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    
                    // Color mapping for different categories
                    const getCategoryColor = (category: string) => {
                      switch (category.toLowerCase()) {
                        case 'infrastructure': return 'bg-blue-500';
                        case 'safety': return 'bg-red-500';
                        case 'environment': return 'bg-green-500';
                        case 'transportation': return 'bg-purple-500';
                        case 'utilities': return 'bg-orange-500';
                        case 'governance': return 'bg-indigo-500';
                        default: return 'bg-gray-500';
                      }
                    };

                    return (
                      <div
                        key={category}
                        className="group p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-800 capitalize">
                            {category}
                          </span>
                          <span className="text-lg font-bold text-gray-900">
                            {count}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-3 shadow-inner">
                            <div
                              className={`${getCategoryColor(category)} h-3 rounded-full transition-all duration-500 shadow-sm`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-600 min-w-[3rem] text-right">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  }
                )
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto" />
                  </div>
                  <p className="text-base text-gray-600 font-medium">
                    No category data available
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Data will appear as issues are categorized
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Trends and Top Locations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Monthly Trends */}
          <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900">
                Monthly Issue Trends
              </h3>
            </div>
            {data.issuesByMonth.length > 0 ? (
              <div className="bg-gradient-to-b from-gray-50 to-white p-6 rounded-lg">
                <div className="h-56 md:h-72 flex items-end justify-between space-x-2 md:space-x-3">
                  {data.issuesByMonth.map((item, index) => {
                    const maxCount = Math.max(
                      ...data.issuesByMonth.map((d) => d.count),
                      1
                    );
                    const height = (item.count / maxCount) * 100;
                    
                    // Generate gradient colors for bars
                    const getBarColor = (index: number) => {
                      const colors = [
                        'bg-gradient-to-t from-blue-400 to-blue-600',
                        'bg-gradient-to-t from-purple-400 to-purple-600',
                        'bg-gradient-to-t from-green-400 to-green-600',
                        'bg-gradient-to-t from-yellow-400 to-yellow-600',
                        'bg-gradient-to-t from-red-400 to-red-600',
                        'bg-gradient-to-t from-indigo-400 to-indigo-600',
                      ];
                      return colors[index % colors.length];
                    };

                    return (
                      <div
                        key={index}
                        className="flex flex-col items-center flex-1 group"
                      >
                        <div className="bg-white px-2 py-1 rounded-md shadow-sm mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <span className="text-xs font-semibold text-gray-700">
                            {item.count} issues
                          </span>
                        </div>
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 hover:scale-105 cursor-pointer shadow-md ${getBarColor(index)}`}
                          style={{ height: `${height}%`, minHeight: "8px" }}
                        ></div>
                        <div className="text-xs text-gray-600 mt-3 transform -rotate-45 origin-left whitespace-nowrap font-medium">
                          {item.month}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                    <span>Hover over bars for details</span>
                    <span>•</span>
                    <span>Total: {data.issuesByMonth.reduce((sum, item) => sum + item.count, 0)} issues</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-56 md:h-72 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="p-6 bg-gray-100 rounded-full w-24 h-24 mx-auto mb-4">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto" />
                  </div>
                  <p className="text-base text-gray-600 font-medium">
                    No trend data available
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Data will appear as issues are reported over time
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Top Locations */}
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900">
                Top Issue Locations
              </h3>
            </div>
            <div className="space-y-3">
              {data.topLocations.length > 0 ? (
                data.topLocations.slice(0, 8).map((location, index) => {
                  const maxCount = Math.max(...data.topLocations.map(l => l.count), 1);
                  const percentage = (location.count / maxCount) * 100;
                  
                  return (
                    <div
                      key={index}
                      className="group p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="p-1.5 bg-orange-100 rounded-full group-hover:bg-orange-200 transition-colors duration-200 flex-shrink-0">
                            <MapPin className="w-3 h-3 text-orange-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-800 truncate flex-1" title={location.location}>
                            {location.location}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                          <span className="text-lg font-bold text-gray-900">
                            {location.count}
                          </span>
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 shadow-inner">
                        <div
                          className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto" />
                  </div>
                  <p className="text-base text-gray-600 font-medium">
                    No location data available
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Locations will appear as issues are reported
                  </p>
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
