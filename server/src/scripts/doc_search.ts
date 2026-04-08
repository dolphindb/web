import fetch from 'node-fetch';
import { ScriptConfig, ScriptResult } from '../types.js';
import { normalizeScriptArgs } from './helpers.js';
import { resolveDolphinDbDocUrl } from './doc_url.js';

const DDB_DOC_SEARCH_URL = 'https://dolphindb.cn/api/search';
const MAX_ITEMS_PER_PAGE = 30;
const DEFAULT_PAGE = 1;

type DocSearchApiItem = {
  content?: unknown;
  score?: unknown;
  title?: unknown;
  url?: unknown;
};

type DocSearchApiResponse = {
  items?: unknown;
  totalPage?: unknown;
  totalSearchItems?: unknown;
};

const toText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  return String(value);
};

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
  const num = toFiniteNumberOrNull(value);
  if (num == null) {
    return fallback;
  }
  const integer = Math.trunc(num);
  return integer > 0 ? integer : fallback;
};

const parseSearchResponse = (payload: unknown, query: string, pageToShow: number) => {
  const response = payload && typeof payload === 'object' ? (payload as DocSearchApiResponse) : {};
  const rawItems = Array.isArray(response.items) ? (response.items as DocSearchApiItem[]) : [];

  const items = rawItems.slice(0, MAX_ITEMS_PER_PAGE).map((item) => ({
    title: toText(item.title),
    content: toText(item.content),
    url: resolveDolphinDbDocUrl(toText(item.url)),
    score: toFiniteNumberOrNull(item.score),
  }));

  return {
    query,
    pageToShow,
    maxItemsPerPage: MAX_ITEMS_PER_PAGE,
    totalPage: toFiniteNumberOrNull(response.totalPage),
    totalSearchItems: toFiniteNumberOrNull(response.totalSearchItems),
    items,
  };
};

export const docSearchConfig: ScriptConfig = {
  function: 'doc_search',
  handler: async (type, content): Promise<ScriptResult> => {
    try {
      const args = normalizeScriptArgs(content);
      const query = (args[0] || '').trim();
      const pageToShow = toPositiveInt(args[1], DEFAULT_PAGE);

      if (!query) {
        return {
          next_loop: true,
          save_message: {
            role: 'user',
            messageType: 'tool_error',
            name: type,
            content: 'doc_search requires args[0] as search query.',
          },
        };
      }

      const response = await fetch(DDB_DOC_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          pageToShow,
          maxItemsPerPage: MAX_ITEMS_PER_PAGE,
          language: 'zh',
          version: '',
        }),
        signal: AbortSignal.timeout(45000) as any,
      });

      const raw = await response.text();
      if (!response.ok) {
        return {
          next_loop: true,
          save_message: {
            role: 'user',
            messageType: 'tool_error',
            name: type,
            content: `doc_search failed (${response.status}): ${raw || response.statusText}`,
          },
        };
      }

      let payload: unknown = null;
      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch {
        return {
          next_loop: true,
          save_message: {
            role: 'user',
            messageType: 'tool_error',
            name: type,
            content: `doc_search failed: response is not valid JSON: ${raw}`,
          },
        };
      }

      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_result',
          name: type,
          content: JSON.stringify(parseSearchResponse(payload, query, pageToShow)),
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
          content: `doc_search failed: ${messageContent}`,
        },
      };
    }
  },
};
