// ── Error word patterns ──
// All case-insensitive. "error" is special: only highlighted when it is the
// whole text, at the very start of the string, or at the start of a new
// sentence (after ". " / "! " / "? "). Mid-sentence occurrences are ignored.

/**
 * Wraps error-related words/phrases in a text string with highlight spans.
 * Returns HTML string with matched words wrapped in <span class="highlight-error">.
 */
export function highlightErrorWords(text) {
  if (!text) return text;

  let result = text;

  // "error" – only at the very start of the string
  result = result.replace(
    /^error\b/gi,
    (match) => `<span class="highlight-error">${match}</span>`
  );

  // "failed" – standalone anywhere
  result = result.replace(
    /\bfailed\b/gi,
    (match) => `<span class="highlight-error">${match}</span>`
  );

  // Multi-word phrases (words must be consecutive)
  const phrases = [
    /\bnot\s+found\b/gi,
    /\binvalid\b/gi,
    /\bnot\s+valid\b/gi,
  ];

  for (const pattern of phrases) {
    result = result.replace(
      pattern,
      (match) => `<span class="highlight-error">${match}</span>`
    );
  }

  return result;
}

/**
 * Wraps warning words (closed/close/holiday) in a text string with highlight spans.
 * Returns HTML string with matched words wrapped in <span class="highlight-warning">.
 */
export function highlightWarningWords(text) {
  if (!text) return text;
  let result = text;

  // Schedule-related warning words
  result = result.replace(
    /\b(closed?|holiday|holliday)\b/gi,
    (match) => `<span class="highlight-warning">${match}</span>`
  );

  // User interaction warnings
  result = result.replace(
    /\bno\s+match\b/gi,
    (match) => `<span class="highlight-warning">${match}</span>`
  );
  result = result.replace(
    /\bno\s+input\b/gi,
    (match) => `<span class="highlight-warning">${match}</span>`
  );

  return result;
}

/**
 * Checks cross-field conditions for a log entry that require
 * looking at multiple fields together.
 *
 * Returns:
 *   isReturnCodeError  – true when desc contains "return code" and val is "8"
 *   isScheduleWarning  – true when type starts with "Check Schedule Group"
 *                         and val contains closed/close/holiday
 */
export function getLogHighlights(log) {
  // Condition: "return code" in description + value equals "8"
  const isReturnCodeError =
    /\breturn\s+code\b/i.test(log.desc) && log.val.trim() === "8";

  // Condition: type contains "Check Schedule Group" + val has closed/close/holiday
  const isScheduleWarning =
    /\bCheck\s+Schedule\s+Group\b/i.test(log.type) &&
    /\b(closed?|holiday|holliday)\b/i.test(log.val);

  return { isReturnCodeError, isScheduleWarning };
}
