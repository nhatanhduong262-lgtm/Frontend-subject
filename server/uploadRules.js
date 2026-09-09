const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const MAX_FILE_SIZE = 2 * 1024 * 1024;

function validateUploadedFile(file) {
  if (!file) {
    throw new Error('No file was uploaded.');
  }

  const fileType = file.mimetype || '';
  const extension = (file.originalname || '').split('.').pop()?.toLowerCase();

  if (!ALLOWED_MIME_TYPES.has(fileType) && !['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(extension)) {
    throw new Error('Unsupported file type. Allowed: JPG, PNG, WEBP, PDF.');
  }

  if ((file.size || 0) > MAX_FILE_SIZE) {
    throw new Error('File must be smaller than 2MB.');
  }

  return true;
}

module.exports = {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  validateUploadedFile,
};
