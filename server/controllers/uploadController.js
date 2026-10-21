import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { KINDS } from '../middleware/upload.js';
import { saveFiles } from '../services/storageService.js';

export const upload = asyncHandler(async (req, res) => {
  const kind = KINDS[req.params.kind];
  if (!kind) throw ApiError.badRequest('Unknown upload type');
  if (!kind.roles.includes(req.user.role)) throw ApiError.forbidden();
  if (!req.files?.length) throw ApiError.badRequest('No files received (field name must be "files")');
  if (req.files.length > kind.max) throw ApiError.badRequest(`You can upload at most ${kind.max} file(s) here`);
  res.status(201).json({ urls: await saveFiles(req.files, req.params.kind) });
});
