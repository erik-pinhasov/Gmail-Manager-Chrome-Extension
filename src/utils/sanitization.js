// Sanitize general input by removing HTML tags
export function sanitizeInput(input) {
  if (typeof input !== "string") return "";
  return input.replace(/[<>]/g, "").trim();
}

// Validate and normalize email addresses
export function sanitizeEmailAddress(email) {
  if (typeof email !== "string") return "";
  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  return emailRegex.test(email) ? email.toLowerCase().trim() : "";
}

// Sanitize Gmail search queries
export function sanitizeSearchQuery(query) {
  if (typeof query !== "string") return "";
  return query
    .replace(/[<>{}]/g, "") // Remove potentially harmful characters
    .replace(/\\/g, "") // Remove escape characters
    .trim();
}
