import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./hooks/useAuth";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import NewsFeed from "./pages/NewsFeed";
import NewsReels from "./pages/NewsReels";
import Settings from "./pages/Settings";
import StoryViewer from "./pages/StoryViewer";
import Polls from "./pages/Polls";
import Profile from "./pages/Profile";
import IssueDetails from "./pages/IssueDetails";
import ReportIssue from "./pages/ReportIssue";
import Chatbot from "./pages/Chatbot";
import Login from "./pages/Login";
import GovernmentDashboard from "./pages/GovernmentDashboard";
import Analytics from "./pages/Analytics";
import VerificationCenter from "./components/VerificationCenter";
import AdminVerificationPanel from "./components/AdminVerificationPanel";
import NewsPost from "./components/NewsPost";
import CameraTest from "./components/CameraTest";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading JanMat...</p>
        </div>
      </div>
    );
  }

  return (
    <Router future={{ v7_startTransition: true }}>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/dashboard" replace />}
        />

        {/* Protected routes */}
        {user ? (
          <>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="news" element={<NewsFeed />} />
              <Route path="news-reels" element={<NewsReels />} />
              <Route path="polls" element={<Polls />} />
              <Route path="profile/:userId?" element={<Profile />} />
              <Route path="issues/:id" element={<IssueDetails />} />
              <Route path="report" element={<ReportIssue />} />
              <Route path="chatbot" element={<Chatbot />} />
              <Route path="settings" element={<Settings />} />
              <Route path="verification" element={<VerificationCenter />} />
              <Route path="post-news" element={<NewsPost />} />
              <Route path="government" element={<GovernmentDashboard />} />
              <Route
                path="admin-verification"
                element={<AdminVerificationPanel />}
              />
              <Route path="analytics" element={<Analytics />} />
              <Route path="camera-test" element={<CameraTest />} />
            </Route>
            {/* Story viewer outside layout for full-screen experience */}
            <Route path="story/:issueId" element={<StoryViewer />} />
          </>
        ) : (
          // Redirect unauthenticated users to login
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
