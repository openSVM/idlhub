/**
 * Syntax highlighting utility using Prism.js
 */
import Prism from 'prismjs';

// Import only core languages to avoid build issues
// These are built into Prism.js core
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-clike';

// Language mapping for code snippets
const LANGUAGE_MAP: Record<string, string> = {
  'TypeScript': 'typescript',
  'Rust': 'clike', // Use C-like for Rust (similar syntax)
  'C': 'clike',
  'Kotlin': 'clike', // Use C-like for Kotlin
  'Crystal': 'clike', // Use C-like for Crystal
  'Zig': 'clike', // Use C-like for Zig
  'Python': 'javascript', // Use JavaScript for Python (better than nothing)
  'Next.js': 'typescript',
  'React Native': 'typescript',
};

/**
 * Highlight code with Prism.js
 */
export function highlightCode(code: string, language: string): string {
  const prismLang = LANGUAGE_MAP[language] || 'typescript';
  const grammar = Prism.languages[prismLang];

  if (!grammar) {
    console.warn(`Grammar not found for language: ${prismLang}, using plain text`);
    return escapeHtml(code);
  }

  try {
    return Prism.highlight(code, grammar, prismLang);
  } catch (error) {
    console.error('Syntax highlighting error:', error);
    return escapeHtml(code);
  }
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
