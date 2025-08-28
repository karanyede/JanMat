import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { User, Issue } from "../types";
import LoadingSpinner from "../components/LoadingSpinner";
import EditProfileModal from "../components/EditProfileModal";
import FollowersModal from "../components/FollowersModal";
import {
  Settings,
  Calendar,
  MapPin,
  Grid,
  Bookmark,
  Edit,
  UserPlus,
  UserCheck,
  Phone,
  Mail,
  BadgeCheck,
} from "lucide-react";
import { formatRelativeTime } from "../lib/utils";

const Profile = () => {
  const { user: currentUser } = useAuth();
  const { userId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [userIssues, setUserIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"issues" | "saved">("issues");
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalType, setFollowersModalType] = useState<
    "followers" | "following"
  >("followers");

  const isOwnProfile = !userId || userId === currentUser?.id;
  const profileUserId = userId || currentUser?.id;

  const fetchUserData = async () => {
    if (!profileUserId) return;

    try {
      setError(null);

      if (isOwnProfile && currentUser) {
        // For own profile, use auth user data and try to get additional info from users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", profileUserId)
          .single();

        if (userError && userError.code !== "PGRST116") {
          console.error("Error fetching user:", userError);
        }

        // Create user object from auth data with database data overlay
        const userProfile: User = {
          id: currentUser.id,
          email: currentUser.email || "",
          full_name:
            userData?.full_name ||
            currentUser.user_metadata?.full_name ||
            currentUser.email?.split("@")[0] ||
            "",
          role: userData?.role || "citizen",
          phone: userData?.phone || currentUser.user_metadata?.phone || "",
          address: userData?.address || "",
          avatar_url:
            userData?.avatar_url || currentUser.user_metadata?.avatar_url || "",
          bio: userData?.bio || "",
          is_public:
            userData?.is_public !== undefined ? userData.is_public : true,
          followers: userData?.followers || [],
          following: userData?.following || [],
          created_at: userData?.created_at || currentUser.created_at,
          updated_at:
            userData?.updated_at ||
            currentUser.updated_at ||
            currentUser.created_at,
        };

        setUser(userProfile);
      } else {
        // For other users, fetch from users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", profileUserId)
          .single();

        if (userError) {
          console.error("Error fetching user:", userError);
          setError("Profile not found");
          return;
        }

        setUser(userData);
      }

      // Fetch user's issues
      const { data: issuesData, error: issuesError } = await supabase
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
        .eq("reporter_id", profileUserId)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(12);

      if (issuesError) {
        console.error("Error fetching user issues:", issuesError);
      } else {
        setUserIssues(issuesData || []);
      }
    } catch (err) {
      console.error("Error fetching profile data:", err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  // Check if current user is following this profile
  useEffect(() => {
    if (currentUser && user && !isOwnProfile) {
      // Check from database instead of auth metadata
      const checkFollowStatus = async () => {
        try {
          const { data: currentUserData } = await supabase
            .from("users")
            .select("following")
            .eq("id", currentUser.id)
            .single();

          setIsFollowing(
            currentUserData?.following?.includes(user.id) || false
          );
        } catch (error) {
          console.error("Error checking follow status:", error);
          setIsFollowing(false);
        }
      };

      checkFollowStatus();
    }
  }, [currentUser, user, isOwnProfile]);

  const handleFollow = async () => {
    if (!currentUser || !user || isOwnProfile) return;

    setFollowLoading(true);
    try {
      // Get current data from database
      const { data: currentUserData } = await supabase
        .from("users")
        .select("following")
        .eq("id", currentUser.id)
        .single();

      const currentFollowing = currentUserData?.following || [];
      const userFollowers = user.followers || [];

      let newFollowing;
      let newFollowers;

      if (isFollowing) {
        // Unfollow
        newFollowing = currentFollowing.filter((id: string) => id !== user.id);
        newFollowers = userFollowers.filter((id) => id !== currentUser.id);
      } else {
        // Follow
        newFollowing = [...currentFollowing, user.id];
        newFollowers = [...userFollowers, currentUser.id];
      }

      // Update current user's following list
      const { error: currentUserError } = await supabase
        .from("users")
        .update({ following: newFollowing })
        .eq("id", currentUser.id);

      // Update target user's followers list
      const { error: targetUserError } = await supabase
        .from("users")
        .update({ followers: newFollowers })
        .eq("id", user.id);

      if (currentUserError || targetUserError) {
        throw currentUserError || targetUserError;
      }

      setIsFollowing(!isFollowing);
      setUser({ ...user, followers: newFollowers });
    } catch (error) {
      console.error("Error updating follow status:", error);
      alert("Failed to update follow status. Please try again.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleProfileUpdate = () => {
    fetchUserData(); // Refresh profile data
  };

  useEffect(() => {
    fetchUserData();
  }, [profileUserId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !user) {
    return (
      <div className="w-full">
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Profile not found
          </h3>
          <p className="text-gray-500">
            The user profile you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Profile Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto">
          {/* Mobile Header */}
          <div className="md:hidden px-4 py-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-20 h-20 rounded-full ring-2 ring-white overflow-hidden">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-pink-500 to-orange-500 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">
                      {user.full_name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-semibold text-gray-900">
                    {user.full_name}
                  </h1>
                  {(user.role === "government" ||
                    user.role === "journalist") && (
                    <div
                      title={`Verified ${user.role === "government" ? "Government Official" : "Journalist"}`}
                    >
                      <BadgeCheck className="w-5 h-5 text-blue-500" />
                    </div>
                  )}
                </div>
                <p className="text-gray-600 text-sm">
                  {user.bio || "Community member"}
                </p>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                    user.role === "government"
                      ? "bg-blue-100 text-blue-800"
                      : user.role === "journalist"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {user.role === "government"
                    ? "Verified Government Official"
                    : user.role === "journalist"
                      ? "Verified Journalist"
                      : "Citizen"}
                </span>
              </div>
              {isOwnProfile ? (
                <div className="flex space-x-2">
                  <button
                    onClick={handleEditProfile}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Edit Profile"
                  >
                    <Edit size={20} className="text-gray-600" />
                  </button>
                  <Link
                    to="/settings"
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Settings"
                  >
                    <Settings size={20} className="text-gray-600" />
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isFollowing
                      ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  } disabled:opacity-50`}
                >
                  {followLoading ? (
                    "..."
                  ) : isFollowing ? (
                    <>
                      <UserCheck size={16} className="inline mr-1" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} className="inline mr-1" />
                      Follow
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="flex justify-around py-4 border-t border-gray-100">
              <div className="text-center">
                <div className="font-semibold text-lg text-gray-900">
                  {userIssues.length}
                </div>
                <div className="text-sm text-gray-600">Issues</div>
              </div>
              <button
                className="text-center hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
                onClick={() => {
                  setFollowersModalType("followers");
                  setShowFollowersModal(true);
                }}
              >
                <div className="font-semibold text-lg text-gray-900">
                  {user.followers?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Followers</div>
              </button>
              <button
                className="text-center hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
                onClick={() => {
                  setFollowersModalType("following");
                  setShowFollowersModal(true);
                }}
              >
                <div className="font-semibold text-lg text-gray-900">
                  {user.following?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Following</div>
              </button>
            </div>

            {/* Bio and Details */}
            <div className="space-y-2">
              {user.bio && <p className="text-sm text-gray-700">{user.bio}</p>}
              {user.address && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin size={14} className="mr-2" />
                  <span>{user.address}</span>
                </div>
              )}
              {user.phone && (isOwnProfile || user.is_public) && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone size={14} className="mr-2" />
                  <a href={`tel:${user.phone}`} className="hover:text-blue-600">
                    {user.phone}
                  </a>
                </div>
              )}
              {user.email && (isOwnProfile || user.is_public) && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail size={14} className="mr-2" />
                  <a
                    href={`mailto:${user.email}`}
                    className="hover:text-blue-600"
                  >
                    {user.email}
                  </a>
                </div>
              )}
              <div className="flex items-center text-sm text-gray-600">
                <Calendar size={14} className="mr-2" />
                <span>Joined {formatRelativeTime(user.created_at)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              {isOwnProfile ? (
                <button className="flex-1 bg-gray-100 text-gray-900 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                  Edit Profile
                </button>
              ) : (
                <>
                  <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Follow
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block px-6 py-12">
            <div className="flex items-start space-x-12">
              <div className="w-32 h-32 rounded-full ring-4 ring-white overflow-hidden">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-pink-500 to-orange-500 flex items-center justify-center">
                    <span className="text-white font-bold text-3xl">
                      {user.full_name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center space-x-6 mb-6">
                  <h1 className="text-2xl font-light text-gray-900">
                    {user.full_name}
                  </h1>
                  {isOwnProfile ? (
                    <>
                      <button
                        onClick={handleEditProfile}
                        className="bg-gray-100 text-gray-900 py-1.5 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        Edit Profile
                      </button>
                      <Link
                        to="/settings"
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Settings"
                      >
                        <Settings size={20} className="text-gray-600" />
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={`py-1.5 px-6 rounded-lg font-medium transition-colors ${
                          isFollowing
                            ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        } disabled:opacity-50`}
                      >
                        {followLoading
                          ? "Loading..."
                          : isFollowing
                            ? "Following"
                            : "Follow"}
                      </button>
                    </>
                  )}
                </div>

                {/* Stats */}
                <div className="flex space-x-8 mb-6">
                  <div>
                    <span className="font-semibold text-gray-900">
                      {userIssues.length}
                    </span>
                    <span className="text-gray-600 ml-1">issues</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">
                      {user.followers?.length || 0}
                    </span>
                    <span className="text-gray-600 ml-1">followers</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">
                      {user.following?.length || 0}
                    </span>
                    <span className="text-gray-600 ml-1">following</span>
                  </div>
                </div>

                {/* Bio and Details */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">
                      {user.full_name}
                    </span>
                    {(user.role === "government" ||
                      user.role === "journalist") && (
                      <div
                        title={`Verified ${user.role === "government" ? "Government Official" : "Journalist"}`}
                      >
                        <BadgeCheck className="w-4 h-4 text-blue-500" />
                      </div>
                    )}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === "government"
                          ? "bg-blue-100 text-blue-800"
                          : user.role === "journalist"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {user.role === "government"
                        ? "Verified Government Official"
                        : user.role === "journalist"
                          ? "Verified Journalist"
                          : "Citizen"}
                    </span>
                  </div>
                  {user.bio && <p className="text-gray-900">{user.bio}</p>}
                  {user.address && (
                    <div className="flex items-center text-gray-600">
                      <MapPin size={16} className="mr-2" />
                      <span>{user.address}</span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-600">
                    <Calendar size={16} className="mr-2" />
                    <span>Joined {formatRelativeTime(user.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-4xl mx-auto">
        <div className="border-b border-gray-200">
          <div className="flex justify-center">
            <button
              onClick={() => setActiveTab("issues")}
              className={`flex items-center space-x-2 px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === "issues"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Grid size={16} />
              <span className="hidden md:inline">ISSUES</span>
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab("saved")}
                className={`flex items-center space-x-2 px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === "saved"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Bookmark size={16} />
                <span className="hidden md:inline">SAVED</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="p-0 md:p-6">
          {activeTab === "issues" && (
            <div>
              {userIssues.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Grid className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No issues yet
                  </h3>
                  <p className="text-gray-500">
                    {isOwnProfile
                      ? "Start by reporting your first issue"
                      : "This user hasn't reported any issues yet"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 md:gap-4">
                  {userIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-pointer"
                    >
                      {issue.image_urls && issue.image_urls.length > 0 ? (
                        <img
                          src={issue.image_urls[0]}
                          alt={issue.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <div className="text-center p-2">
                            <div className="text-xs font-medium text-gray-600 mb-1">
                              {issue.category.toUpperCase()}
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-2">
                              {issue.title}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "saved" && isOwnProfile && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Bookmark className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No saved issues
              </h3>
              <p className="text-gray-500">
                Save issues you want to follow up on
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        user={user}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdate={handleProfileUpdate}
      />

      {/* Followers/Following Modal */}
      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        userId={user.id}
        type={followersModalType}
        title={followersModalType === "followers" ? "Followers" : "Following"}
      />
    </div>
  );
};

export default Profile;
