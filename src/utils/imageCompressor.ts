/**
 * Client-Side Fast Image Compressor
 * Resizes large photos using HTML5 Canvas to prevent page freezing,
 * avoid hitting localStorage quota, and eliminate network timeout / 413 Payload Too Large errors.
 */

export interface CompressionOptions {
  maxDimension?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const { maxDimension = 600, quality = 0.78, format = 'image/jpeg' } = options;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image in browser'));

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Scale maintaining aspect ratio
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Could not get 2D canvas context'));
          }

          // Fill white background for JPEGs (in case source has transparent PNG alpha)
          if (format === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
          }

          // Fast high quality rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL(format, quality);
          resolve(compressedDataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Scale down an existing data URL (e.g. from camera stream)
 */
export function compressDataUrl(
  dataUrl: string,
  options: CompressionOptions = {}
): Promise<string> {
  const { maxDimension = 480, quality = 0.75, format = 'image/jpeg' } = options;

  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return resolve(dataUrl);
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width <= maxDimension && height <= maxDimension && dataUrl.length < 80000) {
          return resolve(dataUrl);
        }

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);

        if (format === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL(format, quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
