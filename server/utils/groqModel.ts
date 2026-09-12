// Keep Groq model selection explicit across every AI helper.
export const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

export function resolveGroqModel(value: unknown): string {
  const configured = String(value ?? '').trim();
  // Groq is retiring Qwen3.6-27B. Do not silently inherit provider-side
  // rerouting in production; use the repository's stable default instead.
  if (/qwen\s*3\.6[-_ ]?27b/i.test(configured)) return DEFAULT_GROQ_MODEL;
  return configured || DEFAULT_GROQ_MODEL;
}
