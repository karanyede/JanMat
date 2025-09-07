import { useState, useEffect } from "react";
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
} from "lucide-react";
import {
  uploadMultipleToCloudinary,
  compressImage,
} from "../lib/cloudinary";
import {
  validateIssue,
  isRateLimited,
  ValidationError,
} from "../lib/validation";
import { notifyGovernmentUsersOfNewIssue } from "../hooks/useNotifications";
import SimpleCameraCapture from "../components/SimpleCameraCapture";

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

  const [geotaggedPhotos, setGeotaggedPhotos] = useState<Array<{
    blob: Blob;
    location: { latitude: number; longitude: number; timestamp: string };
    preview: string;
    id: string;
  }>>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Debug camera modal state
  useEffect(() => {
    console.log("ReportIssue: showCamera changed to:", showCamera);
    if (showCamera) {
      console.log("ReportIssue: GeotagCamera should be mounting now");
    }
  }, [showCamera]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      geotaggedPhotos.forEach(photo => {
        URL.revokeObjectURL(photo.preview);
      });
    };
  }, [geotaggedPhotos]);

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

  const handleGeotagCapture = (imageBlob: Blob, location: { latitude: number; longitude: number; timestamp: string }) => {
    console.log("Photo captured with location:", location);
    console.log("Blob size:", imageBlob.size);
    
    const photo = {
      blob: imageBlob,
      location,
      preview: URL.createObjectURL(imageBlob),
      id: Date.now().toString() + Math.random(),
    };
    
    setGeotaggedPhotos(prev => {
      const updated = [...prev, photo];
      console.log("Total photos now:", updated.length);
      return updated;
    });
    
    // Auto-update location if not already set
    if (!formData.latitude || !formData.longitude) {
      console.log("Auto-updating form location");
      setFormData(prev => ({
        ...prev,
        latitude: location.latitude,
        longitude: location.longitude,
        location: prev.location || `GPS: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      }));
    }
    
    // Show success message
    alert(`📸 Photo captured successfully!\n📍 Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
  };

  const removeGeotaggedPhoto = (id: string) => {
    setGeotaggedPhotos(prev => {
      const photoToRemove = prev.find(p => p.id === id);
      if (photoToRemove) {
        URL.revokeObjectURL(photoToRemove.preview);
      }
      return prev.filter(p => p.id !== id);
    });
  };

  const validateForm = () => {
    // Check rate limiting
    if (isRateLimited("report_issue", 3, 60000)) {
      alert("Too many submissions. Please wait a minute before trying again.");
      return false;
    }

    // Location is now only available through geotagged photos
    const hasGeotaggedPhotos = geotaggedPhotos.length > 0;
    
    // Generate location string from geotagged photos
    const effectiveLocation = hasGeotaggedPhotos ? 
      `GPS: ${geotaggedPhotos[0].location.latitude.toFixed(6)}, ${geotaggedPhotos[0].location.longitude.toFixed(6)}` : 
      "";

    // Use comprehensive validation
    const validationResult = validateIssue({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
      location: effectiveLocation,
      image_urls: geotaggedPhotos.map((photo) => photo.id), // Just for count validation
    });

    // Custom validation that requires geotagged photos for location
    const newErrors: Record<string, string> = {};
    
    if (!validationResult.isValid) {
      validationResult.errors.forEach((error: ValidationError) => {
        // Skip location error if we have geotagged photos (which provide location)
        if (error.field === 'location' && hasGeotaggedPhotos) {
          return;
        }
        newErrors[error.field] = error.message;
      });
    }

    // Custom location validation - require geotagged photos
    if (!hasGeotaggedPhotos) {
      newErrors.location = "Please capture at least one geotagged photo to automatically provide your location.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const uploadImages = async (): Promise<string[]> => {
    if (geotaggedPhotos.length === 0) return [];

    setUploadingImages(true);
    try {
      // Convert blobs to files and compress them
      const files = await Promise.all(
        geotaggedPhotos.map(async (photo, index) => {
          const file = new File([photo.blob], `geotagged-photo-${index + 1}.jpg`, {
            type: 'image/jpeg',
          });
          return compressImage(file, 0.8);
        })
      );

      // Upload to Cloudinary
      const imageUrls = await uploadMultipleToCloudinary(files);
      
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

      // Determine coordinates for submission
      let submissionLatitude = formData.latitude;
      let submissionLongitude = formData.longitude;
      let submissionLocation = formData.location;

      // Use coordinates from first geotagged photo if form coordinates aren't set
      if ((!submissionLatitude || !submissionLongitude) && geotaggedPhotos.length > 0) {
        submissionLatitude = geotaggedPhotos[0].location.latitude;
        submissionLongitude = geotaggedPhotos[0].location.longitude;
      }

      // Make location mandatory for new issues
      if (!submissionLatitude || !submissionLongitude) {
        alert("Location is required for submitting an issue. Please enable location and try again.");
        setLoading(false);
        return;
      }

      // Generate location text if we have coordinates
      if (submissionLatitude && submissionLongitude && !submissionLocation.trim()) {
        submissionLocation = `GPS: ${submissionLatitude.toFixed(6)}, ${submissionLongitude.toFixed(6)}`;
      }

      // Create issue with image URLs
      const { data: issue, error: issueError } = await supabase
        .from("issues")
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          location: submissionLocation,
          latitude: submissionLatitude,
          longitude: submissionLongitude,
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

            {/* Location - Auto-captured from Photos Only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location * (Auto-captured from photos)
              </label>
              
              {/* Show GPS coordinates when photos are captured */}
              {geotaggedPhotos.length > 0 && (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>📍 GPS Location Auto-Captured</span>
                  </p>
                  <p className="text-xs text-green-600 mt-1 font-mono">
                    {geotaggedPhotos[0].location.latitude.toFixed(6)}, {geotaggedPhotos[0].location.longitude.toFixed(6)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    ✅ Location automatically captured from geotagged photos
                  </p>
                </div>
              )}
              
              {/* Show instruction when no photos captured */}
              {geotaggedPhotos.length === 0 && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>📸 Take a photo to automatically capture your location</span>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Your GPS location will be automatically captured when you take geotagged photos below
                  </p>
                </div>
              )}
              
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{errors.location}</p>
              )}
            </div>

            {/* Geotagged Photos - Required for Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos with GPS Location *
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Take photos to automatically capture your location and provide visual proof of the issue.
              </p>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      console.log("Opening geotag camera...");
                      setShowCamera(true);
                    }}
                    className="w-full flex flex-col items-center space-y-2 hover:bg-gray-50 transition-colors rounded-lg p-4"
                  >
                    <Camera className="w-8 h-8 text-gray-400" />
                    <div>
                      <span className="text-blue-600 hover:text-blue-700 font-medium">
                        📷 Capture Photos with GPS Location
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Photos will automatically include GPS location and timestamp
                    </p>
                    <div className="text-xs text-gray-400 space-y-1">
                      <p className="text-red-600 font-medium">Required: At least 1 photo needed</p>
                      <p>Maximum 4 photos • Location permissions required</p>
                      <p className="text-green-600 font-medium">
                        � Your location will be automatically captured from photos!
                      </p>
                    </div>
                    {geotaggedPhotos.length === 0 && (
                      <p className="text-xs text-orange-600 mt-2">
                        💡 Click here to start camera and take your first photo
                      </p>
                    )}
                  </button>
                  
                  {/* Debug info */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left">
                      <div><strong>Debug Info:</strong></div>
                      <div>Photos captured: {geotaggedPhotos.length}</div>
                      <div>Camera open: {showCamera ? 'Yes' : 'No'}</div>
                      <div>GPS Location: {formData.latitude && formData.longitude ? 
                        `${formData.latitude.toFixed(4)}, ${formData.longitude.toFixed(4)}` : 'Not set'}</div>
                    </div>
                  )}
                </div>

                {/* Geotagged Photos Preview */}
                {geotaggedPhotos.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">
                      Captured Photos ({geotaggedPhotos.length}/4)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {geotaggedPhotos.map((photo) => (
                        <div key={photo.id} className="relative bg-gray-50 rounded-lg p-3">
                          <div className="flex space-x-3">
                            <img
                              src={photo.preview}
                              alt="Geotagged"
                              className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-600 space-y-1">
                                <div className="flex items-center space-x-1">
                                  <MapPin className="w-3 h-3 text-green-600" />
                                  <span className="font-mono">
                                    {photo.location.latitude.toFixed(6)}, {photo.location.longitude.toFixed(6)}
                                  </span>
                                </div>
                                <div className="text-gray-500">
                                  📅 {new Date(photo.location.timestamp).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeGeotaggedPhoto(photo.id)}
                              className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors flex-shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
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
      
      {/* Simple Camera Capture Modal */}
      {showCamera && (
        <div key="simple-camera-wrapper">
          <SimpleCameraCapture
            key="simple-camera"
            onCapture={handleGeotagCapture}
            onClose={() => {
              console.log("ReportIssue: Closing camera");
              setShowCamera(false);
            }}
            maxPhotos={4}
          />
        </div>
      )}
    </div>
  );
};

export default ReportIssue;
