import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "julo",
    allowed_formats: ["jpg", "png", "jpeg", "webp", "gif"],
  },
});

const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "julo/recordings",
    resource_type: "video",
    allowed_formats: ["mp3", "mp4", "webm", "ogg", "wav", "m4a", "aac", "flac"],
  },
});

const chatFileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "julo/chat",
    allowed_formats: ["jpg", "png", "jpeg", "webp", "gif", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"],
  },
});

export const upload = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

export const uploadChatFile = multer({
  storage: chatFileStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
});