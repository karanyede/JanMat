import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { IssueCategory, IssuePriority } from "../types";
import {
  Camera,
  MapPin,
  AlertCircle,
  CheckCircle,
  X,
  Upload,
} from "lucide-react";
import {
  uploadMultipleToCloudinary,
  validateImageFile,
  compressImage,
} from "../lib/cloudinary";
import {
  validateIssue,
  isRateLimited,
  ValidationError,
} from "../lib/validation";
import { notifyGovernmentUsersOfNewIssue } from "../hooks/useNotifications";

const ReportIssue = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other" as IssueCategory,
    priority: "medium" as IssuePriority,
    location: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const [images, setImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories: { value: IssueCategory; label: string; icon: string }[] = [
    { value: "infrastructure", label: "Infrastructure", icon: "🏗️" },
    { value: "sanitation", label: "Sanitation", icon: "🧹" },
    { value: "transportation", label: "Transportation", icon: "🚗" },
    { value: "safety", label: "Safety", icon: "🚨" },
    { value: "environment", label: "Environment", icon: "🌱" },
    { value: "utilities", label: "Utilities", icon: "⚡" },
    { value: "healthcare", label: "Healthcare", icon: "🏥" },
    { value: "education", label: "Education", icon: "📚" },
    { value: "other", label: "Other", icon: "📝" },
  ];

  const priorities: { value: IssuePriority; label: string; color: string }[] = [
    { value: "low", label: "Low", color: "bg-gray-100 text-gray-600" },
    { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-600" },
    { value: "high", label: "High", color: "bg-orange-100 text-orange-600" },
    { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-600" },
  ];

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            location: prev.location || "Current Location",
          }));
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get your location. Please enter it manually.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate files
    for (const file of files) {
      try {
        validateImageFile(file);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Invalid file");
        return;
      }
    }

    if (images.length + files.length > 4) {
      alert("You can upload a maximum of 4 images.");
      return;
    }

    setImages((prev) => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    // Check rate limiting
    if (isRateLimited("report_issue", 3, 60000)) {
      alert("Too many submissions. Please wait a minute before trying again.");
      return false;
    }

    // Use comprehensive validation
    const validationResult = validateIssue({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
      location: formData.location,
      image_urls: images.map((img) => img.name), // Just for count validation
    });

    if (!validationResult.isValid) {
      // Convert validation errors to the expected format
      const newErrors: Record<string, string> = {};
      validationResult.errors.forEach((error: ValidationError) => {
        newErrors[error.field] = error.message;
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];

    setUploadingImages(true);
    try {
      // Compress images before upload
      const compressedImages = await Promise.all(
        images.map((file) => compressImage(file, 0.8))
      );

      // Upload to Cloudinary
      const imageUrls = await uploadMultipleToCloudinary(compressedImages);
      return imageUrls;
    } catch (error) {
      console.error("Error uploading images:", error);
      throw new Error("Failed to upload images. Please try again.");
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!user) {
      alert("You must be logged in to report an issue.");
      return;
    }

    setLoading(true);

    try {
      // Upload images first
      const imageUrls = await uploadImages();

      // Create issue with image URLs
      const { data: issue, error: issueError } = await supabase
        .from("issues")
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          location: formData.location,
          latitude: formData.latitude,
          longitude: formData.longitude,
          status: "submitted",
          reporter_id: user.id,
          is_public: true,
          upvotes: 0,
          downvotes: 0,
          upvoted_by: [],
          downvoted_by: [],
          image_urls: imageUrls,
        })
        .select()
        .single();

      if (issueError) {
        console.error("Error creating issue:", issueError);
        alert(`Failed to submit issue: ${issueError.message}`);
        return;
      }

      // Notify government users about the new issue
      if (issue) {
        await notifyGovernmentUsersOfNewIssue(
          issue.id,
          formData.title,
          formData.category
        );
      }

      setSubmitted(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error submitting issue:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to submit issue. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Issue Reported Successfully!
          </h2>
          <p className="text-gray-600 mb-6">
            Thank you for reporting this issue. We'll review it and get back to
            you soon.
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full animate-pulse"></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Report an Issue
                </h1>
                <p className="text-gray-600">
                  Help improve your community by reporting local issues
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateFormData("title", e.target.value)}
                placeholder="Brief description of the issue"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
                placeholder="Provide detailed information about the issue"
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  errors.description ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Category and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => updateFormData("category", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.icon} {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => updateFormData("priority", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => updateFormData("location", e.target.value)}
                  placeholder="Enter location or address"
                  className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.location ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="px-4 py-3 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <MapPin className="w-5 h-5" />
                </button>
              </div>
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{errors.location}</p>
              )}
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos (Optional)
              </label>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center space-y-2"
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <div>
                      <span className="text-blue-600 hover:text-blue-700 font-medium">
                        Click to upload
                      </span>{" "}
                      <span className="text-gray-500">or drag and drop</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      PNG, JPG, WebP up to 10MB (max 4 images)
                    </p>
                  </label>
                </div>

                {/* Image Preview */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploadingImages}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {loading || uploadingImages ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>
                      {uploadingImages ? "Uploading..." : "Submitting..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    <span>Report Issue</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportIssue;
