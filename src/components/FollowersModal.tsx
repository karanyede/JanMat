import { useState, useEffect } from "react";
import { X, UserCheck, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { User } from "../types";
import { useAuth } from "../hooks/useAuth";

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: "followers" | "following";
  title: string;
}

const FollowersModal = ({
  isOpen,
  onClose,
  userId,
  type,
  title,
}: FollowersModalProps) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [followStates, setFollowStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, userId, type]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // First get the user to access their followers/following arrays
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("followers, following")
        .eq("id", userId)
        .single();

      if (userError) {
        console.error("Error fetching user data:", userError);
        return;
      }

      const userIds =
        type === "followers" ? userData.followers : userData.following;

      if (userIds && userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select(
            "id, full_name, email, role, avatar_url, bio, is_public, followers, following, created_at, updated_at"
          )
          .in("id", userIds);

        if (usersError) {
          console.error("Error fetching users:", usersError);
          return;
        }

        setUsers(usersData || []);

        // Set initial follow states
        if (currentUser) {
          const currentFollowing = currentUser.user_metadata?.following || [];
          const states: Record<string, boolean> = {};
          usersData?.forEach((user) => {
            states[user.id] = currentFollowing.includes(user.id);
          });
          setFollowStates(states);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!currentUser) return;

    try {
      const isCurrentlyFollowing = followStates[targetUserId];
      const currentFollowing = currentUser.user_metadata?.following || [];

      let newFollowing;
      if (isCurrentlyFollowing) {
        newFollowing = currentFollowing.filter(
          (id: string) => id !== targetUserId
        );
      } else {
        newFollowing = [...currentFollowing, targetUserId];
      }

      // Update current user's following list
      const { error: updateError } = await supabase.auth.updateUser({
        data: { following: newFollowing },
      });

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setFollowStates((prev) => ({
        ...prev,
        [targetUserId]: !isCurrentlyFollowing,
      }));
    } catch (error) {
      console.error("Error updating follow status:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[70vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-96">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No {type} yet</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between"
                >
                  <Link
                    to={`/profile/${user.id}`}
                    onClick={onClose}
                    className="flex items-center space-x-3 flex-1 hover:bg-gray-50 rounded-lg p-2 -m-2"
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-medium text-sm">
                          {user.full_name?.charAt(0).toUpperCase() ||
                            user.email?.charAt(0).toUpperCase() ||
                            "U"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {user.full_name || user.email?.split("@")[0]}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {user.role || "Community member"}
                      </p>
                    </div>
                  </Link>

                  {currentUser && user.id !== currentUser.id && (
                    <button
                      onClick={() => handleFollow(user.id)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        followStates[user.id]
                          ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {followStates[user.id] ? (
                        <>
                          <UserCheck size={14} className="inline mr-1" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} className="inline mr-1" />
                          Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowersModal;
