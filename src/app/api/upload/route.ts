import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("Missing Cloudinary env vars");
      return NextResponse.json({ error: "Cloudinary not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    // Build SHA1 signature (what Cloudinary requires)
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "carton-track/products";
    const { createHash } = require("crypto");
    const signature = createHash("sha1")
      .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");

    const body = new FormData();
    body.append("file", dataUri);
    body.append("api_key", apiKey);
    body.append("timestamp", String(timestamp));
    body.append("signature", signature);
    body.append("folder", folder);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body }
    );

    const result = await uploadRes.json();

    if (!uploadRes.ok) {
      console.error("Cloudinary upload failed:", result);
      return NextResponse.json({ error: result.error?.message || "Upload failed" }, { status: 500 });
    }

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";