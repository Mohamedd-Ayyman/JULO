import { useState, useEffect, useRef, useCallback } from "react";
import { fetchLinkPreview } from "../apiCalls/message.js";
import { extractUrls } from "../lib/urlDetect.js";

const previewCache = new Map();

export default function useLinkPreview(text) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const fetchPreview = useCallback(async (url) => {
    if (previewCache.has(url)) {
      setPreview(previewCache.get(url));
      return;
    }
    setLoading(true);
    try {
      const res = await fetchLinkPreview(url);
      if (res.success && res.data) {
        previewCache.set(url, res.data);
        setPreview(res.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!text) {
      setPreview(null);
      return;
    }
    const urls = extractUrls(text);
    if (urls.length === 0) {
      setPreview(null);
      return;
    }
    timerRef.current = setTimeout(() => {
      fetchPreview(urls[0]);
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, fetchPreview]);

  const clear = useCallback(() => setPreview(null), []);

  return { preview, loading, clear };
}
