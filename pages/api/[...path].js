import { IncomingForm } from 'formidable';
import fs from 'node:fs';
import path from 'node:path';
import app from '../../server/index';
import { verifyToken } from '../../server/auth';
import { validateUploadedFile } from '../../server/uploadRules';

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'server', 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

async function ensureAuth(request) {
  const rawToken = request.headers.authorization || '';
  const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : null;
  const decoded = token ? verifyToken(token) : null;

  if (!decoded) {
    throw Object.assign(new Error('Authentication token is missing or invalid.'), { statusCode: 401 });
  }

  return decoded;
}

export default async function handler(request, response) {
  const originalUrl = request.url || '/';
  const normalizedUrl = originalUrl.replace(/^\/api/, '') || '/';

  if (normalizedUrl === '/upload' || normalizedUrl.startsWith('/upload/')) {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      response.status(405).json({ message: 'Method not allowed.' });
      return;
    }

    try {
      await ensureAuth(request);
      await fs.promises.mkdir(uploadDir, { recursive: true });

      const form = new IncomingForm({
        multiples: false,
        maxFileSize: 2 * 1024 * 1024,
        allowEmptyFiles: false,
      });

      const files = await new Promise((resolve, reject) => {
        form.parse(request, (error, fields, parsedFiles) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(parsedFiles);
        });
      });

      const uploadedFile = files.file || files.upload || files.document;
      if (!uploadedFile) {
        throw Object.assign(new Error('No file was provided.'), { statusCode: 400 });
      }

      const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
      validateUploadedFile({
        originalname: file.originalFilename || file.newFilename || 'upload',
        mimetype: file.mimetype || 'application/octet-stream',
        size: file.size || 0,
        buffer: fs.readFileSync(file.filepath),
      });

      const safeName = `${Date.now()}-${(file.originalFilename || 'upload').replace(/\s+/g, '-')}`;
      const destinationPath = path.join(uploadDir, safeName);
      fs.copyFileSync(file.filepath, destinationPath);
      fs.unlinkSync(file.filepath);

      response.status(201).json({
        message: 'File uploaded successfully.',
        file: {
          name: safeName,
          mimeType: file.mimetype || 'application/octet-stream',
          size: file.size || 0,
          url: `/uploads/${safeName}`,
        },
      });
      return;
    } catch (error) {
      const statusCode = error && error.statusCode ? error.statusCode : 400;
      response.status(statusCode).json({ message: error.message || 'Upload failed.' });
      return;
    }
  }

  request.url = normalizedUrl;
  request.originalUrl = originalUrl;
  return app(request, response);
}