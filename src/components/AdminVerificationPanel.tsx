import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Shield,
  Eye,
  Check,
  X,
  FileText,
  User,
  Calendar,
  AlertTriangle,
} from "lucide-react";

interface VerificationRequest {
  id: string;
  user_id: string;
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
  user: {
    full_name: string;
    email: string;
    role: string;
  };
}

const AdminVerificationPanel: React.FC = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] =
    useState<VerificationRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");

  useEffect(() => {
    fetchVerificationRequests();
  }, [filter]);

  const fetchVerificationRequests = async () => {
    try {
      let query = supabase
        .from("verification_requests")
        .select(
          `
          *,
          user:users!user_id (
            full_name,
            email,
            role
          )
        `
        )
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching verification requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.rpc("approve_verification", {
        request_id: requestId,
        notes: reviewNotes || "Approved by administrator",
      });

      if (error) throw error;

      alert("Verification request approved successfully!");
      setSelectedRequest(null);
      setReviewNotes("");
      await fetchVerificationRequests();
    } catch (error) {
      console.error("Error approving verification:", error);
      alert("Failed to approve verification request.");
    }
  };

  const rejectRequest = async (requestId: string) => {
    if (!reviewNotes.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }

    try {
      const { error } = await supabase.rpc("reject_verification", {
        request_id: requestId,
        notes: reviewNotes,
      });

      if (error) throw error;

      alert("Verification request rejected.");
      setSelectedRequest(null);
      setReviewNotes("");
      await fetchVerificationRequests();
    } catch (error) {
      console.error("Error rejecting verification:", error);
      alert("Failed to reject verification request.");
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case "citizen_verification":
        return "bg-blue-100 text-blue-800";
      case "journalist_verification":
        return "bg-purple-100 text-purple-800";
      case "official_verification":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">
              Verification Management
            </h1>
          </div>

          <div className="flex space-x-2">
            {(["all", "pending", "approved", "rejected"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                    filter === status
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {status}
                  {status === "pending" && (
                    <span className="ml-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {requests.filter((r) => r.status === "pending").length}
                    </span>
                  )}
                </button>
              )
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-yellow-600 mr-2" />
              <div>
                <p className="text-sm text-yellow-600 font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {requests.filter((r) => r.status === "pending").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm text-green-600 font-medium">Approved</p>
                <p className="text-2xl font-bold text-green-900">
                  {requests.filter((r) => r.status === "approved").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <X className="w-5 h-5 text-red-600 mr-2" />
              <div>
                <p className="text-sm text-red-600 font-medium">Rejected</p>
                <p className="text-2xl font-bold text-red-900">
                  {requests.filter((r) => r.status === "rejected").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <User className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm text-blue-600 font-medium">Total</p>
                <p className="text-2xl font-bold text-blue-900">
                  {requests.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No verification requests found.</p>
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {request.user.full_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {request.user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(request.request_type)}`}
                    >
                      {request.request_type.replace("_", " ").toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}
                    >
                      {request.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <p className="text-gray-700 mb-3">{request.reason}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>
                      Submitted:{" "}
                      {new Date(request.created_at).toLocaleDateString()}
                    </span>
                    {request.documents.length > 0 && (
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-1" />
                        {request.documents.length} document(s)
                      </div>
                    )}
                  </div>

                  {request.status === "pending" && (
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="flex items-center bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </button>
                  )}
                </div>

                {request.review_notes && (
                  <div className="mt-3 p-2 bg-gray-100 rounded">
                    <p className="text-sm font-medium">Review Notes:</p>
                    <p className="text-sm text-gray-600">
                      {request.review_notes}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                Review Verification Request
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User
                  </label>
                  <p className="text-gray-900">
                    {selectedRequest.user.full_name} (
                    {selectedRequest.user.email})
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Request Type
                  </label>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(selectedRequest.request_type)}`}
                  >
                    {selectedRequest.request_type
                      .replace("_", " ")
                      .toUpperCase()}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <p className="text-gray-900">{selectedRequest.reason}</p>
                </div>

                {selectedRequest.documents.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Documents
                    </label>
                    <div className="space-y-2">
                      {selectedRequest.documents.map((doc, index) => (
                        <a
                          key={index}
                          href={doc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Document {index + 1} - View
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Notes
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes for your review decision..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => approveRequest(selectedRequest.id)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </button>
                <button
                  onClick={() => rejectRequest(selectedRequest.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </button>
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setReviewNotes("");
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVerificationPanel;
