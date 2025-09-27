export type UserRole = "citizen" | "government" | "journalist";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  bio?: string;
  is_public: boolean;
  followers: string[];
  following: string[];
  created_at: string;
  updated_at: string;
}

export type IssueStatus =
  | "submitted"
  | "under_review"
  | "in_progress"
  | "resolved";
export type IssuePriority = "low" | "medium" | "high" | "urgent";
export type IssueCategory =
  | "infrastructure"
  | "sanitation"
  | "transportation"
  | "safety"
  | "environment"
  | "utilities"
  | "healthcare"
  | "education"
  | "other";

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  status: IssueStatus;
  priority: IssuePriority;
  location: string;
  latitude?: number;
  longitude?: number;
  image_urls: string[];
  assigned_to?: string;
  upvotes: number;
  upvoted_by: string[];
  downvotes: number;
  downvoted_by: string[];
  is_public: boolean;
  reporter_id: string;
  reporter?: User;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  issue_id: string;
  content: string;
  author_name: string;
  author_role: UserRole;
  author_id: string;
  author?: User;
  users?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    role: UserRole;
  };
  is_official_response: boolean;
  created_at: string;
  updated_at: string;
}

export type NewsCategory =
  | "announcement"
  | "policy"
  | "event"
  | "emergency"
  | "development"
  | "budget"
  | "services"
  | "other";

export interface News {
  id: string;
  title: string;
  content: string;
  category: NewsCategory;
  image_url?: string;
  published: boolean;
  priority: "low" | "medium" | "high";
  location?: string;
  likes: number;
  liked_by: string[];
  views?: number;
  tags?: string[];
  external_url?: string;
  author_id: string;
  author?: User;
  author_name?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  image_url?: string;
  published: boolean;
  priority: "low" | "medium" | "high";
  location?: string;
  likes: number;
  liked_by: string[];
  views: number;
  author_id: string;
  author?: User;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface PollOption {
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  title: string;
  description?: string;
  options: PollOption[];
  voted_by: string[];
  is_active: boolean;
  end_date: string;
  creator_id: string;
  creator?: User;
  created_at: string;
  updated_at: string;
}

export interface Story {
  id: string;
  image_url: string;
  caption?: string;
  expires_at: string;
  viewed_by: string[];
  user_id: string;
  user?: User;
  created_at: string;
}

export interface Notification {
  id: string;
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
  read: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  success: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  location?: string;
}

export interface FeedItem {
  id: string;
  type: "issue" | "news" | "poll";
  data: Issue | News | Poll;
  timestamp: string;
}
