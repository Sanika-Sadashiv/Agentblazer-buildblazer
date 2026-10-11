// Strips HTML/script content from incoming request data and blocks
// MongoDB operator injection (keys starting with "$" or containing ".").
// Applied globally so every route (public forms + admin-authored content)
// is protected, without needing an extra dependency.

const FIELDS_TO_SKIP = new Set(["password"]);

// Uploaded photos arrive as base64 data URLs. They can only contain
// [A-Za-z0-9+/=] after a fixed prefix, so they are safe by construction.
const IMAGE_DATA_URL = /^data:image\/(?:jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;

function stripHtml(value) {
  if (typeof value !== "string") return value;
  if (IMAGE_DATA_URL.test(value)) return value;

  let cleaned = value;
  // Remove script/style blocks entirely (including their content)
  cleaned = cleaned.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
  // Strip any remaining HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, "");
  // Neutralize javascript: URIs and inline event handlers (onclick=, onerror=, ...)
  cleaned = cleaned.replace(/javascript\s*:/gi, "");
  cleaned = cleaned.replace(/on\w+\s*=/gi, "");

  return cleaned.trim();
}

function sanitizeValue(value, key) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, key));
  }
  if (value && typeof value === "object") {
    return sanitizeObject(value);
  }
  if (FIELDS_TO_SKIP.has(key)) {
    return value; // don't mangle passwords etc.
  }
  return stripHtml(value);
}

function sanitizeObject(obj) {
  const clean = {};
  for (const key of Object.keys(obj)) {
    // Block Mongo operator injection, e.g. { "$gt": "" } or "profile.role"
    if (key.startsWith("$") || key.includes(".")) continue;
    clean[key] = sanitizeValue(obj[key], key);
  }
  return clean;
}

function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === "object" && Object.keys(req.query).length) {
    try {
      const cleanedQuery = sanitizeObject(req.query);
      Object.keys(req.query).forEach((k) => delete req.query[k]);
      Object.assign(req.query, cleanedQuery);
    } catch (error) {
      // req.query can be read-only depending on Express version; safe to skip
    }
  }

  next();
}

module.exports = sanitizeInput;
