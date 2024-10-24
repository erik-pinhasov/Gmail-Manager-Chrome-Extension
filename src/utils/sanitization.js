export function sanitizeInput(input) {
  if (typeof input !== "string") return "";

  return input.replace(/[<>]/g, "").trim();
}

export function sanitizeEmailAddress(email) {
  if (typeof email !== "string") return "";

  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  return emailRegex.test(email) ? email.toLowerCase().trim() : "";
}

export function sanitizeSearchQuery(query) {
  if (typeof query !== "string") return "";

  return query
    .replace(/[<>{}]/g, "")
    .replace(/\\/g, "")
    .trim();
}
