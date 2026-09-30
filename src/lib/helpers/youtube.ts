/**
 * Matches the YouTube URL forms Gemini accepts directly as video input
 * (the same patterns @ai-sdk/google passes through without downloading):
 * youtube.com/watch?v=ID and youtu.be/ID.
 */
const YOUTUBE_URL_PATTERN =
  /https:\/\/(?:(?:www\.)?youtube\.com\/watch\?v=[\w-]+(?:&[\w=&.-]*)?|youtu\.be\/[\w-]+(?:\?[\w=&.-]*)?)/g;

/** Other common YouTube forms, normalised to youtube.com/watch?v=ID. */
const YOUTUBE_ALT_PATTERN =
  /https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:shorts|live|embed)\/([\w-]+)[^\s]*|http:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]+)[^\s]*|https:\/\/m\.youtube\.com\/watch\?v=([\w-]+)[^\s]*/g;

/** Returns the unique YouTube video URLs found in text, in a form Gemini accepts. */
export function extractYouTubeUrls(text: string): string[] {
  const urls = new Set<string>();

  for (const match of text.matchAll(YOUTUBE_URL_PATTERN)) {
    urls.add(match[0]);
  }

  for (const match of text.matchAll(YOUTUBE_ALT_PATTERN)) {
    const id = match[1] ?? match[2] ?? match[3];
    if (id) urls.add(`https://www.youtube.com/watch?v=${id}`);
  }

  return [...urls];
}

/** Returns the video ID from a youtube.com/watch or youtu.be URL, or null. */
export function getYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const id =
      parsed.hostname === "youtu.be"
        ? parsed.pathname.slice(1)
        : parsed.pathname === "/watch"
          ? parsed.searchParams.get("v")
          : null;
    return id && /^[\w-]+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

const titleCache = new Map<string, Promise<string | null>>();

/**
 * Looks up a video's title via YouTube's public oEmbed endpoint, which allows
 * browser requests. Resolves to null if the video is private, removed, or the
 * lookup fails. Cached per video ID for the session.
 */
export function fetchYouTubeTitle(videoId: string): Promise<string | null> {
  let cached = titleCache.get(videoId);
  if (!cached) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    cached = fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { title?: unknown } | null) =>
        typeof data?.title === "string" && data.title.trim() ? data.title.trim() : null
      )
      .catch(() => null);
    titleCache.set(videoId, cached);
  }
  return cached;
}

export function isYouTubeUrl(url: string): boolean {
  return /^https:\/\/(?:(?:www\.)?youtube\.com\/watch\?v=|youtu\.be\/)/.test(url);
}
