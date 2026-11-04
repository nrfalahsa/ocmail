/**
 * RFC 2045 / RFC 822 / MIME Email Parser
 * Parses raw .eml into headers, clean text, and rendered HTML
 */

import sanitizeHtml from "sanitize-html";

function decodeQuotedPrintable(str: string): string {
  // Replace soft line breaks
  const cleaned = str.replace(/=\r?\n/g, "");
  
  // Collect hex bytes
  const bytes: number[] = [];
  let i = 0;
  while (i < cleaned.length) {
    if (cleaned[i] === '=' && /[0-9A-Fa-f]{2}/.test(cleaned.slice(i + 1, i + 3))) {
      bytes.push(parseInt(cleaned.slice(i + 1, i + 3), 16));
      i += 3;
    } else {
      bytes.push(cleaned.charCodeAt(i));
      i++;
    }
  }
  
  // Decode UTF-8 byte array
  try {
    return Buffer.from(bytes).toString('utf-8');
  } catch {
    return cleaned;
  }
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
      return { from: parsedFrom, subject: parsedSubject, html: sanitizeHtmlContent(foundHtml), text: foundText || stripTags(foundHtml), isHtml: true };
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
    html: isHtml ? sanitizeHtmlContent(decodedBody) : "",
    text: isHtml ? stripTags(decodedBody) : decodedBody,
    isHtml,
  };
}

function sanitizeHtmlContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'b', 'i', 'u', 'a', 'img', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'hr', 'svg', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'g'],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'border', 'align', 'valign', 'hspace', 'vspace'],
      table: ['width', 'border', 'cellpadding', 'cellspacing', 'align', 'bgcolor'],
      td: ['width', 'height', 'align', 'valign', 'bgcolor', 'colspan', 'rowspan'],
      th: ['width', 'height', 'align', 'valign', 'bgcolor', 'colspan', 'rowspan'],
      svg: ['width', 'height', 'viewBox', 'xmlns', 'fill', 'stroke'],
      path: ['d', 'fill', 'stroke', 'stroke-width'],
      circle: ['cx', 'cy', 'r', 'fill', 'stroke'],
      rect: ['x', 'y', 'width', 'height', 'fill', 'stroke'],
      '*': ['class', 'style', 'id']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data', 'cid']
    },
    allowedStyles: {
      '*': {
        'color': [/.*/],
        'background': [/.*/],
        'background-color': [/.*/],
        'background-image': [/.*/],
        'background-size': [/.*/],
        'background-position': [/.*/],
        'text-align': [/.*/],
        'text-decoration': [/.*/],
        'font-size': [/.*/],
        'font-weight': [/.*/],
        'font-family': [/.*/],
        'line-height': [/.*/],
        'letter-spacing': [/.*/],
        'width': [/.*/],
        'height': [/.*/],
        'max-width': [/.*/],
        'max-height': [/.*/],
        'min-width': [/.*/],
        'min-height': [/.*/],
        'padding': [/.*/],
        'padding-top': [/.*/],
        'padding-right': [/.*/],
        'padding-bottom': [/.*/],
        'padding-left': [/.*/],
        'margin': [/.*/],
        'margin-top': [/.*/],
        'margin-right': [/.*/],
        'margin-bottom': [/.*/],
        'margin-left': [/.*/],
        'border': [/.*/],
        'border-radius': [/.*/],
        'border-top': [/.*/],
        'border-right': [/.*/],
        'border-bottom': [/.*/],
        'border-left': [/.*/],
        'display': [/.*/],
        'vertical-align': [/.*/],
        'float': [/.*/],
        'clear': [/.*/],
        'overflow': [/.*/],
        'box-sizing': [/.*/],
        'text-transform': [/.*/]
      }
    }
  });
}

function stripTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
