import fs from 'fs/promises';
import path from 'path';
import { UPLOAD_ROOT, safeName } from '../middleware/upload.js';
import ApiError from '../utils/ApiError.js';

/**
 * Storage abstraction. STORAGE_PROVIDER=local (default) writes to server/uploads and serves from /uploads.
 * STORAGE_PROVIDER=cloudinary uploads to Cloudinary (run `npm i cloudinary --prefix server`
 * and set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET).
 */
async function saveLocal(file, folder) {
  const dir = path.join(UPLOAD_ROOT, folder);
  await fs.mkdir(dir, { recursive: true });
  const name = safeName(file.mimetype);
  await fs.writeFile(path.join(dir, name), file.buffer);
  return `/uploads/${folder}/${name}`;
}

async function saveCloudinary(file, folder) {
  let cloudinary;
  try { ({ v2: cloudinary } = await import('cloudinary')); } catch {
    throw ApiError.badRequest('Cloudinary package not installed. Run: npm i cloudinary --prefix server');
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder: `knotnest/${folder}` }, (err, res) => (err ? reject(err) : resolve(res.secure_url))).end(file.buffer);
  });
}

export const saveFiles = (files, folder) =>
  Promise.all(files.map((f) => (process.env.STORAGE_PROVIDER === 'cloudinary' ? saveCloudinary(f, folder) : saveLocal(f, folder))));
