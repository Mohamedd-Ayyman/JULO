import cloudinary from "../config/cloudinary.js";
import { config } from "../config/env.js";
import { AppError } from "./AppError.js";

const isCloudinaryConfigured = Boolean(
  config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret
);

const IMAGE_TRANSFORMATIONS = {
  thumbnail: { width: 150, height: 150, crop: "fill", quality: "auto:low", format: "auto" },
  preview: { width: 400, height: 400, crop: "limit", quality: "auto:good", format: "auto" },
  optimized: { width: 1200, height: 1200, crop: "limit", quality: "auto", format: "auto" },
};

const VIDEO_TRANSFORMATIONS = {
  thumbnail: { width: 320, height: 180, crop: "fill", quality: "auto:low", format: "mp4" },
  preview: { width: 640, height: 360, crop: "limit", quality: "auto:good", format: "mp4" },
};

function getMediaType(mimeType) {
  if (!mimeType) return "file";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}

function extractPublicId(url) {
  if (!url) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  return match ? match[1] : null;
}

export function generateThumbnailUrl(cdnUrl, mediaType) {
  if (!cdnUrl || mediaType !== "image") return null;
  if (!isCloudinaryConfigured) return cdnUrl;
  const publicId = extractPublicId(cdnUrl);
  if (!publicId) return cdnUrl;
  const t = IMAGE_TRANSFORMATIONS.thumbnail;
  return cloudinary.url(publicId, {
    transformation: [t],
    secure: true,
    sign_url: false,
  });
}

export function generateOptimizedUrl(cdnUrl, mediaType) {
  if (!cdnUrl) return cdnUrl;
  if (!isCloudinaryConfigured) return cdnUrl;
  const publicId = extractPublicId(cdnUrl);
  if (!publicId) return cdnUrl;

  if (mediaType === "image") {
    const t = IMAGE_TRANSFORMATIONS.optimized;
    return cloudinary.url(publicId, { transformation: [t], secure: true, sign_url: false });
  }
  if (mediaType === "audio") {
    return cloudinary.url(publicId, {
      resource_type: "video",
      secure: true,
      sign_url: false,
      format: "mp3",
    });
  }
  return cdnUrl;
}

export function generateSignedUrl(cdnUrl, mediaType, expiresInSeconds = 3600) {
  if (!cdnUrl) return null;
  if (!isCloudinaryConfigured) return cdnUrl;
  const publicId = extractPublicId(cdnUrl);
  if (!publicId) return cdnUrl;

  const resourceType = mediaType === "audio" ? "video" : mediaType === "file" ? "raw" : "image";
  const expiration = Math.floor(Date.now() / 1000) + expiresInSeconds;

  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: "authenticated",
    secure: true,
    sign_url: true,
    expires_at: expiration,
  });
}

export function generatePreviewUrl(cdnUrl, mediaType) {
  if (!cdnUrl) return cdnUrl;
  if (!isCloudinaryConfigured) return cdnUrl;
  const publicId = extractPublicId(cdnUrl);
  if (!publicId) return cdnUrl;

  if (mediaType === "image") {
    const t = IMAGE_TRANSFORMATIONS.preview;
    return cloudinary.url(publicId, { transformation: [t], secure: true, sign_url: false });
  }
  if (mediaType === "audio") {
    const t = VIDEO_TRANSFORMATIONS.preview;
    return cloudinary.url(publicId, {
      resource_type: "video",
      transformation: [t],
      secure: true,
      sign_url: false,
    });
  }
  return cdnUrl;
}

export async function uploadBuffer(buffer, options = {}) {
  if (!isCloudinaryConfigured) {
    throw new AppError("Cloudinary is not configured", 500);
  }

  const { folder = config.cloudinary.folder, resourceType = "auto", mimeType } = options;
  const mediaType = getMediaType(mimeType);

  const uploadOptions = { folder, resource_type: resourceType };
  if (mediaType === "audio") {
    uploadOptions.resource_type = "video";
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

export async function deleteResource(cdnUrl) {
  if (!cdnUrl || !isCloudinaryConfigured) return null;
  const publicId = extractPublicId(cdnUrl);
  if (!publicId) return null;

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
    return result;
  } catch (err) {
    return null;
  }
}

export { isCloudinaryConfigured, IMAGE_TRANSFORMATIONS, VIDEO_TRANSFORMATIONS, getMediaType };
