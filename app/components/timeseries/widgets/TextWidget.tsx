'use client';
import type { WidgetConfig } from '@/app/lib/timeseries/types';

interface TextWidgetProps {
  widget: WidgetConfig;
}

// ── Inline formatting — **bold**, *italic*, `code` ────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={i} className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-gray-700 dark:bg-gray-700/60 dark:text-gray-300">
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TextWidget({ widget }: TextWidgetProps) {
  const content   = widget.content ?? '';
  const align     = widget.style.textAlign ?? 'left';
  const fontSize  = widget.style.fontSize  ?? 'sm';

  const alignClass: Record<string, string> = {
    left:   'text-left',
    center: 'text-center',
    right:  'text-right',
  };
  const sizeClass: Record<string, string> = {
    sm:   'text-sm',
    base: 'text-base',
    lg:   'text-lg',
    xl:   'text-xl',
  };

  if (!content.trim()) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs italic text-gray-300 dark:text-gray-600">
          Click to add text content…
        </p>
      </div>
    );
  }

  const lines = content.split('\n');

  return (
    <div className={`h-full w-full overflow-auto p-4 ${alignClass[align]} ${sizeClass[fontSize]}`}>
      {lines.map((line, i) => {
        // H1
        if (line.startsWith('# '))
          return (
            <h1 key={i} className="mb-2 font-bold leading-tight text-gray-900 dark:text-white" style={{ fontSize: '1.4em' }}>
              {renderInline(line.slice(2))}
            </h1>
          );
        // H2
        if (line.startsWith('## '))
          return (
            <h2 key={i} className="mb-1.5 font-semibold leading-snug text-gray-800 dark:text-gray-100" style={{ fontSize: '1.15em' }}>
              {renderInline(line.slice(3))}
            </h2>
          );
        // H3
        if (line.startsWith('### '))
          return (
            <h3 key={i} className="mb-1 font-semibold text-gray-700 dark:text-gray-200" style={{ fontSize: '1em' }}>
              {renderInline(line.slice(4))}
            </h3>
          );
        // Blockquote
        if (line.startsWith('> '))
          return (
            <blockquote key={i} className="my-1 border-l-4 border-blue-400 pl-3 text-gray-500 italic dark:border-blue-500/60 dark:text-gray-400">
              {renderInline(line.slice(2))}
            </blockquote>
          );
        // Bullet list
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-gray-600 dark:text-gray-300">
              {renderInline(line.slice(2))}
            </li>
          );
        // Numbered list  1. item
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-gray-600 dark:text-gray-300">
              {renderInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          );
        // Divider
        if (line.trim() === '---')
          return <hr key={i} className="my-3 border-gray-200 dark:border-gray-700/60" />;
        // Empty line → spacer
        if (line.trim() === '')
          return <div key={i} className="h-2" />;
        // Paragraph
        return (
          <p key={i} className="leading-relaxed text-gray-600 dark:text-gray-300">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}
