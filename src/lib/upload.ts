export async function uploadImage(file: File): Promise<string> {
  // Get signature from our server
  const sigRes = await fetch("/api/upload-signature");
  if (!sigRes.ok) throw new Error("Failed to get upload signature");
  const { timestamp, signature, apiKey, cloudName, folder } = await sigRes.json();

  // Upload directly from browser to Cloudinary — no server in the middle
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);
  formData.append("transformation", "w_800,h_800,c_limit,q_auto,f_auto");

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
