import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import StoryUploadModal from "./StoryUploadModal";

interface Story {
  id: string;
  image_url: string;
  caption: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  viewed_by: string[];
  users: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

const StoryCarousel = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchActiveStories();
    }
  }, [user]);

  const fetchActiveStories = async () => {
    try {
      const { data, error } = await supabase
        .from("stories")
        .select(
          `
          *,
          users!user_id (
            id,
            full_name,
            avatar_url
          )
        `
        )
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching stories:", error);
      } else {
        setStories(data || []);
      }
    } catch (error) {
      console.error("Error fetching stories:", error);
    }
  };

  const hasViewedStory = (story: Story) => {
    return story.viewed_by.includes(user?.id || "");
  };

  return (
    <>
      <div className="py-4">
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide px-4">
          {/* Add story button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex-shrink-0 flex flex-col items-center space-y-1"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
              <Plus size={24} className="text-white" />
            </div>
            <p className="text-xs text-gray-600 font-medium">Add Story</p>
          </button>

          {/* Active stories */}
          {stories.map((story) => (
            <Link
              key={story.id}
              to={`/story/${story.id}`}
              className="flex-shrink-0 flex flex-col items-center space-y-1"
            >
              <div className="relative">
                <div
                  className={`w-16 h-16 rounded-full p-0.5 ${
                    hasViewedStory(story)
                      ? "border-2 border-gray-300"
                      : "bg-gradient-to-r from-pink-500 to-orange-500"
                  }`}
                >
                  <div
                    className="w-full h-full rounded-full bg-cover bg-center border-2 border-white"
                    style={{
                      backgroundImage: `url(${story.image_url})`,
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-600 font-medium max-w-16 truncate">
                {story.users?.full_name?.split(" ")[0] || "Anonymous"}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Story Upload Modal */}
      <StoryUploadModal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          fetchActiveStories(); // Refresh stories after upload
        }}
      />
    </>
  );
};

export default StoryCarousel;
