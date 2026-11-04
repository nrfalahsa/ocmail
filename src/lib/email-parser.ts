/**
 * RFC 2045 / RFC 822 / MIME Email Parser
 * Parses raw .eml into headers, clean text, and rendered HTML
 */

function decodeQuotedPrintable(str: string): string {
  // Replace soft line breaks
  let cleaned = str.replace(/=\r?\n/g, "");
  // Replace =XX hex
  cleaned = cleaned.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  return cleaned;
}

function decodeBase64(str: string): string {
  try {
    const clean = str.replace(/\s+/g, "");
    return Buffer.from(clean, "base64").toString("utf-8");
  } catch {
    return str;
  }
}

function decodeMimeHeader(str: string): string {
  // RFC 2047 encoded-word: =?charset?encoding?encoded-text?=
  return str.replace(/=\?([^?]+)\?([BQbq])\?([^?]+)\?=/g, (_, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === "B") {
        return Buffer.from(text, "base64").toString("utf-8");
      } else if (encoding.toUpperCase() === "Q") {
        // Quoted-printable with underscore for space
        const cleaned = text.replace(/_/g, " ");
        return decodeQuotedPrintable(cleaned);
      }
    } catch {}
    return text;
  });
}

export interface ParsedEmail {
  from?: string;
  subject?: string;
  html: string;
  text: string;
  isHtml: boolean;
}

export function parseRawEmail(rawBody: string): ParsedEmail {
  if (!rawBody) return { html: "", text: "", isHtml: false };

  // Separate headers and body at first blank line
  const doubleNewlineMatch = rawBody.match(/\r?\n\r?\n/);
  let headerSection = "";
  let bodySection = rawBody;

  if (doubleNewlineMatch && doubleNewlineMatch.index !== undefined) {
    headerSection = rawBody.slice(0, doubleNewlineMatch.index);
    bodySection = rawBody.slice(doubleNewlineMatch.index + doubleNewlineMatch[0].length);
  }

  // Extract display from header if available
  const fromMatch = headerSection.match(/^from:\s*([^\r\n]+)/im);
  const parsedFrom = fromMatch ? decodeMimeHeader(fromMatch[1].trim()) : undefined;

  const subjectMatch = headerSection.match(/^subject:\s*([^\r\n]+)/im);
  const parsedSubject = subjectMatch ? decodeMimeHeader(subjectMatch[1].trim()) : undefined;

  // Check Content-Type & Transfer-Encoding
  const contentTypeMatch = headerSection.match(/content-type:\s*([^;\r\n]+)/i);
  const contentType = contentTypeMatch ? contentTypeMatch[1].trim().toLowerCase() : "";

  const encodingMatch = headerSection.match(/content-transfer-encoding:\s*([^\r\n]+)/i);
  const transferEncoding = encodingMatch ? encodingMatch[1].trim().toLowerCase() : "";

  // Check multipart boundary
  const boundaryMatch = headerSection.match(/boundary=["']?([^"';\r\n]+)["']?/i);

  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = bodySection.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));

    let foundHtml = "";
    let foundText = "";

    for (const part of parts) {
      if (!part || part.trim() === "--" || part.trim() === "") continue;

      const partSplit = part.match(/\r?\n\r?\n/);
      if (!partSplit || partSplit.index === undefined) continue;

      const partHeader = part.slice(0, partSplit.index);
      let partContent = part.slice(partSplit.index + partSplit[0].length);

      const partTypeMatch = partHeader.match(/content-type:\s*([^;\r\n]+)/i);
      const partType = partTypeMatch ? partTypeMatch[1].trim().toLowerCase() : "";

      const partEncodingMatch = partHeader.match(/content-transfer-encoding:\s*([^\r\n]+)/i);
      const partEncoding = partEncodingMatch ? partEncodingMatch[1].trim().toLowerCase() : "";

      if (partEncoding === "quoted-printable") {
        partContent = decodeQuotedPrintable(partContent);
      } else if (partEncoding === "base64") {
        partContent = decodeBase64(partContent);
      }

      if (partType.includes("text/html")) {
        foundHtml = partContent;
      } else if (partType.includes("text/plain") && !foundText) {
        foundText = partContent;
      }
    }

    if (foundHtml) {
      return { from: parsedFrom, subject: parsedSubject, html: sanitizeHtml(foundHtml), text: foundText || stripTags(foundHtml), isHtml: true };
    }
    if (foundText) {
      return { from: parsedFrom, subject: parsedSubject, html: "", text: foundText, isHtml: false };
    }
  }

  // Single part email
  let decodedBody = bodySection;
  if (transferEncoding.includes("quoted-printable") || /=3D|=\r?\n/i.test(decodedBody)) {
    decodedBody = decodeQuotedPrintable(decodedBody);
  } else if (transferEncoding.includes("base64")) {
    decodedBody = decodeBase64(decodedBody);
  }

  const isHtml = contentType.includes("text/html") || /<html[\s>]|<body[\s>]|<!doctype/i.test(decodedBody);

  return {
    from: parsedFrom,
    subject: parsedSubject,
    html: isHtml ? sanitizeHtml(decodedBody) : "",
    text: isHtml ? stripTags(decodedBody) : decodedBody,
    isHtml,
  };
}

function sanitizeHtml(html: string): string {
  // Strip harmful script tags and on* attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

function stripTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
