/**
 * KanPad Pro - Code Formatter and Beautifier
 * Soporte para formatear y poner bonito código en múltiples lenguajes:
 * JSON, JS, HTML, CSS, SQL, Python, etc.
 */

const CodeTools = {
  // Detección automática del lenguaje
  detectLanguage(code) {
    const trimmed = code.trim();
    if (!trimmed) return 'plaintext';

    // JSON check
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch (e) {}
    }

    // HTML / XML
    if (/<\/?[a-z][\s\S]*>/i.test(trimmed) || trimmed.startsWith('<!DOCTYPE html')) {
      return 'html';
    }

    // SQL
    if (/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|GROUP BY|ORDER BY|CREATE TABLE)\b/i.test(trimmed)) {
      return 'sql';
    }

    // CSS
    if (/[.#a-zA-Z0-9_-]+\s*\{[^}]*:[^}]*\}/.test(trimmed)) {
      return 'css';
    }

    // Python
    if (/^\s*(def|class|import|from|elif|print\(|if __name__ ==)/m.test(trimmed)) {
      return 'python';
    }

    // JavaScript / TypeScript
    if (/\b(const|let|var|function|return|console\.log|import\s+.*from|export\s+default|async\s+function|=>)\b/.test(trimmed)) {
      return 'javascript';
    }

    // C / C++ / Java
    if (/#include\s*<|public\s+static\s+void|int\s+main\s*\(/.test(trimmed)) {
      return 'cpp';
    }

    // Markdown
    if (/^#{1,6}\s+|^\s*[-*+]\s+|^>\s+|\[.*\]\(.*\)/m.test(trimmed)) {
      return 'markdown';
    }

    return 'javascript';
  },

  // Formateador principal: Pone el código "bonito" según el lenguaje
  beautify(code, language = 'auto') {
    if (!code || !code.trim()) return code;

    let targetLang = language;
    if (targetLang === 'auto' || !targetLang) {
      targetLang = this.detectLanguage(code);
    }

    try {
      switch (targetLang.toLowerCase()) {
        case 'json':
          return this.formatJSON(code);
        case 'sql':
          return this.formatSQL(code);
        case 'html':
        case 'xml':
          return this.formatHTML(code);
        case 'css':
          return this.formatCSS(code);
        case 'javascript':
        case 'typescript':
        case 'js':
        case 'ts':
          return this.formatJS(code);
        default:
          return this.formatGeneric(code);
      }
    } catch (err) {
      console.warn('Error formateando código:', err);
      return code;
    }
  },

  // Formateador de JSON
  formatJSON(code) {
    const parsed = JSON.parse(code.trim());
    return JSON.stringify(parsed, null, 2);
  },

  // Formateador de SQL
  formatSQL(code) {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 
      'OUTER JOIN', 'JOIN', 'ON', 'GROUP BY', 'HAVING', 'ORDER BY', 
      'LIMIT', 'OFFSET', 'UNION ALL', 'UNION', 'INSERT INTO', 'VALUES', 
      'UPDATE', 'SET', 'DELETE', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE',
      'AND', 'OR', 'AS', 'IN', 'NOT IN', 'EXISTS', 'NOT EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
    ];

    let clean = code.replace(/\s+/g, ' ').trim();
    
    // Resaltar palabras clave en mayúsculas
    keywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      clean = clean.replace(regex, kw);
    });

    // Añadir saltos de línea e indentación lógica
    const majorKeywords = ['SELECT', 'FROM', 'WHERE', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'JOIN', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'SET', 'VALUES'];
    majorKeywords.forEach(kw => {
      const regex = new RegExp(`\\s*\\b(${kw})\\b\\s*`, 'g');
      clean = clean.replace(regex, `\n$1 `);
    });

    clean = clean.replace(/\s*,\s*/g, ',\n  ');
    return clean.trim();
  },

  // Formateador de HTML / XML
  formatHTML(html) {
    let formatted = '';
    let indent = '';
    const tab = '  ';
    html = html.replace(/>\s*</g, '><').trim();

    const tokens = html.split(/(<[^>]+>)/g).filter(Boolean);

    tokens.forEach(token => {
      if (token.startsWith('</')) {
        // Tag de cierre
        indent = indent.slice(tab.length);
        formatted += '\n' + indent + token;
      } else if (token.startsWith('<') && !token.startsWith('<!') && !token.endsWith('/>') && !/^(<img|<br|<hr|<input|<meta|<link)/i.test(token)) {
        // Tag de apertura normal
        formatted += '\n' + indent + token;
        indent += tab;
      } else if (token.startsWith('<')) {
        // Tag autocerrado o doctype
        formatted += '\n' + indent + token;
      } else {
        // Texto interior
        const text = token.trim();
        if (text) {
          formatted += text;
        }
      }
    });

    return formatted.trim();
  },

  // Formateador de CSS
  formatCSS(css) {
    let clean = css.replace(/\s+/g, ' ').trim();
    clean = clean.replace(/\s*\{\s*/g, ' {\n  ');
    clean = clean.replace(/\s*;\s*/g, ';\n  ');
    clean = clean.replace(/\s*\}\s*/g, '\n}\n\n');
    clean = clean.replace(/  \n\}/g, '}');
    return clean.trim();
  },

  // Formateador básico de JavaScript / C-style
  formatJS(code) {
    let clean = code.trim();
    let indent = 0;
    const tab = '  ';
    let formatted = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      const prev = clean[i - 1];
      const next = clean[i + 1];

      // Strings
      if ((char === '"' || char === "'" || char === '`') && prev !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (inString) {
        formatted += char;
        continue;
      }

      if (char === '{' || char === '[') {
        indent++;
        formatted += char + '\n' + tab.repeat(indent);
      } else if (char === '}' || char === ']') {
        indent = Math.max(0, indent - 1);
        formatted += '\n' + tab.repeat(indent) + char;
      } else if (char === ';') {
        formatted += char + '\n' + tab.repeat(indent);
      } else {
        formatted += char;
      }
    }

    // Normalizar líneas vacías múltiples
    return formatted.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
  },

  // Limpieza genérica de espacios
  formatGeneric(code) {
    const lines = code.split('\n');
    return lines.map(line => line.trimEnd()).join('\n');
  }
};

window.CodeTools = CodeTools;
