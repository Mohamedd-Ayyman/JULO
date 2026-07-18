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

const MAGIC_BYTES = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38]],
  "image/webp": [
    [0x52, 0x49, 0x46, 0x46],
  ],
  "audio/mpeg": [[0xff, 0xfb], [0xff, 0xf3], [0xff, 0xf2], [0x49, 0x44, 0x33]],
  "audio/ogg": [[0x4f, 0x67, 0x67, 0x53]],
  "audio/wav": [[0x52, 0x49, 0x46, 0x46]],
  "audio/flac": [[0x66, 0x4c, 0x61, 0x43]],
  "audio/mp4": [[0x66, 0x74, 0x79, 0x70]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "application/msword": [[0xd0, 0xcf, 0x11, 0xe0]],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [[0x50, 0x4b, 0x03, 0x04]],
  "application/vnd.ms-excel": [[0xd0, 0xcf, 0x11, 0xe0]],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [[0x50, 0x4b, 0x03, 0x04]],
  "application/vnd.ms-powerpoint": [[0xd0, 0xcf, 0x11, 0xe0]],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [[0x50, 0x4b, 0x03, 0x04]],
};

function verifyMagicBytes(buffer, claimedMime) {
  if (!buffer || buffer.length < 4) return false;
  const signatures = MAGIC_BYTES[claimedMime];
  if (!signatures) return true;
  return signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}

const chatMediaFileFilter = (req, file, cb) => {
  if (IMAGE_MIMES.includes(file.mimetype) || AUDIO_MIMES.includes(file.mimetype) || FILE_MIMES.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", [file.fieldname]));
};

const magicByteValidator = (req, res, next) => {
  if (!req.files || !Array.isArray(req.files)) return next();
  const failures = [];
  for (const file of req.files) {
    if (file.buffer && file.mimetype && MAGIC_BYTES[file.mimetype]) {
      if (!verifyMagicBytes(file.buffer, file.mimetype)) {
        failures.push({ fieldname: file.fieldname, originalname: file.originalname, claimed: file.mimetype });
      }
    }
  }
  if (failures.length > 0) {
    return res.status(400).json({
      success: false,
      message: `File type mismatch detected: ${failures.map((f) => f.originalname).join(", ")}`,
      details: failures,
      statusCode: 400,
    });
  }
  next();
};

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

const imageFileFilter = (req, file, cb) => {
  if (IMAGE_MIMES.includes(file.mimetype)) return cb(null, true);
  cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", [file.fieldname]));
};

const audioFileFilter = (req, file, cb) => {
  if (AUDIO_MIMES.includes(file.mimetype)) return cb(null, true);
  cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", [file.fieldname]));
};

const chatFileFilter = (req, file, cb) => {
  if (FILE_MIMES.includes(file.mimetype)) return cb(null, true);
  cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", [file.fieldname]));
};

export const upload = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: audioFileFilter,
});

export const uploadChatFile = multer({
  storage: chatFileStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: chatFileFilter,
});

export const uploadChatMedia = multer({
  storage: chatMediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: chatMediaFileFilter,
});

export const uploadChatMediaMulti = multer({
  storage: chatMediaStorage,
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
  fileFilter: chatMediaFileFilter,
});

export { verifyMagicBytes, magicByteValidator, IMAGE_MIMES, AUDIO_MIMES, FILE_MIMES };
export const CHAT_MEDIA_MIMES = { IMAGE_MIMES, AUDIO_MIMES, FILE_MIMES };