const MAX_SIZE_BYTES = 500 * 1024; // 500KB
const MAX_DIMENSION = 1200;

async function compressImage(file: File): Promise<File> {
  // If already under limit, skip compression
  if (file.size <= MAX_SIZE_BYTES) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");

      // Scale down if too large
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      // Try progressively lower quality until under 500KB
      const tryQuality = (quality: number) => {
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error("Compression failed")); return; }
          if (blob.size <= MAX_SIZE_BYTES || quality <= 0.3) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          } else {
            tryQuality(quality - 0.1);
          }
        }, "image/jpeg", quality);
      };
      tryQuality(0.8);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

export async function uploadImage(file: File): Promise<string> {
  // Compress before uploading
  const compressed = await compressImage(file);

  // Get signature from our server
  const sigRes = await fetch("/api/upload-signature");
  if (!sigRes.ok) throw new Error("Failed to get upload signature");
  const { timestamp, signature, apiKey, cloudName, folder } = await sigRes.json();

  // Upload directly from browser to Cloudinary
  const formData = new FormData();
  formData.append("file", compressed);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json();
    throw new Error(err.error?.message || "Upload failed");
  }

  const result = await uploadRes.json();
  return result.secure_url;
}
