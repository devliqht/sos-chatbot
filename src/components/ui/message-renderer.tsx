'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Code2, FileText } from 'lucide-react';
import 'katex/dist/katex.min.css';

interface MessageRendererProps {
  content: string;
  isStreaming?: boolean;
}

interface CodeBlockProps {
  children: string;
  className?: string;
}

function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const language = className?.replace('language-', '') || 'text';
  const code = String(children).replace(/\n$/, '');

  const getLanguageIcon = (lang: string) => {
    const lowerLang = lang.toLowerCase();
    if (['js', 'javascript', 'ts', 'typescript', 'jsx', 'tsx', 'python', 'py', 'java', 'cpp', 'c++', 'c', 'rust', 'go', 'php', 'ruby', 'swift', 'kotlin', 'sql', 'html', 'css', 'scss', 'sass', 'json', 'xml', 'yaml', 'yml', 'bash', 'sh', 'powershell', 'r', 'scala', 'dart', 'lua'].includes(lowerLang)) {
      return <Code2 className="h-3 w-3" />;
    }
    return <FileText className="h-3 w-3" />;
  };

  const getLanguageColor = (lang: string) => {
    const colors: Record<string, string> = {
      'javascript': 'text-yellow-600',
      'js': 'text-yellow-600',
      'typescript': 'text-blue-600',
      'ts': 'text-blue-600',
      'python': 'text-green-600',
      'py': 'text-green-600',
      'java': 'text-orange-600',
      'cpp': 'text-blue-700',
      'c++': 'text-blue-700',
      'c': 'text-blue-700',
      'rust': 'text-orange-700',
      'go': 'text-cyan-600',
      'php': 'text-purple-600',
      'ruby': 'text-red-600',
      'swift': 'text-orange-500',
      'kotlin': 'text-purple-700',
      'html': 'text-orange-500',
      'css': 'text-blue-500',
      'scss': 'text-pink-500',
      'sass': 'text-pink-500',
      'json': 'text-green-500',
      'xml': 'text-blue-400',
      'yaml': 'text-purple-500',
      'yml': 'text-purple-500',
      'sql': 'text-blue-600',
      'bash': 'text-green-700',
      'sh': 'text-green-700',
      'powershell': 'text-blue-600',
      'r': 'text-blue-500',
      'scala': 'text-red-600',
      'dart': 'text-blue-400',
      'lua': 'text-blue-600',
    };
    return colors[lang.toLowerCase()] || 'text-muted-foreground';
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Use dark mode by default
  useEffect(() => {
    setIsDark(true);
  }, []);

  return (
    <div className="my-4 relative group">
      <div className="flex items-center justify-between bg-muted/80 px-4 py-2 border-b rounded-t-lg">
        <div className="flex items-center space-x-2">
          <span className={getLanguageColor(language)}>
            {getLanguageIcon(language)}
          </span>
          <span className="text-xs font-medium text-muted-foreground uppercase">
            {language}
          </span>
          <span className="text-xs text-muted-foreground/60">
            ({code.split('\n').length} lines)
          </span>
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={isDark ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            borderRadius: '0 0 0.5rem 0.5rem',
            border: '1px solid hsl(var(--border))',
            borderTop: 'none',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            background: isDark ? '#1e1e1e' : '#fafafa',
          }}
          showLineNumbers={code.split('\n').length > 5}
          wrapLines={false}
          wrapLongLines={false}
          codeTagProps={{
            style: {
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            }
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export function MessageRenderer({ content, isStreaming }: MessageRendererProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold mt-3 mb-2 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold mt-3 mb-1 first:mt-0">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground">{children}</em>
          ),
          del: ({ children }) => (
            <del className="line-through text-muted-foreground">{children}</del>
          ),
          code: ({ children, className, ...props }) => {
            const isInline = !className?.includes('language-');

            if (isInline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground border" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock className={className}>
                {String(children)}
              </CodeBlock>
            );
          },
          pre: ({ children }) => {
            // Let the code component handle the pre styling
            return <>{children}</>;
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic text-muted-foreground mb-3">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-primary underline hover:text-primary/80 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 border border-border rounded-lg">
              <table className="min-w-full">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground border-r border-border last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-xs text-foreground border-r border-border last:border-r-0">
              {children}
            </td>
          ),
          hr: () => (
            <hr className="border-border my-6" />
          ),
          sup: ({ children }) => (
            <sup className="text-xs">{children}</sup>
          ),
          sub: ({ children }) => (
            <sub className="text-xs">{children}</sub>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse">|</span>
      )}
    </div>
  );
}
