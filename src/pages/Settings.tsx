import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  Globe,
  Smartphone,
  Moon,
  Sun,
  LogOut,
  Save,
  Camera,
  Edit3,
} from "lucide-react";

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    notifications: {
      push: true,
      email: true,
      issueUpdates: true,
      newsAlerts: false,
      pollReminders: true,
    },
    privacy: {
      profilePublic: true,
      showLocation: false,
      analyticsOptIn: true,
    },
    appearance: {
      darkMode: false,
      language: "en",
    },
    profile: {
      fullName: user?.user_metadata?.full_name || "",
      phone: user?.user_metadata?.phone || "",
      bio: user?.user_metadata?.bio || "",
    },
  });

  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (userData) {
          setSettings((prev) => ({
            ...prev,
            profile: {
              fullName:
                userData.full_name || user.user_metadata?.full_name || "",
              phone: userData.phone || user.user_metadata?.phone || "",
              bio: userData.bio || "",
            },
            privacy: {
              profilePublic:
                userData.is_public !== undefined ? userData.is_public : true,
              showLocation: false,
              analyticsOptIn: true,
            },
          }));
        }
      };

      fetchUserData();
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      // Update user profile in the users table
      const { error } = await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email,
          full_name: settings.profile.fullName,
          phone: settings.profile.phone,
          bio: settings.profile.bio,
          is_public: settings.privacy.profilePublic,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (error) {
        console.error("Error saving settings:", error);
        alert("Failed to save settings. Please try again.");
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const toggleSetting = (category: string, setting: string) => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      if (category === "notifications") {
        newSettings.notifications = {
          ...newSettings.notifications,
          [setting]:
            !newSettings.notifications[
              setting as keyof typeof newSettings.notifications
            ],
        };
      } else if (category === "privacy") {
        newSettings.privacy = {
          ...newSettings.privacy,
          [setting]:
            !newSettings.privacy[setting as keyof typeof newSettings.privacy],
        };
      } else if (category === "appearance") {
        newSettings.appearance = {
          ...newSettings.appearance,
          [setting]:
            !newSettings.appearance[
              setting as keyof typeof newSettings.appearance
            ],
        };
      }
      return newSettings;
    });
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Smartphone },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <tab.icon size={20} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}

              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors border-t"
              >
                <LogOut size={20} />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">
                      Profile Information
                    </h2>
                    <button className="text-blue-600 hover:text-blue-700 flex items-center space-x-1">
                      <Edit3 size={16} />
                      <span>Edit</span>
                    </button>
                  </div>

                  {/* Profile Picture */}
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="relative">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-2xl font-semibold">
                          {user?.user_metadata?.full_name
                            ?.charAt(0)
                            .toUpperCase() ||
                            user?.email?.charAt(0).toUpperCase() ||
                            "U"}
                        </span>
                      </div>
                      <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full hover:bg-blue-700">
                        <Camera size={16} />
                      </button>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {user?.user_metadata?.full_name || user?.email}
                      </h3>
                      <p className="text-gray-500">{user?.email}</p>
                    </div>
                  </div>

                  {/* Profile Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={settings.profile.fullName}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            profile: {
                              ...prev.profile,
                              fullName: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={settings.profile.phone}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            profile: { ...prev.profile, phone: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bio
                      </label>
                      <textarea
                        value={settings.profile.bio}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            profile: { ...prev.profile, bio: e.target.value },
                          }))
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-6">
                    Notification Preferences
                  </h2>

                  <div className="space-y-4">
                    {Object.entries(settings.notifications).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between py-2"
                        >
                          <div>
                            <p className="font-medium capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </p>
                            <p className="text-sm text-gray-500">
                              {key === "push" &&
                                "Receive push notifications on your device"}
                              {key === "email" &&
                                "Receive notifications via email"}
                              {key === "issueUpdates" &&
                                "Updates on issues you reported or commented on"}
                              {key === "newsAlerts" &&
                                "Breaking news and urgent announcements"}
                              {key === "pollReminders" &&
                                "Reminders to vote on active polls"}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleSetting("notifications", key)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              value ? "bg-blue-600" : "bg-gray-300"
                            }`}
                          >
                            <div
                              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                value ? "translate-x-7" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === "privacy" && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-6">
                    Privacy Settings
                  </h2>

                  <div className="space-y-4">
                    {Object.entries(settings.privacy).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between py-2"
                      >
                        <div>
                          <p className="font-medium capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </p>
                          <p className="text-sm text-gray-500">
                            {key === "profilePublic" &&
                              "Make your profile visible to other users"}
                            {key === "showLocation" &&
                              "Show your location in issue reports"}
                            {key === "analyticsOptIn" &&
                              "Help improve the app with usage analytics"}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleSetting("privacy", key)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            value ? "bg-blue-600" : "bg-gray-300"
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              value ? "translate-x-7" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === "appearance" && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-6">Appearance</h2>

                  <div className="space-y-6">
                    {/* Dark Mode */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {settings.appearance.darkMode ? (
                          <Moon size={20} />
                        ) : (
                          <Sun size={20} />
                        )}
                        <div>
                          <p className="font-medium">Dark Mode</p>
                          <p className="text-sm text-gray-500">
                            Switch between light and dark themes
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSetting("appearance", "darkMode")}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.appearance.darkMode
                            ? "bg-blue-600"
                            : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings.appearance.darkMode
                              ? "translate-x-7"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Language */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Globe size={20} />
                        <div>
                          <p className="font-medium">Language</p>
                          <p className="text-sm text-gray-500">
                            Choose your preferred language
                          </p>
                        </div>
                      </div>
                      <select
                        value={settings.appearance.language}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            appearance: {
                              ...prev.appearance,
                              language: e.target.value,
                            },
                          }))
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="px-6 py-4 bg-gray-50 border-t">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save size={16} />
                    <span>{saving ? "Saving..." : "Save Changes"}</span>
                  </button>
                  {saveSuccess && (
                    <span className="text-green-600 font-medium">
                      Settings saved successfully!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
