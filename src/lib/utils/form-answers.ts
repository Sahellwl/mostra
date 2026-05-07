/**
 * Helpers for reading and writing multi-select checkbox answers.
 *
 * Checkbox answers are stored as JSON strings in the `answer: string | null`
 * field of FormQuestionContent (e.g. '["opt1","opt2"]').
 * All other field types continue to store plain strings.
 *
 * Use these helpers everywhere a checkbox answer is read or written —
 * never call JSON.parse / JSON.stringify directly in components.
 */

/**
 * Parses a stored checkbox answer into a string array.
 * Returns an empty array on any failure (null, empty string, invalid JSON,
 * non-array value, array containing non-string items).
 */
export function parseCheckboxAnswer(answer: string | null | undefined): string[] {
  if (!answer) return []
  try {
    const parsed: unknown = JSON.parse(answer)
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
      return parsed as string[]
    }
    return []
  } catch {
    return []
  }
}

/**
 * Serializes a string array into the JSON format used to store checkbox answers.
 */
export function serializeCheckboxAnswer(values: string[]): string {
  return JSON.stringify(values)
}
