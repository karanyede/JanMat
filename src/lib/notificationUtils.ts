import { supabase } from "./supabase";

export interface CreateNotificationData {
  user_id: string;
  title: string;
  message: string;
  type:
    | "issue_update"
    | "new_poll"
    | "news"
    | "follow"
    | "story_view"
    | "comment";
  related_id?: string;
}

export const createNotification = async (data: CreateNotificationData) => {
  try {
    const { error } = await supabase.from("notifications").insert([
      {
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type,
        related_id: data.related_id,
        read: false,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Error creating notification:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error creating notification:", error);
    return false;
  }
};

// Predefined notification templates
export const NotificationTemplates = {
  issueUpvoted: (issueTitle: string) => ({
    title: "Issue Upvoted",
    message: `Your issue "${issueTitle}" received a new upvote!`,
    type: "issue_update" as const,
  }),

  pollVoted: (pollTitle: string) => ({
    title: "Poll Activity",
    message: `Someone voted on your poll "${pollTitle}"`,
    type: "new_poll" as const,
  }),

  issueStatusUpdate: (issueTitle: string, status: string) => ({
    title: "Issue Status Update",
    message: `Your issue "${issueTitle}" status changed to ${status.replace("_", " ")}`,
    type: "issue_update" as const,
  }),

  welcomeMessage: () => ({
    title: "Welcome to JanMat!",
    message:
      "Start reporting civic issues and participating in polls to make your community better.",
    type: "news" as const,
  }),

  newPollAlert: (pollTitle: string) => ({
    title: "New Poll Available",
    message: `A new poll "${pollTitle}" is now available for voting!`,
    type: "new_poll" as const,
  }),

  issueResolved: (issueTitle: string) => ({
    title: "Issue Resolved!",
    message: `Great news! Your issue "${issueTitle}" has been marked as resolved.`,
    type: "issue_update" as const,
  }),
};

// Utility to create a welcome notification for new users
export const createWelcomeNotification = async (userId: string) => {
  const template = NotificationTemplates.welcomeMessage();
  return createNotification({
    user_id: userId,
    ...template,
  });
};

// Create notification when someone upvotes an issue
export const createUpvoteNotification = async (
  issueOwnerId: string,
  issueTitle: string,
  issueId: string
) => {
  const template = NotificationTemplates.issueUpvoted(issueTitle);
  return createNotification({
    user_id: issueOwnerId,
    ...template,
    related_id: issueId,
  });
};

// Create notification for poll activity
export const createPollVoteNotification = async (
  pollOwnerId: string,
  pollTitle: string,
  pollId: string
) => {
  const template = NotificationTemplates.pollVoted(pollTitle);
  return createNotification({
    user_id: pollOwnerId,
    ...template,
    related_id: pollId,
  });
};
