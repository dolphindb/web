export const DDB_DOCS_BASE_URL = 'https://docs.dolphindb.cn';

const DOCS_HOST = 'docs.dolphindb.cn';
const DDB_RELATED_HOSTS = new Set(['dolphindb.cn', 'www.dolphindb.cn', DOCS_HOST]);

export const resolveDolphinDbDocUrl = (rawUrl: string): string => {
  const text = rawUrl.trim();
  if (!text) {
    return '';
  }

  try {
    if (/^https?:\/\//i.test(text)) {
      const parsed = new URL(text);
      if (DDB_RELATED_HOSTS.has(parsed.hostname.toLowerCase())) {
        parsed.protocol = 'https:';
        parsed.hostname = DOCS_HOST;
        parsed.port = '';
      }
      return parsed.toString();
    }

    const normalizedPath = text.startsWith('/') ? text : `/${text}`;
    return new URL(normalizedPath, DDB_DOCS_BASE_URL).toString();
  } catch {
    return '';
  }
};
