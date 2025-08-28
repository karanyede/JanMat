// Comprehensive validation utilities for JanMat
// Can be used on both client and server side

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Issue validation
export const validateIssue = (data: {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  location?: string;
  image_urls?: string[];
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Title validation
  if (!data.title || data.title.trim().length === 0) {
    errors.push({ field: "title", message: "Title is required" });
  } else if (data.title.trim().length < 5) {
    errors.push({
      field: "title",
      message: "Title must be at least 5 characters long",
    });
  } else if (data.title.trim().length > 200) {
    errors.push({
      field: "title",
      message: "Title must be less than 200 characters",
    });
  }

  // Description validation
  if (!data.description || data.description.trim().length === 0) {
    errors.push({ field: "description", message: "Description is required" });
  } else if (data.description.trim().length < 10) {
    errors.push({
      field: "description",
      message: "Description must be at least 10 characters long",
    });
  } else if (data.description.trim().length > 2000) {
    errors.push({
      field: "description",
      message: "Description must be less than 2000 characters",
    });
  }

  // Category validation
  const validCategories = [
    "infrastructure",
    "sanitation",
    "transportation",
    "safety",
    "environment",
    "utilities",
    "healthcare",
    "education",
    "other",
  ];

  if (!data.category) {
    errors.push({ field: "category", message: "Category is required" });
  } else if (!validCategories.includes(data.category)) {
    errors.push({ field: "category", message: "Invalid category selected" });
  }

  // Priority validation
  const validPriorities = ["low", "medium", "high", "urgent"];
  if (!data.priority) {
    errors.push({ field: "priority", message: "Priority is required" });
  } else if (!validPriorities.includes(data.priority)) {
    errors.push({ field: "priority", message: "Invalid priority selected" });
  }

  // Location validation
  if (!data.location || data.location.trim().length === 0) {
    errors.push({ field: "location", message: "Location is required" });
  } else if (data.location.trim().length < 3) {
    errors.push({
      field: "location",
      message: "Location must be at least 3 characters long",
    });
  } else if (data.location.trim().length > 200) {
    errors.push({
      field: "location",
      message: "Location must be less than 200 characters",
    });
  }

  // Image URLs validation
  if (data.image_urls && data.image_urls.length > 10) {
    errors.push({ field: "image_urls", message: "Maximum 10 images allowed" });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// News validation
export const validateNews = (data: {
  title?: string;
  content?: string;
  category?: string;
  priority?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Title validation
  if (!data.title || data.title.trim().length === 0) {
    errors.push({ field: "title", message: "Title is required" });
  } else if (data.title.trim().length < 5) {
    errors.push({
      field: "title",
      message: "Title must be at least 5 characters long",
    });
  } else if (data.title.trim().length > 300) {
    errors.push({
      field: "title",
      message: "Title must be less than 300 characters",
    });
  }

  // Content validation
  if (!data.content || data.content.trim().length === 0) {
    errors.push({ field: "content", message: "Content is required" });
  } else if (data.content.trim().length < 20) {
    errors.push({
      field: "content",
      message: "Content must be at least 20 characters long",
    });
  } else if (data.content.trim().length > 5000) {
    errors.push({
      field: "content",
      message: "Content must be less than 5000 characters",
    });
  }

  // Category validation
  const validCategories = [
    "announcement",
    "policy",
    "event",
    "emergency",
    "development",
    "budget",
    "services",
    "other",
  ];

  if (!data.category) {
    errors.push({ field: "category", message: "Category is required" });
  } else if (!validCategories.includes(data.category)) {
    errors.push({ field: "category", message: "Invalid category selected" });
  }

  // Priority validation
  const validPriorities = ["low", "medium", "high"];
  if (!data.priority) {
    errors.push({ field: "priority", message: "Priority is required" });
  } else if (!validPriorities.includes(data.priority)) {
    errors.push({ field: "priority", message: "Invalid priority selected" });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Poll validation
export const validatePoll = (data: {
  title?: string;
  description?: string;
  options?: { text: string }[];
  end_date?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Title validation
  if (!data.title || data.title.trim().length === 0) {
    errors.push({ field: "title", message: "Title is required" });
  } else if (data.title.trim().length < 5) {
    errors.push({
      field: "title",
      message: "Title must be at least 5 characters long",
    });
  } else if (data.title.trim().length > 200) {
    errors.push({
      field: "title",
      message: "Title must be less than 200 characters",
    });
  }

  // Description validation (optional)
  if (data.description && data.description.trim().length > 1000) {
    errors.push({
      field: "description",
      message: "Description must be less than 1000 characters",
    });
  }

  // Options validation
  if (!data.options || data.options.length < 2) {
    errors.push({
      field: "options",
      message: "At least 2 options are required",
    });
  } else if (data.options.length > 10) {
    errors.push({ field: "options", message: "Maximum 10 options allowed" });
  } else {
    data.options.forEach((option, index) => {
      if (!option.text || option.text.trim().length === 0) {
        errors.push({
          field: `options.${index}`,
          message: `Option ${index + 1} cannot be empty`,
        });
      } else if (option.text.trim().length > 100) {
        errors.push({
          field: `options.${index}`,
          message: `Option ${index + 1} must be less than 100 characters`,
        });
      }
    });
  }

  // End date validation
  if (!data.end_date) {
    errors.push({ field: "end_date", message: "End date is required" });
  } else {
    const endDate = new Date(data.end_date);
    const now = new Date();
    if (endDate <= now) {
      errors.push({
        field: "end_date",
        message: "End date must be in the future",
      });
    } else if (endDate > new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)) {
      errors.push({
        field: "end_date",
        message: "End date cannot be more than 1 year in the future",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Comment validation
export const validateComment = (data: {
  content?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Content validation
  if (!data.content || data.content.trim().length === 0) {
    errors.push({ field: "content", message: "Comment content is required" });
  } else if (data.content.trim().length < 3) {
    errors.push({
      field: "content",
      message: "Comment must be at least 3 characters long",
    });
  } else if (data.content.trim().length > 500) {
    errors.push({
      field: "content",
      message: "Comment must be less than 500 characters",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// User profile validation
export const validateUserProfile = (data: {
  full_name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  department?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Full name validation
  if (!data.full_name || data.full_name.trim().length === 0) {
    errors.push({ field: "full_name", message: "Full name is required" });
  } else if (data.full_name.trim().length < 2) {
    errors.push({
      field: "full_name",
      message: "Full name must be at least 2 characters long",
    });
  } else if (data.full_name.trim().length > 100) {
    errors.push({
      field: "full_name",
      message: "Full name must be less than 100 characters",
    });
  }

  // Email validation
  if (!data.email || data.email.trim().length === 0) {
    errors.push({ field: "email", message: "Email is required" });
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.push({
        field: "email",
        message: "Please enter a valid email address",
      });
    }
  }

  // Phone validation (optional)
  if (data.phone && data.phone.trim().length > 0) {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(data.phone.trim()) || data.phone.trim().length < 10) {
      errors.push({
        field: "phone",
        message: "Please enter a valid phone number",
      });
    }
  }

  // Bio validation (optional)
  if (data.bio && data.bio.trim().length > 500) {
    errors.push({
      field: "bio",
      message: "Bio must be less than 500 characters",
    });
  }

  // Department validation (optional)
  if (data.department && data.department.trim().length > 100) {
    errors.push({
      field: "department",
      message: "Department must be less than 100 characters",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Sanitize HTML content
export const sanitizeHtml = (content: string): string => {
  return content
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/&/g, "&amp;");
};

// Rate limiting check (for client-side)
export const isRateLimited = (
  key: string,
  maxRequests: number = 5,
  timeWindow: number = 60000
): boolean => {
  const now = Date.now();
  const storageKey = `rate_limit_${key}`;

  try {
    const stored = localStorage.getItem(storageKey);
    const data = stored ? JSON.parse(stored) : { requests: [], timestamp: now };

    // Remove old requests outside the time window
    data.requests = data.requests.filter(
      (timestamp: number) => now - timestamp < timeWindow
    );

    // Check if rate limited
    if (data.requests.length >= maxRequests) {
      return true;
    }

    // Add current request
    data.requests.push(now);
    localStorage.setItem(storageKey, JSON.stringify(data));

    return false;
  } catch (error) {
    console.error("Rate limiting error:", error);
    return false; // Allow request if there's an error
  }
};
