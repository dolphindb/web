import fetch from 'node-fetch';
import { parse, type HTMLElement, type Node as HtmlNode, NodeType } from 'node-html-parser';
import { ScriptConfig, ScriptResult } from '../types.js';
import { normalizeScriptArgs } from './helpers.js';
import { resolveDolphinDbDocUrl } from './doc_url.js';

const DEFAULT_MAX_CHARS = 50000;
const MAX_ALLOWED_CHARS = 150000;
const REQUEST_TIMEOUT_MS = 45000;

const DROP_SELECTORS = [
  'script',
  'style',
  'noscript',
  'svg',
  'iframe',
  'button',
  'input',
  'select',
  'textarea',
  'nav',
  'header',
  'footer',
  '.wh_topic_toc',
  '.wh_related_links',
  '.wh_topic_breadcrumb',
  '.wh_breadcrumb',
  '.wh_print_link',
  '.wh_navigation_links',
  '.navheader',
  '.navfooter',
];

const BLOCK_TAGS = new Set([
  'div',
  'section',
  'article',
  'main',
  'aside',
  'details',
  'summary',
  'p',
  'pre',
  'ul',
  'ol',
  'table',
  'blockquote',
  'hr',
]);

const toFiniteNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const toPositiveInt = (value: unknown, fallback: number): number => {
  const parsed = toFiniteNumberOrNull(value);
  if (parsed == null) {
    return fallback;
  }

  const integer = Math.trunc(parsed);
  return integer > 0 ? integer : fallback;
};

const clampMaxChars = (value: unknown): number => {
  const maxChars = toPositiveInt(value, DEFAULT_MAX_CHARS);
  return Math.min(maxChars, MAX_ALLOWED_CHARS);
};

const isElementNode = (node: HtmlNode): node is HTMLElement => {
  return node.nodeType === NodeType.ELEMENT_NODE;
};

const normalizeTextNode = (text: string): string => {
  return text.replace(/\s+/g, ' ');
};

const normalizeInlineText = (text: string): string => {
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ');
};

const normalizeFinalMarkdown = (text: string): string => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const escapeInlineCode = (text: string): string => text.replace(/`/g, '\\`');
const escapeTableCell = (text: string): string => text.replace(/\|/g, '\\|');

const resolveLink = (href: string | undefined, pageUrl: string): string => {
  const raw = (href || '').trim();
  if (!raw || raw.startsWith('#') || raw.toLowerCase().startsWith('javascript:')) {
    return '';
  }

  if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) {
    return resolveDolphinDbDocUrl(raw);
  }

  try {
    return new URL(raw, pageUrl).toString();
  } catch {
    return '';
  }
};

const renderNodes = (nodes: HtmlNode[], pageUrl: string): string => {
  return nodes.map((node) => renderNode(node, pageUrl)).join('');
};

const renderList = (element: HTMLElement, ordered: boolean, pageUrl: string): string => {
  const liNodes = element.childNodes.filter((child) => isElementNode(child) && child.tagName.toLowerCase() === 'li');
  const lines: string[] = [];

  liNodes.forEach((item, index) => {
    const content = normalizeInlineText(renderNodes(item.childNodes, pageUrl)).trim();
    if (!content) {
      return;
    }

    const prefix = ordered ? `${index + 1}. ` : '- ';
    const indent = ' '.repeat(prefix.length);
    const formatted = content
      .split('\n')
      .map((line, lineIndex) => (lineIndex === 0 ? `${prefix}${line}` : `${indent}${line}`))
      .join('\n');

    lines.push(formatted);
  });

  return lines.length > 0 ? `${lines.join('\n')}\n\n` : '';
};

const renderTable = (element: HTMLElement, pageUrl: string): string => {
  const rowNodes = element.querySelectorAll('tr');
  const rows = rowNodes
    .map((row) => {
      const cells = row.childNodes
        .filter((child) => isElementNode(child))
        .filter((child) => {
          const tag = child.tagName.toLowerCase();
          return tag === 'th' || tag === 'td';
        })
        .map((cell) => escapeTableCell(normalizeInlineText(renderNodes(cell.childNodes, pageUrl)).trim()));
      return cells;
    })
    .filter((row) => row.length > 0);

  if (rows.length === 0) {
    return '';
  }

  const columnCount = Math.max(...rows.map((row) => row.length));
  const normalizeRow = (row: string[]): string[] => {
    if (row.length >= columnCount) {
      return row;
    }
    return [...row, ...new Array(columnCount - row.length).fill('')];
  };

  const normalizedRows = rows.map(normalizeRow);
  const header = normalizedRows[0];
  const body = normalizedRows.slice(1);
  const headerLine = `| ${header.join(' | ')} |`;
  const separatorLine = `| ${new Array(columnCount).fill('---').join(' | ')} |`;
  const bodyLines = body.map((row) => `| ${row.join(' | ')} |`);

  return [headerLine, separatorLine, ...bodyLines].join('\n') + '\n\n';
};

const renderNode = (node: HtmlNode, pageUrl: string): string => {
  if (node.nodeType === NodeType.TEXT_NODE) {
    return normalizeTextNode(node.text);
  }

  if (!isElementNode(node)) {
    return '';
  }

  const tag = node.tagName.toLowerCase();
  if (tag === 'br') {
    return '\n';
  }

  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag.slice(1));
    const text = normalizeInlineText(renderNodes(node.childNodes, pageUrl)).trim();
    return text ? `${'#'.repeat(level)} ${text}\n\n` : '';
  }

  if (tag === 'p') {
    const text = normalizeInlineText(renderNodes(node.childNodes, pageUrl)).trim();
    return text ? `${text}\n\n` : '';
  }

  if (tag === 'pre') {
    const code = node.textContent.replace(/\r\n/g, '\n').trimEnd();
    return code ? `\`\`\`\n${code}\n\`\`\`\n\n` : '';
  }

  if (tag === 'code') {
    const code = node.textContent.replace(/\s+/g, ' ').trim();
    return code ? `\`${escapeInlineCode(code)}\`` : '';
  }

  if (tag === 'a') {
    const label = normalizeInlineText(renderNodes(node.childNodes, pageUrl)).trim();
    const resolvedHref = resolveLink(node.getAttribute('href'), pageUrl);
    if (!resolvedHref) {
      return label;
    }
    const text = label || resolvedHref;
    return `[${text}](${resolvedHref})`;
  }

  if (tag === 'strong' || tag === 'b') {
    const text = normalizeInlineText(renderNodes(node.childNodes, pageUrl)).trim();
    return text ? `**${text}**` : '';
  }

  if (tag === 'em' || tag === 'i') {
    const text = normalizeInlineText(renderNodes(node.childNodes, pageUrl)).trim();
    return text ? `*${text}*` : '';
  }

  if (tag === 'blockquote') {
    const content = normalizeInlineText(renderNodes(node.childNodes, pageUrl)).trim();
    if (!content) {
      return '';
    }
    const lines = content.split('\n').map((line) => `> ${line}`);
    return `${lines.join('\n')}\n\n`;
  }

  if (tag === 'ul' || tag === 'ol') {
    return renderList(node, tag === 'ol', pageUrl);
  }

  if (tag === 'table') {
    return renderTable(node, pageUrl);
  }

  const content = renderNodes(node.childNodes, pageUrl);
  if (BLOCK_TAGS.has(tag)) {
    const text = normalizeInlineText(content).trim();
    return text ? `${text}\n\n` : '';
  }

  return content;
};

const trimByMaxChars = (text: string, maxChars: number): { content: string; truncated: boolean } => {
  if (text.length <= maxChars) {
    return {
      content: text,
      truncated: false,
    };
  }

  const cutoff = Math.max(0, maxChars - 24);
  const truncatedText = `${text.slice(0, cutoff).trimEnd()}\n\n[内容过长，已截断]`;
  return {
    content: truncatedText,
    truncated: true,
  };
};

const extractDocContentMarkdown = (html: string, pageUrl: string): { title: string; markdown: string } => {
  const root = parse(html, { comment: false });
  const contentRoot = root.querySelector('div.wh_topic_content.body') ?? root.querySelector('div.wh_topic_content');

  if (!contentRoot) {
    throw new Error('Cannot find content node: div.wh_topic_content.body');
  }

  DROP_SELECTORS.forEach((selector) => {
    contentRoot.querySelectorAll(selector).forEach((node) => node.remove());
  });

  const titleFromH1 = contentRoot.querySelector('h1')?.textContent?.trim() || '';
  const titleFromDoc = root.querySelector('title')?.textContent?.trim() || '';
  const title = titleFromH1 || titleFromDoc;

  const markdown = normalizeFinalMarkdown(renderNodes(contentRoot.childNodes, pageUrl));
  return {
    title,
    markdown,
  };
};

export const docReadConfig: ScriptConfig = {
  function: 'doc_read',
  handler: async (type, content): Promise<ScriptResult> => {
    try {
      const args = normalizeScriptArgs(content);
      const rawDocUrl = (args[0] || '').trim();
      const maxChars = clampMaxChars(args[1]);

      if (!rawDocUrl) {
        return {
          next_loop: true,
          save_message: {
            role: 'user',
            messageType: 'tool_error',
            name: type,
            content: 'doc_read requires args[0] as doc path or URL.',
          },
        };
      }

      const pageUrl = resolveDolphinDbDocUrl(rawDocUrl);
      if (!pageUrl) {
        return {
          next_loop: true,
          save_message: {
            role: 'user',
            messageType: 'tool_error',
            name: type,
            content: `doc_read failed: invalid doc URL/path: ${rawDocUrl}`,
          },
        };
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const response = await fetch(pageUrl, {
        method: 'GET',
        signal: controller.signal as any,
      });
      clearTimeout(timer);

      const rawHtml = await response.text();
      if (!response.ok) {
        return {
          next_loop: true,
          save_message: {
            role: 'user',
            messageType: 'tool_error',
            name: type,
            content: `doc_read failed (${response.status}): ${rawHtml || response.statusText}`,
          },
        };
      }

      const extracted = extractDocContentMarkdown(rawHtml, pageUrl);
      const trimmed = trimByMaxChars(extracted.markdown, maxChars);

      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_result',
          name: type,
          content: JSON.stringify({
            url: pageUrl,
            title: extracted.title,
            maxChars,
            truncated: trimmed.truncated,
            content: trimmed.content,
          }),
        },
      };
    } catch (error) {
      const messageContent = error instanceof Error ? error.message : String(error);
      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_error',
          name: type,
          content: `doc_read failed: ${messageContent}`,
        },
      };
    }
  },
};
