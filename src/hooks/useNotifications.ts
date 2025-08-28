import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  issue_id?: string;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const unsubscribe = subscribeToNotifications();
      return unsubscribe; // Cleanup subscription
    } else {
      // Clear notifications when user logs out
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?.id]); // Only depend on user.id to prevent unnecessary re-renders

  const fetchNotifications = async () => {
    // Client-side validation: ensure user is authenticated
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // For now, skip database calls and use dummy data until notifications table is properly configured
      let notificationsData: any[] = [];

      // TODO: Enable database notifications when backend is ready
      // Database calls commented out to prevent network errors
      /*
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.warn("Notifications table not available, using dummy data:", error.message);
          notificationsData = [];
        } else {
          notificationsData = data || [];
        }
      } catch (dbError) {
        console.warn("Database error for notifications, using dummy data:", dbError);
        notificationsData = [];
      }
      */

      // Always use dummy data for now (until notifications table is properly set up)
      notificationsData = [];

      if (notificationsData.length === 0) {
        // Add dummy notifications for testing
        notificationsData = [
          {
            id: "dummy-1",
            user_id: user.id,
            title: "Issue Update",
            message:
              "Your reported pothole issue has been assigned to the road maintenance department.",
            type: "info" as const,
            read: false,
            issue_id: "1",
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          },
          {
            id: "dummy-2",
            user_id: user.id,
            title: "New Poll",
            message:
              "A new poll about community park renovation is now live. Cast your vote!",
            type: "success" as const,
            read: false,
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          },
          {
            id: "dummy-3",
            user_id: user.id,
            title: "Issue Resolved",
            message:
              "Great news! The streetlight issue you reported has been resolved.",
            type: "success" as const,
            read: true,
            issue_id: "2",
            created_at: new Date(
              Date.now() - 1 * 24 * 60 * 60 * 1000
            ).toISOString(), // 1 day ago
          },
          {
            id: "dummy-4",
            user_id: user.id,
            title: "Maintenance Alert",
            message:
              "Scheduled water supply maintenance in your area tomorrow from 10 AM to 2 PM.",
            type: "warning" as const,
            read: true,
            created_at: new Date(
              Date.now() - 2 * 24 * 60 * 60 * 1000
            ).toISOString(), // 2 days ago
          },
          {
            id: "dummy-5",
            user_id: user.id,
            title: "New Follower",
            message:
              "Rajesh Kumar started following you. Check out their profile!",
            type: "info" as const,
            read: true,
            created_at: new Date(
              Date.now() - 3 * 24 * 60 * 60 * 1000
            ).toISOString(), // 3 days ago
          },
        ];
      }

      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter((n) => !n.read).length);
    } catch (error) {
      console.warn("Error fetching notifications, using dummy data:", error);
      // Even if there's an error, show dummy notifications for UI testing
      const dummyNotifications = [
        {
          id: "dummy-error-1",
          user_id: user?.id || "unknown",
          title: "Welcome to JanMat!",
          message:
            "Notifications are currently in demo mode. Real notifications will appear when the backend is fully configured.",
          type: "info" as const,
          read: false,
          created_at: new Date().toISOString(),
        },
      ];
      setNotifications(dummyNotifications);
      setUnreadCount(1);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return () => {}; // Return empty cleanup function

    const subscription = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Show browser notification if permission granted
          if (Notification.permission === "granted") {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: "/favicon.ico",
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === updatedNotification.id ? updatedNotification : n
            )
          );

          // Update unread count - avoid infinite loop by not calling fetchNotifications
          setUnreadCount(() => notifications.filter((n) => !n.read).length);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Check if it's a dummy notification
      if (notificationId.startsWith("dummy-")) {
        // Handle dummy notifications locally
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        return;
      }

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      // Handle dummy notifications locally
      const realNotifications = notifications.filter(
        (n) => !n.id.startsWith("dummy-")
      );

      // Update real notifications in database
      if (realNotifications.length > 0) {
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("user_id", user.id)
          .eq("read", false);

        if (error) throw error;
      }

      // Update all notifications locally
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // Check if it's a dummy notification
      if (notificationId.startsWith("dummy-")) {
        // Handle dummy notifications locally
        const notification = notifications.find((n) => n.id === notificationId);
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        if (notification && !notification.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        return;
      }

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      const notification = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return Notification.permission === "granted";
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestNotificationPermission,
    refetch: fetchNotifications,
  };
};

// Utility function to create notifications for government users
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: Notification["type"] = "info",
  issueId?: string
) => {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
      issue_id: issueId,
      read: false,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

// Utility function to notify government users about new issues
export const notifyGovernmentUsersOfNewIssue = async (
  issueId: string,
  issueTitle: string,
  category: string
) => {
  try {
    // Get all government users
    const { data: govUsers, error } = await supabase
      .from("users")
      .select("id")
      .eq("role", "government");

    if (error) throw error;

    if (govUsers && govUsers.length > 0) {
      const notifications = govUsers.map((user) => ({
        user_id: user.id,
        title: "New Issue Reported",
        message: `A new ${category} issue has been reported: ${issueTitle}`,
        type: "info" as const,
        issue_id: issueId,
        read: false,
      }));

      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error("Error notifying government users:", error);
  }
};

// Utility function to notify citizen when their issue status changes
export const notifyIssueStatusChange = async (
  citizenId: string,
  issueTitle: string,
  newStatus: string,
  issueId: string
) => {
  try {
    const statusMessages: { [key: string]: string } = {
      pending: "is now being reviewed",
      in_progress: "is now being worked on",
      resolved: "has been resolved",
      rejected: "has been reviewed and closed",
    };

    const message =
      statusMessages[newStatus] || `status has been updated to ${newStatus}`;

    await createNotification(
      citizenId,
      "Issue Status Update",
      `Your issue "${issueTitle}" ${message}.`,
      newStatus === "resolved" ? "success" : "info",
      issueId
    );
  } catch (error) {
    console.error("Error notifying issue status change:", error);
  }
};
