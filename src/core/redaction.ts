const PATTERNS: { regex: RegExp; replacement: string }[] = [
  // Bearer token
  { regex: /Bearer\s+\S+/g, replacement: "Bearer [REDACTED]" },
  // JWT (three base64url segments separated by dots)
  {
    regex: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replacement: "[REDACTED]",
  },
  // OpenAI-style API key
  { regex: /\bsk-(?:proj-)?[A-Za-z0-9]{20,}\b/g, replacement: "[REDACTED]" },
  // GitHub-style token (ghp_, gho_, ghu_, ghs_, ghr_)
  { regex: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, replacement: "[REDACTED]" },
  // AWS access key ID
  { regex: /\bAKIA[0-9A-Z]{16}\b/g, replacement: "[REDACTED]" },
  // .env style KEY=VALUE (uppercase key, e.g. API_KEY, DATABASE_URL)
  { regex: /\b([A-Z][A-Z0-9_]*)=(\S+)/g, replacement: "$1=[REDACTED]" },
  // key=value where key mentions password/secret/token, any case
  {
    regex: /\b(\w*(?:password|secret|token)\w*)=(\S+)/gi,
    replacement: "$1=[REDACTED]",
  },
];

export function redact(text: string): string {
  return PATTERNS.reduce(
    (result, { regex, replacement }) => result.replace(regex, replacement),
    text,
  );
}
