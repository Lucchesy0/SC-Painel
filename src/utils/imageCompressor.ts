/**
 * Fast client-side image compression and resizing utility.
 * Reduces storage footprint and boosts IndexedDB & rendering performance.
 */
export async function compressImage(
  fileOrBase64: File | string,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Handle File vs Base64 / Object URL
    if (typeof fileOrBase64 === 'string') {
      img.src = fileOrBase64;
    } else {
      img.src = URL.createObjectURL(fileOrBase64);
    }

    img.onload = () => {
      // Clean up object URL if created
      if (typeof fileOrBase64 !== 'string') {
        URL.revokeObjectURL(img.src);
      }

      let width = img.width;
      let height = img.height;

      // Calculate aspect ratio constraint
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to original string if canvas context unavailable
        resolve(typeof fileOrBase64 === 'string' ? fileOrBase64 : '');
        return;
      }

      // Smooth resizing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Prefer image/webp if supported, fallback to image/jpeg
      try {
        const compressedDataUrl = canvas.toDataURL('image/webp', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        const fallbackDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(fallbackDataUrl);
      }
    };

    img.onerror = (err) => {
      console.warn('Image compression error, falling back:', err);
      if (typeof fileOrBase64 === 'string') {
        resolve(fileOrBase64);
      } else {
        // Read directly as DataURL fallback
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(err);
        reader.readAsDataURL(fileOrBase64);
      }
    };
  });
}
