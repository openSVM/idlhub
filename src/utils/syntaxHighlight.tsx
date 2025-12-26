/**
 * Syntax highlighting utility - DISABLED for now
 * Prism.js causes module initialization errors in production
 * TODO: Implement server-side highlighting or simpler solution
 */

// Language mapping for code snippets (for future use)
const LANGUAGE_MAP: Record<string, string> = {
  'TypeScript': 'typescript',
  'Rust': 'rust',
  'C': 'c',
  'Kotlin': 'kotlin',
  'Crystal': 'crystal',
  'Zig': 'zig',
  'Python': 'python',
  'Next.js': 'typescript',
  'React Native': 'typescript',
};

/**
 * Highlight code - TEMPORARILY DISABLED
 * Returns escaped HTML without highlighting
 */
export function highlightCode(code: string, language: string): string {
  // Syntax highlighting disabled due to Prism.js module initialization issues
  // Just return escaped HTML for now
  return escapeHtml(code);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * React component wrapper for highlighted code
 */
export function HighlightedCode({ code, language }: { code: string; language: string }) {
  const highlighted = highlightCode(code, language);

  return (
    <code
      className={`language-${LANGUAGE_MAP[language] || 'typescript'}`}
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}
