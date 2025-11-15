'use client';

import React from 'react';
import Link from 'next/link';

/**
 * MessageFormatter - Component format tin nhắn từ bot với UI/UX đẹp
 * Hỗ trợ:
 * - Danh sách gạch đầu dòng (bullet points)
 * - Danh sách đánh số (numbered lists)
 * - In đậm (**text**)
 * - In nghiêng (*text*)
 * - Code inline (`code`)
 * - Links [text](url)
 * - Line breaks
 */

const MessageFormatter = ({ message }) => {
  if (!message) return null;

  // Parse message into structured blocks
  const parseMessage = (text) => {
    // STEP 1: Try to detect single-line comma-separated lists FIRST
    // This handles: "Items: "A", "B", "C", và "D"."
    if (text.split('\n').length === 1) {
      // Pattern 1: Quoted items with commas
      const quotedItems = text.match(/["\"](.*?)["\"]/g);
      if (quotedItems && quotedItems.length >= 2) {
        // Find the intro part (everything before first quote)
        const firstQuoteIndex = text.indexOf(quotedItems[0]);
        const intro = text.substring(0, firstQuoteIndex).trim();
        
        // Clean up quoted items
        const items = quotedItems.map(item => 
          item.replace(/^["\"']|["\"']$/g, '').trim()
        );
        
        return [
          {
            type: 'paragraph',
            lines: [intro]
          },
          {
            type: 'bullet-list',
            items: items.map(content => ({ content }))
          }
        ];
      }
      
      // Pattern 2: Plain comma-separated with "và/and/or"
      // "Items: A, B, C, và D"
      const hasCommaList = text.includes(',') && 
        (text.includes(' và ') || text.includes(' and ') || text.includes(' or ') || text.includes(' hoặc '));
      
      if (hasCommaList) {
        // Find intro (text before colon or first comma)
        const colonIndex = text.indexOf(':');
        if (colonIndex > -1) {
          const intro = text.substring(0, colonIndex + 1).trim();
          const listPart = text.substring(colonIndex + 1).trim();
          
          // Split by comma and final connector
          let items = [];
          
          // Handle "A, B, C, và D" pattern
          const lastConnectorMatch = listPart.match(/,\s*(và|and|or|hoặc)\s+([^,.]+)[.。]?$/i);
          if (lastConnectorMatch) {
            const beforeLast = listPart.substring(0, lastConnectorMatch.index);
            const lastItem = lastConnectorMatch[2].trim();
            
            items = beforeLast.split(',').map(item => item.trim()).filter(Boolean);
            items.push(lastItem);
          } else {
            items = listPart.split(',').map(item => item.trim().replace(/[.。]$/, '')).filter(Boolean);
          }
          
          if (items.length >= 2) {
            return [
              {
                type: 'paragraph',
                lines: [intro]
              },
              {
                type: 'bullet-list',
                items: items.map(content => ({ content }))
              }
            ];
          }
        }
      }
    }
    
    // STEP 2: Multi-line parsing (original logic)
    const lines = text.split('\n');
    const blocks = [];
    let currentBlock = null;

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) {
        if (currentBlock) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        return;
      }

      // Detect numbered list: "1. ", "2. ", "3. " etc
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        const [, num, content] = numberedMatch;
        if (!currentBlock || currentBlock.type !== 'numbered-list') {
          if (currentBlock) blocks.push(currentBlock);
          currentBlock = { type: 'numbered-list', items: [] };
        }
        currentBlock.items.push({ number: num, content });
        return;
      }

      // Detect bullet list: "- ", "* ", "• " etc
      const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
      if (bulletMatch) {
        const [, content] = bulletMatch;
        if (!currentBlock || currentBlock.type !== 'bullet-list') {
          if (currentBlock) blocks.push(currentBlock);
          currentBlock = { type: 'bullet-list', items: [] };
        }
        currentBlock.items.push({ content });
        return;
      }

      // Detect heading: "## Heading" or "### Heading"
      const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        if (currentBlock) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        const [, hashes, content] = headingMatch;
        blocks.push({ type: 'heading', level: hashes.length, content });
        return;
      }

      // Detect code block: ```code```
      if (trimmed.startsWith('```')) {
        if (!currentBlock || currentBlock.type !== 'code-block') {
          if (currentBlock) blocks.push(currentBlock);
          currentBlock = { type: 'code-block', lines: [] };
        } else {
          // Closing ```
          blocks.push(currentBlock);
          currentBlock = null;
        }
        return;
      }

      // If inside code block, add line
      if (currentBlock && currentBlock.type === 'code-block') {
        currentBlock.lines.push(line);
        return;
      }

      // Regular text paragraph
      if (!currentBlock || currentBlock.type !== 'paragraph') {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'paragraph', lines: [] };
      }
      currentBlock.lines.push(trimmed);
    });

    // Push final block
    if (currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  };

  // Format inline text (bold, italic, code, links)
  const formatInlineText = (text) => {
    if (!text) return null;

    const parts = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Match **bold**
      const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
      if (boldMatch) {
        parts.push(
          <strong key={`bold-${key++}`} className="font-semibold text-gray-900">
            {boldMatch[1]}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Match *italic*
      const italicMatch = remaining.match(/^\*(.+?)\*/);
      if (italicMatch) {
        parts.push(
          <em key={`italic-${key++}`} className="italic text-gray-800">
            {italicMatch[1]}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Match `code`
      const codeMatch = remaining.match(/^`(.+?)`/);
      if (codeMatch) {
        parts.push(
          <code key={`code-${key++}`} className="rounded bg-gray-200 px-1.5 py-0.5 text-sm font-mono text-gray-800">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Match [text](url)
      const linkMatch = remaining.match(/^\[(.+?)\]\((.+?)\)/);
      if (linkMatch) {
        const [, linkText, url] = linkMatch;
        parts.push(
          <Link
            key={`link-${key++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-medium"
          >
            {linkText}
          </Link>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Regular text
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    }

    return parts;
  };

  // Render blocks
  const renderBlocks = (blocks) => {
    return blocks.map((block, idx) => {
      switch (block.type) {
        case 'heading':
          const HeadingTag = `h${Math.min(block.level + 2, 6)}`; // h3, h4, h5
          return React.createElement(
            HeadingTag,
            {
              key: `heading-${idx}`,
              className: `font-bold text-gray-900 mb-2 ${
                block.level === 1 ? 'text-lg' : block.level === 2 ? 'text-base' : 'text-sm'
              }`,
            },
            formatInlineText(block.content)
          );

        case 'bullet-list':
          return (
            <ul key={`bullet-${idx}`} className="ml-4 space-y-1.5 my-2">
              {block.items.map((item, itemIdx) => (
                <li key={`bullet-item-${idx}-${itemIdx}`} className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5 flex-shrink-0">•</span>
                  <span className="text-gray-800">{formatInlineText(item.content)}</span>
                </li>
              ))}
            </ul>
          );

        case 'numbered-list':
          return (
            <ol key={`numbered-${idx}`} className="ml-4 space-y-1.5 my-2">
              {block.items.map((item, itemIdx) => (
                <li key={`numbered-item-${idx}-${itemIdx}`} className="flex items-start gap-2">
                  <span className="text-blue-600 font-semibold mt-0.5 flex-shrink-0 min-w-[24px]">
                    {item.number}.
                  </span>
                  <span className="text-gray-800">{formatInlineText(item.content)}</span>
                </li>
              ))}
            </ol>
          );

        case 'code-block':
          return (
            <pre
              key={`code-block-${idx}`}
              className="rounded-lg bg-gray-900 p-3 text-sm font-mono text-gray-100 overflow-x-auto my-2"
            >
              <code>{block.lines.join('\n')}</code>
            </pre>
          );

        case 'paragraph':
          return (
            <p key={`paragraph-${idx}`} className="text-gray-800 leading-relaxed mb-2">
              {block.lines.map((line, lineIdx) => (
                <React.Fragment key={`line-${idx}-${lineIdx}`}>
                  {lineIdx > 0 && <br />}
                  {formatInlineText(line)}
                </React.Fragment>
              ))}
            </p>
          );

        default:
          return null;
      }
    });
  };

  const blocks = parseMessage(message);

  return (
    <div className="space-y-1">
      {renderBlocks(blocks)}
    </div>
  );
};

export default MessageFormatter;
