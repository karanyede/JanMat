import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";
import { supabase } from "../lib/supabase";
import NotificationSystem from "./NotificationSystem";
import AdvancedSearchSystem from "./AdvancedSearchSystem";
import {
  Home,
  Newspaper,
  BarChart3,
  MessageCircle,
  User,
  Bell,
  Search,
  Plus,
  LogOut,
  Settings,
  Shield,
  PieChart,
  BadgeCheck,
  Edit3,
} from "lucide-react";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch user profile data including avatar
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navItems = [
    { path: "/dashboard", icon: Home, label: "Home" },
    { path: "/news", icon: Newspaper, label: "News" },
    { path: "/polls", icon: BarChart3, label: "Polls" },
    { path: "/chatbot", icon: MessageCircle, label: "Chat" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  // Add government-specific navigation items
  const governmentNavItems = [
    { path: "/government", icon: Shield, label: "Dashboard" },
    { path: "/analytics", icon: PieChart, label: "Analytics" },
  ];

  const currentNavItems =
    userProfile?.role === "government" ? governmentNavItems : navItems;

  return (
    <>
      {/* Desktop Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">JM</span>
              </div>
              <span className="font-bold text-xl text-gray-900 hidden sm:block">
                JanMat
              </span>
            </Link>

            {/* Center Search (Instagram style) */}
            <div className="hidden md:flex flex-1 max-w-xs mx-8">
              <button
                onClick={() => setShowSearch(true)}
                className="relative w-full text-left"
              >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <div className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 text-gray-500 text-sm">
                  Search issues, news...
                </div>
              </button>
            </div>

            {/* Right Side Icons (Instagram style) */}
            <div className="flex items-center space-x-1 md:space-x-4">
              {/* Desktop Navigation Icons */}
              <div className="hidden md:flex items-center space-x-1">
                {currentNavItems.slice(0, 4).map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`p-2 rounded-lg transition-colors ${
                        isActive
                          ? "text-blue-600 bg-blue-50"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                      title={item.label}
                    >
                      <Icon size={24} />
                    </Link>
                  );
                })}
              </div>

              <button
                onClick={() => setShowSearch(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg md:hidden"
                title="Search"
              >
                <Search size={24} />
              </button>

              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="Notifications"
              >
                <Bell size={24} />
                {/* Notification badge */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* User Menu */}
              <div className="relative group">
                <button className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100">
                  {userProfile?.avatar_url ? (
                    <img
                      src={userProfile.avatar_url}
                      alt={userProfile.full_name}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent hover:ring-gray-300 transition-all"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center ring-2 ring-transparent hover:ring-gray-300 transition-all">
                      <span className="text-white text-sm font-medium">
                        {userProfile?.full_name?.charAt(0).toUpperCase() ||
                          user?.user_metadata?.full_name
                            ?.charAt(0)
                            .toUpperCase() ||
                          user?.email?.charAt(0).toUpperCase() ||
                          "U"}
                      </span>
                    </div>
                  )}
                </button>

                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      {userProfile?.avatar_url ? (
                        <img
                          src={userProfile.avatar_url}
                          alt={userProfile.full_name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-lg font-medium">
                            {userProfile?.full_name?.charAt(0).toUpperCase() ||
                              user?.user_metadata?.full_name
                                ?.charAt(0)
                                .toUpperCase() ||
                              user?.email?.charAt(0).toUpperCase() ||
                              "U"}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {userProfile?.full_name ||
                            user?.user_metadata?.full_name ||
                            user?.email}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <Link
                      to="/profile"
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
                    >
                      <User size={18} />
                      <span>Profile</span>
                    </Link>
                    <Link
                      to="/verification"
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
                    >
                      <BadgeCheck size={18} />
                      <span>Verification</span>
                    </Link>
                    <Link
                      to="/post-news"
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
                    >
                      <Edit3 size={18} />
                      <span>Post News</span>
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
                    >
                      <Settings size={18} />
                      <span>Settings</span>
                    </Link>
                    {userProfile?.role === "government" && (
                      <>
                        <Link
                          to="/government"
                          className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
                        >
                          <Shield size={18} />
                          <span>Government Dashboard</span>
                        </Link>
                        <Link
                          to="/admin-verification"
                          className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
                        >
                          <BadgeCheck size={18} />
                          <span>Manage Verifications</span>
                        </Link>
                        <Link
                          to="/analytics"
                          className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
                        >
                          <PieChart size={18} />
                          <span>Analytics</span>
                        </Link>
                      </>
                    )}
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut size={18} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation (Instagram style) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center p-2 transition-colors ${
                  isActive ? "text-gray-900" : "text-gray-600"
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
                <span
                  className={`text-xs mt-1 ${isActive ? "font-medium" : "font-normal"}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Floating Action Button for all devices - only on home/dashboard page */}
      {userProfile?.role !== "government" &&
        (location.pathname === "/" || location.pathname === "/dashboard") && (
          <Link
            to="/report"
            className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105"
          >
            <Plus size={24} />
          </Link>
        )}

      {/* Notification System */}
      <NotificationSystem
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Search System */}
      <AdvancedSearchSystem
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
      />
    </>
  );
};

export default Navbar;
