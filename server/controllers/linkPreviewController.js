import express from "express";
import ogs from "open-graph-scraper";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { asyncHandler, AppError } from "../utils/AppError.js";

const router = express.Router();

const previewCache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

const cleanUrl = (url) => {
  try {
    const u = new URL(url);
    return u.origin + u.pathname + u.search;
  } catch {
    return url;
  }
};

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      throw new AppError("URL is required", 400);
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new AppError("Only HTTP/HTTPS URLs are supported", 400);
      }
    } catch (e) {
      if (e.statusCode) throw e;
      throw new AppError("Invalid URL", 400);
    }

    const cached = previewCache.get(cleanUrl(url));
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return res.send({ success: true, data: cached.data, statusCode: 200 });
    }

    let result;
    try {
      result = await ogs({
        url: parsedUrl.href,
        timeout: 5000,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; JuloBot/1.0)" },
      });
    } catch {
      return res.send({
        success: true,
        data: { title: parsedUrl.hostname, description: "", image: "", url: parsedUrl.href, siteName: parsedUrl.hostname },
        statusCode: 200,
      });
    }

    const { ogTitle, ogDescription, ogImage, ogSiteName } = result.result || {};
    const imageData = Array.isArray(ogImage) ? ogImage[0] : ogImage;
    const preview = {
      title: ogTitle || parsedUrl.hostname,
      description: ogDescription || "",
      image: typeof imageData === "string" ? imageData : imageData?.url || "",
      url: parsedUrl.href,
      siteName: ogSiteName || parsedUrl.hostname,
    };

    previewCache.set(cleanUrl(url), { data: preview, ts: Date.now() });

    if (previewCache.size > 500) {
      const oldest = previewCache.keys().next().value;
      previewCache.delete(oldest);
    }

    res.send({ success: true, data: preview, statusCode: 200 });
  })
);

export default router;
