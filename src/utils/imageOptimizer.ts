/**
 * Image Optimization & Compression Utility
 * Resizes and compresses base64 / File images on an HTML5 canvas to keep payloads
 * extremely small (2KB - 20KB) so Firebase Firestore document size limit (1MB)
 * is never exceeded and synchronization is lightning fast in real-time.
 */

export async function optimizeImageForStorage(
  source: string | File,
  maxWidth = 160,
  maxHeight = 160,
  quality = 0.85
): Promise<string> {
  // If it's a standard icon name, SVG name or emoji, or small data URI (< 250KB), return as-is
  if (typeof source === 'string') {
    if (!source.startsWith('data:image/') && !source.startsWith('blob:')) {
      return source;
    }
    if (source.length < 250000) {
      return source;
    }
  }

  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (val: string) => {
      if (!resolved) {
        resolved = true;
        resolve(val);
      }
    };

    // 2-second fallback timeout so image processing NEVER hangs
    const timer = setTimeout(() => {
      safeResolve(typeof source === 'string' ? source : '');
    }, 2000);

    const img = new Image();
    
    // Only set crossOrigin for remote HTTP URLs
    if (typeof source === 'string' && source.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      clearTimeout(timer);
      try {
        let { width, height } = img;
        if (width <= 0 || height <= 0) {
          safeResolve(typeof source === 'string' ? source : '');
          return;
        }

        // Maintain aspect ratio while bounding within maxWidth & maxHeight
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          safeResolve(typeof source === 'string' ? source : '');
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first for optimal compression
        let output = canvas.toDataURL('image/webp', quality);
        if (!output.startsWith('data:image/webp')) {
          output = canvas.toDataURL('image/png');
        }

        safeResolve(output);
      } catch (err) {
        console.warn('Canvas image optimization failed, returning original:', err);
        safeResolve(typeof source === 'string' ? source : '');
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      safeResolve(typeof source === 'string' ? source : '');
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          clearTimeout(timer);
          safeResolve('');
        }
      };
      reader.onerror = () => {
        clearTimeout(timer);
        safeResolve('');
      };
      reader.readAsDataURL(source);
    }
  });
}
