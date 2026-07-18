const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+|www\.[^\s<>"{}|\\^`[\]]+/gi;

export function extractUrls(text) {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  return [...new Set(matches)].map((url) => {
    let normalized = url;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }
    return normalized;
  });
}

export function isUrl(text) {
  if (!text) return false;
  return URL_REGEX.test(text.trim());
}

export function isValidUrl(string) {
  try {
    const url = new URL(string);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}
