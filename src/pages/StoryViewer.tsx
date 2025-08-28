import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import LoadingSpinner from "../components/LoadingSpinner";
import { X, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { formatRelativeTime } from "../lib/utils";

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

const StoryViewer = () => {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchStories();
  }, []);

  useEffect(() => {
    if (issueId && stories.length > 0) {
      const index = stories.findIndex((story) => story.id === issueId);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [issueId, stories]);

  // Auto-advance story
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + 1; // 1% per 50ms = 5 seconds total
      });
    }, 50);

    return () => clearInterval(timer);
  }, [isPlaying, currentIndex]);

  const fetchStories = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      navigate(-1); // Go back when finished
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleClose = () => {
    navigate(-1);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (stories.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-xl font-semibold mb-2">No Stories Available</h2>
          <button
            onClick={handleClose}
            className="text-blue-400 hover:text-blue-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentStory = stories[currentIndex];

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden">
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 z-20 flex space-x-1">
        {stories.map((_, index) => (
          <div
            key={index}
            className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-white transition-all"
              style={{
                width:
                  index < currentIndex
                    ? "100%"
                    : index === currentIndex
                      ? `${progress}%`
                      : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between text-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            {currentStory.users?.avatar_url ? (
              <img
                src={currentStory.users.avatar_url}
                alt={currentStory.users.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-pink-500 to-orange-500 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {currentStory.users?.full_name?.charAt(0).toUpperCase() ||
                    "U"}
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold">
              {currentStory.users?.full_name || "Anonymous"}
            </p>
            <p className="text-sm opacity-75">
              {formatRelativeTime(currentStory.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={togglePlayPause}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Navigation areas */}
      <button
        onClick={goToPrevious}
        className="absolute left-0 top-0 bottom-0 w-1/3 z-10 flex items-center justify-start pl-4"
        disabled={currentIndex === 0}
      >
        {currentIndex > 0 && (
          <ChevronLeft size={32} className="text-white/70 hover:text-white" />
        )}
      </button>

      <button
        onClick={goToNext}
        className="absolute right-0 top-0 bottom-0 w-1/3 z-10 flex items-center justify-end pr-4"
      >
        <ChevronRight size={32} className="text-white/70 hover:text-white" />
      </button>

      {/* Content */}
      <div className="relative h-full w-full">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${currentStory.image_url})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
        </div>

        {/* Story content */}
        <div className="absolute bottom-4 left-4 right-4 text-white z-10">
          {currentStory.caption && (
            <p className="text-lg font-medium mb-4 leading-relaxed">
              {currentStory.caption}
            </p>
          )}
        </div>

        {/* Story counter */}
        <div className="absolute bottom-4 right-4 text-white/70 text-sm">
          {currentIndex + 1} of {stories.length}
        </div>
      </div>
    </div>
  );
};

export default StoryViewer;
