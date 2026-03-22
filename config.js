// config.js - Shared configuration constants

export const CATEGORIES = [
  "Dev",
  "AI",
  "Video",
  "Social",
  "Finance",
  "News",
  "Shopping",
  "Learning",
  "Design",
  "Other"
];

export const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Max recent log entries to keep in storage
export const MAX_LOG_ENTRIES = 50;
