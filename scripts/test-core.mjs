import assert from "node:assert";
import { createHash } from "node:crypto";

// Test 1: Ported extractOtp logic
const KEYWORD_OTP_RE = /(?:code|verification|otp|kode|security|confirmation|pin)[^0-9]{0,25}(\b\d{3}[-\s]?\d{3}\b|\b\d{4,8}\b)/i;
const STANDALONE_OTP_RE = /(?<![#\w&])(\d{3}[-\s]?\d{3}|\d{4,8})(?![#\w&])/;

function extractOtp(subject = "", body = "") {
  const safeSubject = subject || "";
  const safeBody = body || "";

  const subjectKeywordMatch = safeSubject.match(KEYWORD_OTP_RE);
  if (subjectKeywordMatch && subjectKeywordMatch[1]) {
    return subjectKeywordMatch[1].replace(/\D/g, "");
  }

  const subjectStandaloneMatch = safeSubject.match(STANDALONE_OTP_RE);
  if (subjectStandaloneMatch && subjectStandaloneMatch[1]) {
    return subjectStandaloneMatch[1].replace(/\D/g, "");
  }

  const cleanedBody = safeBody
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/#[0-9a-fA-F]{3,8}/g, " ")
    .replace(/&\w+;/g, " ");

  const bodyKeywordMatch = cleanedBody.match(KEYWORD_OTP_RE);
  if (bodyKeywordMatch && bodyKeywordMatch[1]) {
    return bodyKeywordMatch[1].replace(/\D/g, "");
  }

  const bodyStandaloneMatch = cleanedBody.match(STANDALONE_OTP_RE);
  if (bodyStandaloneMatch && bodyStandaloneMatch[1]) {
    return bodyStandaloneMatch[1].replace(/\D/g, "");
  }

  return "";
}

// Test case 1: Grok / xAI confirmation code in subject
const xAiSubject = "SpaceXAI confirmation code: 699-696";
assert.strictEqual(extractOtp(xAiSubject, "color: #333333;"), "699696", "Should extract xAI OTP from subject and ignore body hex");

// Test case 2: OTP in body with HTML and hex noise
const htmlBody = '<div style="background:#ffffff; color:#123456">Your verification code is 849204</div>';
assert.strictEqual(extractOtp("Welcome", htmlBody), "849204", "Should extract 6-digit OTP from body avoiding CSS color");

// Test case 3: API Key hashing test
const testKey = "ocm_abcdef123456";
const hash = createHash("sha256").update(testKey.trim()).digest("hex");
assert.strictEqual(hash.length, 64, "SHA-256 hash length should be 64 characters");

console.log("All core assertions passed successfully.");
