import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  PlusCircle,
  Image,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { uploadToCloudinary } from "../lib/cloudinary";

interface UserProfile {
  id: string;
  full_name: string;
  is_verified: boolean;
  role: string;
}

const NewsPost: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "announcement" as const,
    location: "",
    priority: "medium" as const,
    image: null as File | null,
  });

  const categories = [
    { value: "announcement", label: "Announcement" },
    { value: "policy", label: "Policy Update" },
    { value: "event", label: "Community Event" },
    { value: "emergency", label: "Emergency Alert" },
    { value: "development", label: "Development Project" },
    { value: "budget", label: "Budget & Finance" },
    { value: "services", label: "Public Services" },
    { value: "other", label: "Other" },
  ];

  const priorities = [
    { value: "low", label: "Low Priority" },
    { value: "medium", label: "Medium Priority" },
    { value: "high", label: "High Priority" },
  ];

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, is_verified, role")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !["government", "journalist"].includes(profile?.role || "")) {
      alert("Only government users and journalists can post news.");
      return;
    }

    setPosting(true);
    try {
      let imageUrl = "";

      // Upload image if provided
      if (formData.image) {
        imageUrl = await uploadToCloudinary(formData.image);
      }

      console.log("Posting news with data:", {
        title: formData.title,
        content: formData.content,
        category: formData.category,
        author_id: user.id,
        userRole: profile?.role,
      });

      // Create news post
      const { error } = await supabase.from("news").insert({
        title: formData.title,
        content: formData.content,
        category: formData.category,
        location: formData.location || null,
        priority: formData.priority,
        image_url: imageUrl || null,
        author_id: user.id,
        published: true,
        published_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Database error posting news:", error);
        throw error;
      }

      // Reset form
      setFormData({
        title: "",
        content: "",
        category: "announcement",
        location: "",
        priority: "medium",
        image: null,
      });

      // Clear file input
      const fileInput = document.getElementById(
        "image-upload"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      alert("News post published successfully!");
    } catch (error) {
      console.error("Error posting news:", error);
      alert("Failed to publish news post. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!["government", "journalist"].includes(profile?.role || "")) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            Access Required
          </h2>
          <p className="text-yellow-700 mb-4">
            Only government users and journalists can post news. This feature is
            restricted to verified government and journalist accounts to ensure
            official communication authenticity.
          </p>
          <a
            href="/verification"
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 inline-block"
          >
            Request Verification
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <PlusCircle className="w-8 h-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Create News Post
            </h1>
            <div className="flex items-center mt-1">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600 font-medium">
                Verified Publisher
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              News Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter a compelling news headline..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              maxLength={200}
            />
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Category *
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    category: e.target.value as any,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Priority
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: e.target.value as any,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {priorities.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              <MapPin className="w-4 h-4 inline mr-1" />
              Location (Optional)
            </label>
            <input
              type="text"
              id="location"
              value={formData.location}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, location: e.target.value }))
              }
              placeholder="e.g., Downtown Mumbai, Sector 5 Gurgaon..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Content */}
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              News Content *
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, content: e.target.value }))
              }
              placeholder="Write the full news content here. Be comprehensive and factual..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={8}
              required
              minLength={100}
            />
            <p className="text-sm text-gray-500 mt-1">
              Minimum 100 characters required. Current:{" "}
              {formData.content.length}
            </p>
          </div>

          {/* Image Upload */}
          <div>
            <label
              htmlFor="image-upload"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              <Image className="w-4 h-4 inline mr-1" />
              Featured Image (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Click to upload a featured image for your news post
                </p>
                <span className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-block">
                  Choose Image
                </span>
              </label>
              {formData.image && (
                <p className="text-sm text-green-600 mt-2">
                  Selected: {formData.image.name}
                </p>
              )}
            </div>
          </div>

          {/* Publishing Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Calendar className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-medium text-blue-900">
                Publishing Information
              </span>
            </div>
            <p className="text-sm text-blue-700">
              This news post will be published immediately and visible to all
              users. As a verified publisher, your content will be marked as
              authentic and trustworthy.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                posting ||
                !formData.title.trim() ||
                !formData.content.trim() ||
                formData.content.length < 100
              }
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {posting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Publishing...
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Publish News
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewsPost;
