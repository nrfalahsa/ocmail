/**
 * OTP / Verification Code Extractor
 * Ported & expanded from ~/Projects/grok/tempik_client.py
 */

const KEYWORD_OTP_RE = /(?:code|verification|otp|kode|security|confirmation|pin)[^0-9]{0,25}(\b\d{3}[-\s]?\d{3}\b|\b\d{4,8}\b)/i;
const STANDALONE_OTP_RE = /(?<![#\w&])(\d{3}[-\s]?\d{3}|\d{4,8})(?![#\w&])/;

export function extractOtp(subject = "", body = ""): string {
  const safeSubject = subject || "";
  const safeBody = body || "";

  // 1. Check subject with keyword pattern first
  const subjectKeywordMatch = safeSubject.match(KEYWORD_OTP_RE);
  if (subjectKeywordMatch && subjectKeywordMatch[1]) {
    return subjectKeywordMatch[1].replace(/\D/g, "");
  }

  // 2. Check subject with standalone pattern
  const subjectStandaloneMatch = safeSubject.match(STANDALONE_OTP_RE);
  if (subjectStandaloneMatch && subjectStandaloneMatch[1]) {
    return subjectStandaloneMatch[1].replace(/\D/g, "");
  }

  // 3. Strip HTML tags from body before scanning to avoid matching hex codes like #333333
  const cleanedBody = safeBody
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/#[0-9a-fA-F]{3,8}/g, " ") // strip hex colors
    .replace(/&\w+;/g, " "); // strip html entities

  // 4. Check body with keyword pattern
  const bodyKeywordMatch = cleanedBody.match(KEYWORD_OTP_RE);
  if (bodyKeywordMatch && bodyKeywordMatch[1]) {
    return bodyKeywordMatch[1].replace(/\D/g, "");
  }

  // 5. Check body standalone
  const bodyStandaloneMatch = cleanedBody.match(STANDALONE_OTP_RE);
  if (bodyStandaloneMatch && bodyStandaloneMatch[1]) {
    return bodyStandaloneMatch[1].replace(/\D/g, "");
  }

  return "";
}
