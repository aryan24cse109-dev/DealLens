
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

const uploadDirectory = path.resolve(process.cwd(), env.uploadDir);

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const safeName = `${Date.now()}-${randomUUID()}.pdf`;
    callback(null, safeName);
  },
});

function fileFilter(req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (extension !== '.pdf' || file.mimetype !== 'application/pdf') {
    const error = new Error('Only PDF files are allowed.');
    error.status = 400;
    return callback(error);
  }

  callback(null, true);
}

export const uploadDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxFileSizeMb * 1024 * 1024,
    files: 1,
  },
});
