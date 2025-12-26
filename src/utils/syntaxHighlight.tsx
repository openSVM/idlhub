/**
 * Syntax highlighting utility using Prism.js
 */
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-crystal';
import 'prismjs/components/prism-python';

// Language mapping for code snippets
const LANGUAGE_MAP: Record<string, string> = {
  'TypeScript': 'typescript',
  'Rust': 'rust',
  'C': 'c',
  'Kotlin': 'kotlin',
  'Crystal': 'crystal',
  'Zig': 'c', // Use C highlighting for Zig (similar syntax)
  'Python': 'python',
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
    console.warn(`Grammar not found for language: ${prismLang}`);
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
