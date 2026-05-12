/**
 * Blogs platform. Aggregates posts from a user-configured list of blog URLs.
 *
 * For each blog we try to discover an RSS/Atom feed (either via the HTML
 * `<link rel="alternate">` hint, or by probing a small list of common feed
 * paths). When a feed is parsed we normalize each entry into a `Post`. If no
 * feed can be found we fall back to scraping article links from the landing
 * page. Cached per blog URL so the network is only touched once per TTL.
 */

import { createHash } from "node:crypto";
import { load as loadHtml } from "cheerio";
import { XMLParser } from "fast-xml-parser";
import { request } from "undici";

import { cacheGet, cacheKey, cacheSet } from "../cache.js";
import type { Config, FetchQuery, Post } from "../types.js";
import { type Platform, durationToRange, truncateText } from "./_base.js";

const USER_AGENT = "social-context/0.1";

const FEED_PROBE_PATHS = [
  "/feed",
  "/feed/",
  "/rss",
  "/rss.xml",
  "/atom.xml",
  "/index.xml",
  "/feed.xml",
];

const SCRAPE_LINK_SELECTORS = ["article a", ".post-title a", "h2 a", "h3 a"];

async function httpGet(
  url: string,
): Promise<{ status: number; body: string; contentType: string }> {
  const { statusCode, headers, body } = await request(url, {
    method: "GET",
    headers: {
      "User-Agent": USER_AGENT,
      Accept:
        "text/html,application/xhtml+xml,application/xml,application/rss+xml,application/atom+xml;q=0.9,*/*;q=0.8",
    },
  });
  const text = await body.text();
  const ctRaw = headers["content-type"];
  const contentType = Array.isArray(ctRaw) ? (ctRaw[0] ?? "") : (ctRaw ?? "");
  return { status: statusCode, body: text, contentType };
}

function shortId(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function resolveUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj["#text"] === "string") return obj["#text"];
    if (typeof obj._ === "string") return obj._;
  }
  return undefined;
}

function asArray<T = unknown>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function pickLink(value: unknown, base: string): string | undefined {
  if (typeof value === "string") return resolveUrl(base, value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = pickLink(item, base);
      if (found) return found;
    }
    return undefined;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const attrs = obj[":@"] as Record<string, unknown> | undefined;
    const rel = (attrs?.["@_rel"] ?? obj["@_rel"]) as string | undefined;
    const href = (attrs?.["@_href"] ?? obj["@_href"]) as string | undefined;
    if (href && (!rel || rel === "alternate")) return resolveUrl(base, href);
    if (typeof obj["#text"] === "string") return resolveUrl(base, obj["#text"]);
  }
  return undefined;
}

function pickAuthor(entry: Record<string, unknown>): string | undefined {
  const dcCreator = entry["dc:creator"];
  const directAuthor = entry.author;
  if (typeof dcCreator === "string" && dcCreator.trim()) return dcCreator.trim();
  if (typeof directAuthor === "string" && directAuthor.trim()) return directAuthor.trim();
  if (directAuthor && typeof directAuthor === "object") {
    const obj = directAuthor as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj["#text"] === "string") return obj["#text"];
  }
  return undefined;
}

function parseDateOrNow(raw: string | undefined): string {
  if (!raw) return new Date().toISOString();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

/** Look at HTML head for a feed `<link rel="alternate">`. */
function discoverFeedFromHtml(html: string, base: string): string | undefined {
  const $ = loadHtml(html);
  const candidates = $('link[rel="alternate"]');
  for (const el of candidates.toArray()) {
    const type = ($(el).attr("type") ?? "").toLowerCase();
    const href = $(el).attr("href");
    if (!href) continue;
    if (type.includes("rss") || type.includes("atom") || type.includes("xml")) {
      return resolveUrl(base, href);
    }
  }
  return undefined;
}

interface FeedEntry {
  title: string;
  text: string;
  author: string | undefined;
  posted_at: string;
  url: string;
}

function parseFeed(xml: string, base: string): FeedEntry[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
    parseTagValue: false,
    trimValues: true,
  });

  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch {
    return [];
  }

  if (!doc || typeof doc !== "object") return [];
  const root = doc as Record<string, unknown>;

  const rss = root.rss as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  if (channel) {
    const items = asArray<Record<string, unknown>>(
      channel.item as Record<string, unknown> | Record<string, unknown>[] | undefined,
    );
    return items.map((item) => {
      const link = pickLink(item.link, base) ?? "";
      const description =
        asString(item.description) ??
        asString(item["content:encoded"]) ??
        asString(item.summary) ??
        "";
      return {
        title: asString(item.title) ?? "",
        text: truncateText(description),
        author: pickAuthor(item),
        posted_at: parseDateOrNow(asString(item.pubDate) ?? asString(item.published)),
        url: link,
      };
    });
  }

  const feed = root.feed as Record<string, unknown> | undefined;
  if (feed) {
    const entries = asArray<Record<string, unknown>>(
      feed.entry as Record<string, unknown> | Record<string, unknown>[] | undefined,
    );
    return entries.map((entry) => {
      const link = pickLink(entry.link, base) ?? "";
      const content =
        asString(entry.content) ??
        asString(entry.summary) ??
        asString(entry["content:encoded"]) ??
        "";
      return {
        title: asString(entry.title) ?? "",
        text: truncateText(content),
        author: pickAuthor(entry),
        posted_at: parseDateOrNow(
          asString(entry.updated) ?? asString(entry.published) ?? asString(entry.pubDate),
        ),
        url: link,
      };
    });
  }

  return [];
}

/** Scrape article links from a landing page as a last resort. */
function scrapeArticleLinks(html: string, base: string): FeedEntry[] {
  const $ = loadHtml(html);
  const seen = new Set<string>();
  const entries: FeedEntry[] = [];

  for (const selector of SCRAPE_LINK_SELECTORS) {
    $(selector).each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const abs = resolveUrl(base, href);
      if (seen.has(abs)) return;
      seen.add(abs);
      const title = $(el).text().trim();
      if (!title) return;
      entries.push({
        title,
        text: "",
        author: undefined,
        posted_at: new Date().toISOString(),
        url: abs,
      });
    });
    if (entries.length >= 20) break;
  }

  return entries.slice(0, 20);
}

async function discoverFeedUrl(blogUrl: string, html: string): Promise<string | undefined> {
  const fromHtml = discoverFeedFromHtml(html, blogUrl);
  if (fromHtml) return fromHtml;

  for (const path of FEED_PROBE_PATHS) {
    const candidate = resolveUrl(blogUrl, path);
    try {
      const res = await httpGet(candidate);
      if (res.status >= 200 && res.status < 300) {
        const ct = res.contentType.toLowerCase();
        const looksLikeXml =
          ct.includes("xml") ||
          ct.includes("rss") ||
          ct.includes("atom") ||
          res.body.trimStart().startsWith("<?xml") ||
          /<rss\b/i.test(res.body) ||
          /<feed\b/i.test(res.body);
        if (looksLikeXml) return candidate;
      }
    } catch {
      // continue probing
    }
  }
  return undefined;
}

async function fetchBlogEntries(blogUrl: string, ttlSeconds: number): Promise<FeedEntry[]> {
  const key = cacheKey("blogs", blogUrl);
  const cached = cacheGet<FeedEntry[]>(key);
  if (cached) return cached;

  let entries: FeedEntry[] = [];

  try {
    const initial = await httpGet(blogUrl);
    if (initial.status < 200 || initial.status >= 400) {
      return [];
    }

    const ct = initial.contentType.toLowerCase();
    const looksLikeFeed =
      ct.includes("xml") ||
      ct.includes("rss") ||
      ct.includes("atom") ||
      initial.body.trimStart().startsWith("<?xml") ||
      /<rss\b/i.test(initial.body.slice(0, 2000)) ||
      /<feed\b/i.test(initial.body.slice(0, 2000));

    if (looksLikeFeed) {
      entries = parseFeed(initial.body, blogUrl);
    } else {
      const feedUrl = await discoverFeedUrl(blogUrl, initial.body);
      if (feedUrl) {
        const feedRes = await httpGet(feedUrl);
        if (feedRes.status >= 200 && feedRes.status < 300) {
          entries = parseFeed(feedRes.body, feedUrl);
        }
      }
      if (entries.length === 0) {
        entries = scrapeArticleLinks(initial.body, blogUrl);
      }
    }
  } catch {
    return [];
  }

  // Filter out entries with no url.
  entries = entries.filter((e) => !!e.url);

  cacheSet(key, entries, ttlSeconds);
  return entries;
}

function entryToPost(entry: FeedEntry): Post {
  return {
    id: shortId(entry.url),
    source: "blogs",
    sub_source: safeHostname(entry.url),
    title: entry.title,
    text: entry.text,
    author: entry.author,
    posted_at: entry.posted_at,
    url: entry.url,
    score: undefined,
    comments: undefined,
  };
}

function matchesQueryTerms(post: Post, query: string): boolean {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (terms.length === 0) return true;
  const haystack = `${post.title}\n${post.text}`.toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

export const blogsPlatform: Platform = {
  name: "blogs",
  isEnabled(config) {
    return config.blogs.length > 0;
  },
  async fetch(query: FetchQuery, config: Config): Promise<Post[]> {
    const blogs = query.blog_urls && query.blog_urls.length > 0 ? query.blog_urls : config.blogs;
    if (blogs.length === 0) return [];

    const { start, end } = durationToRange(query.since);

    const batches = await Promise.all(
      blogs.map((blog) =>
        fetchBlogEntries(blog, config.cache_ttl_seconds).catch(() => [] as FeedEntry[]),
      ),
    );

    const seen = new Set<string>();
    const posts: Post[] = [];
    for (const batch of batches) {
      for (const entry of batch) {
        const post = entryToPost(entry);
        if (seen.has(post.id)) continue;
        const posted = new Date(post.posted_at).getTime();
        if (Number.isFinite(posted) && (posted < start.getTime() || posted > end.getTime())) {
          continue;
        }
        if (query.query && !matchesQueryTerms(post, query.query)) continue;
        seen.add(post.id);
        posts.push(post);
      }
    }

    posts.sort((a, b) => {
      const ta = new Date(a.posted_at).getTime();
      const tb = new Date(b.posted_at).getTime();
      return tb - ta;
    });

    return posts;
  },
};
