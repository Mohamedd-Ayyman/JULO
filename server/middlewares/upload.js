import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const IMAGE_FORMATS = ["jpg", "png", "jpeg", "webp", "gif"];
const AUDIO_FORMATS = ["mp3", "mp4", "webm", "ogg", "wav", "m4a", "aac", "flac"];
const FILE_FORMATS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"];

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const AUDIO_MIMES = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/webm", "audio/ogg", "audio/wav", "audio/x-m4a", "audio/aac", "audio/flac"];
const FILE_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
];

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "julo",
    allowed_formats: IMAGE_FORMATS,
  },
});

const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "julo/recordings",
    resource_type: "video",
    allowed_formats: AUDIO_FORMATS,
  },
});

const chatFileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "julo/chat/files",
    resource_type: "raw",
    allowed_formats: FILE_FORMATS,
  },
});

const chatMediaStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    if (file.mimetype.startsWith("audio/")) {
      return { folder: "julo/chat/audio", resource_type: "video", allowed_formats: AUDIO_FORMATS };
    }
    if (file.mimetype.startsWith("image/")) {
      return { folder: "julo/chat/images", allowed_formats: IMAGE_FORMATS };
    }
    return { folder: "julo/chat/files", resource_type: "raw", allowed_formats: FILE_FORMATS };
  },
});

const chatMediaFileFilter = (req, file, cb) => {
  if (IMAGE_MIMES.includes(file.mimetype) || AUDIO_MIMES.includes(file.mimetype) || FILE_MIMES.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", [file.fieldname]));
};

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

export const uploadChatMedia = multer({
  storage: chatMediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: chatMediaFileFilter,
});

export const CHAT_MEDIA_MIMES = { IMAGE_MIMES, AUDIO_MIMES, FILE_MIMES };