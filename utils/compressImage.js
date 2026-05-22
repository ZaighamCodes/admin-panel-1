const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to compress image'))),
      type,
      quality
    );
  });

const fileFromBlob = (blob, originalName, ext) => {
  const base = originalName.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${base}.${ext}`, { type: blob.type, lastModified: Date.now() });
};

const scaleDimensions = (width, height, maxWidth, maxHeight) => {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
};

const drawToCanvas = (source, width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
};

const encodeWithQualitySteps = async (canvas, type, maxBytes, initialQuality, minQuality) => {
  let quality = initialQuality;
  let blob = await canvasToBlob(canvas, type, quality);

  while (blob.size > maxBytes && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.06);
    blob = await canvasToBlob(canvas, type, quality);
  }

  return { blob, quality };
};

/**
 * Resize and compress an image before upload. Uses high-quality canvas scaling
 * and stepped JPEG/PNG quality so files stay under the server limit.
 *
 * @param {File} file
 * @param {object} [options]
 * @returns {Promise<{ file: File, previewUrl: string, originalBytes: number, compressedBytes: number, wasCompressed: boolean }>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1600,
    maxHeight = 900,
    maxBytes = Math.floor(1.85 * 1024 * 1024),
    initialQuality = 0.88,
    minQuality = 0.72,
    maxInputBytes = 15 * 1024 * 1024,
  } = options;

  if (!file) throw new Error('No file selected');
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Image must be JPG or PNG');
  }
  if (file.size > maxInputBytes) {
    throw new Error('Image is too large. Please use a file under 15MB.');
  }

  if (file.size <= maxBytes && file.type === 'image/jpeg') {
    const previewUrl = URL.createObjectURL(file);
    return {
      file,
      previewUrl,
      originalBytes: file.size,
      compressedBytes: file.size,
      wasCompressed: false,
    };
  }

  const bitmap = await createImageBitmap(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;
  let dims = scaleDimensions(originalWidth, originalHeight, maxWidth, maxHeight);
  const preferPng = file.type === 'image/png';
  let outputType = preferPng ? 'image/png' : 'image/jpeg';
  let ext = preferPng ? 'png' : 'jpg';

  const tryEncode = async (width, height, type) => {
    const canvas = drawToCanvas(bitmap, width, height);
    if (type === 'image/png') {
      const blob = await canvasToBlob(canvas, 'image/png');
      return { blob, quality: 1 };
    }
    return encodeWithQualitySteps(canvas, 'image/jpeg', maxBytes, initialQuality, minQuality);
  };

  let { blob, quality } = await tryEncode(dims.width, dims.height, outputType);

  if (blob.size > maxBytes && preferPng) {
    ({ blob, quality } = await tryEncode(dims.width, dims.height, 'image/jpeg'));
    outputType = 'image/jpeg';
    ext = 'jpg';
  }

  let shrinkPass = 0;
  while (blob.size > maxBytes && shrinkPass < 4) {
    shrinkPass += 1;
    dims = scaleDimensions(dims.width, dims.height, dims.width * 0.85, dims.height * 0.85);
    ({ blob, quality } = await tryEncode(dims.width, dims.height, outputType));
  }

  bitmap.close?.();

  if (blob.size > maxBytes) {
    throw new Error('Could not reduce image enough. Try a smaller photo.');
  }

  const compressedFile = fileFromBlob(blob, file.name, ext);
  const previewUrl = URL.createObjectURL(compressedFile);

  return {
    file: compressedFile,
    previewUrl,
    originalBytes: file.size,
    compressedBytes: compressedFile.size,
    wasCompressed:
      compressedFile.size < file.size ||
      dims.width < originalWidth ||
      dims.height < originalHeight,
  };
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const IMAGE_UPLOAD_LIMIT_LABEL = 'JPG/PNG — auto-optimized before upload (max 2MB)';
