const test = require('node:test');
const assert = require('node:assert/strict');

const { validateUploadedFile } = require('./uploadRules');

test('accepts a valid small image upload', () => {
  const file = {
    originalname: 'avatar.png',
    mimetype: 'image/png',
    size: 120 * 1024,
  };

  assert.doesNotThrow(() => validateUploadedFile(file));
});

test('rejects oversized or invalid files', () => {
  const invalidType = {
    originalname: 'notes.exe',
    mimetype: 'application/x-msdownload',
    size: 12 * 1024,
  };

  const tooLarge = {
    originalname: 'large.pdf',
    mimetype: 'application/pdf',
    size: 8 * 1024 * 1024,
  };

  assert.throws(() => validateUploadedFile(invalidType), /Unsupported file type/);
  assert.throws(() => validateUploadedFile(tooLarge), /must be smaller than/i);
});
