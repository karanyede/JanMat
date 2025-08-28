import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Shield,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

interface VerificationRequest {
  id: string;
  request_type:
    | "citizen_verification"
    | "journalist_verification"
    | "official_verification";
  documents: string[];
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  is_verified: boolean;
  verification_type?: string;
  verified_at?: string;
}

const VerificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    request_type: "citizen_verification" as const,
    reason: "",
    documents: [] as File[],
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchVerificationRequests();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      console.log("Fetching profile for user:", user?.id);

      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, is_verified, verification_type, verified_at")
        .eq("id", user?.id)
        .single();

      if (error) {
        console.error("Profile fetch error:", error);

        // If user doesn't exist, create profile
        if (error.code === "PGRST116") {
          console.log("User profile not found, creating...");
          await createUserProfile();
          return;
        }
        throw error;
      }

      console.log("Profile fetched successfully:", data);
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const createUserProfile = async () => {
    try {
      console.log("Creating user profile for:", user?.id);

      const { data, error } = await supabase
        .from("users")
        .insert({
          id: user?.id,
          email: user?.email,
          full_name:
            user?.user_metadata?.full_name ||
            user?.email?.split("@")[0] ||
            "User",
          role: "citizen",
          is_verified: false,
          is_public: true,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating profile:", error);
        return;
      }

      console.log("Profile created successfully:", data);
      setProfile(data);
    } catch (error) {
      console.error("Error in createUserProfile:", error);
    }
  };

  const fetchVerificationRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching verification requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    setFormData((prev) => ({ ...prev, documents: fileArray }));
  };

  const submitVerificationRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!profile) {
      alert(
        "Please wait for your profile to load before submitting a request."
      );
      return;
    }

    setUploading(true);
    try {
      console.log("Submitting verification request for user:", user.id);
      console.log("Profile exists:", profile);

      // Upload documents to Supabase Storage
      const documentUrls: string[] = [];
      for (const file of formData.documents) {
        console.log("Uploading file:", file.name);

        // Create organized file path with user ID
        const fileName = `${user.id}/${Date.now()}-${file.name}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("documents")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error(
            `Failed to upload ${file.name}: ${uploadError.message}`
          );
        }

        console.log("File uploaded successfully:", uploadData);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("documents")
          .getPublicUrl(uploadData.path);

        documentUrls.push(urlData.publicUrl);
      }

      console.log("Documents uploaded:", documentUrls);

      // Create verification request
      const { data, error } = await supabase
        .from("verification_requests")
        .insert({
          user_id: user.id,
          request_type: formData.request_type,
          reason: formData.reason,
          documents: documentUrls,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Verification request error:", error);
        throw error;
      }

      console.log("Verification request submitted successfully:", data);

      // Reset form and refresh data
      setFormData({
        request_type: "citizen_verification",
        reason: "",
        documents: [],
      });
      setShowRequestForm(false);
      await fetchVerificationRequests();

      alert("Verification request submitted successfully!");
    } catch (error: any) {
      console.error("Error submitting verification request:", error);

      let errorMessage = "Failed to submit verification request. ";
      if (error?.code === "23503") {
        errorMessage +=
          "Your profile is not properly set up. Please refresh the page and try again.";
      } else {
        errorMessage += "Please try again.";
      }

      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center mb-4">
          <Shield className="w-8 h-8 text-blue-600 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">
            Verification Center
          </h1>
        </div>

        {/* Current Verification Status */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">
            Your Verification Status
          </h2>

          {profile?.is_verified ? (
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-6 h-6 mr-2" />
              <div>
                <p className="font-medium">Verified Account</p>
                <p className="text-sm text-gray-600">
                  Verified on{" "}
                  {new Date(profile.verified_at!).toLocaleDateString()}
                  {profile.verification_type &&
                    ` • Type: ${profile.verification_type}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center text-gray-600">
              <AlertCircle className="w-6 h-6 mr-2" />
              <div>
                <p className="font-medium">Unverified Account</p>
                <p className="text-sm">
                  Submit a verification request to post news and gain trusted
                  user benefits.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Request New Verification Button */}
        {!profile?.is_verified && (
          <button
            onClick={() => setShowRequestForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors mb-6"
          >
            Request Verification
          </button>
        )}

        {/* Verification Request Form */}
        {showRequestForm && (
          <div className="border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              Submit Verification Request
            </h3>

            <form onSubmit={submitVerificationRequest}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Type
                </label>
                <select
                  value={formData.request_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      request_type: e.target.value as any,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="citizen_verification">
                    Citizen Verification
                  </option>
                  <option value="journalist_verification">
                    Journalist/Media Verification
                  </option>
                  <option value="official_verification">
                    Official/Organization Verification
                  </option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Verification
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="Explain why you need verification and how you contribute to the community..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supporting Documents
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Upload ID, certificates, or other supporting documents
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) =>
                      e.target.files && handleFileUpload(e.target.files)
                    }
                    className="hidden"
                    id="documents"
                  />
                  <label
                    htmlFor="documents"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer inline-block"
                  >
                    Choose Files
                  </label>
                  {formData.documents.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      {formData.documents.length} file(s) selected
                    </p>
                  )}
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={uploading || !formData.reason.trim()}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "Submitting..." : "Submit Request"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Verification History */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Verification History</h3>

          {requests.length === 0 ? (
            <p className="text-gray-600">No verification requests yet.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      {getStatusIcon(request.status)}
                      <span className="ml-2 font-medium capitalize">
                        {request.request_type.replace("_", " ")}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}
                    >
                      {request.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-2">{request.reason}</p>

                  {request.documents.length > 0 && (
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <FileText className="w-4 h-4 mr-1" />
                      {request.documents.length} document(s) attached
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    Submitted on{" "}
                    {new Date(request.created_at).toLocaleDateString()}
                  </p>

                  {request.review_notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                      <p className="text-sm font-medium">Review Notes:</p>
                      <p className="text-sm text-gray-600">
                        {request.review_notes}
                      </p>
                    </div>
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

export default VerificationCenter;
