import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;
    if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mediaType = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Extract all products from this image. This is a textile/fabric inventory sheet.

Return ONLY a JSON array, no other text. Each item should have:
- "name": product/category name (e.g. "Air Condition Scarf")  
- "colorCategory": color variant (e.g. "Black to Black", "White to Silver")
- "quantity": number of pieces (integer, 0 if not clear)
- "designNumber": design number if visible, otherwise ""

Example output:
[
  {"name": "Air Condition Scarf", "colorCategory": "Black to Black", "quantity": 30, "designNumber": ""},
  {"name": "Air Condition Scarf", "colorCategory": "Black to Red", "quantity": 30, "designNumber": ""}
]

Extract every row you can read. If a value is unclear, make your best guess. Return only the JSON array.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    
    // Strip markdown fences if present
    const clean = text.replace(/```json|```/g, "").trim();
    const products = JSON.parse(clean);

    return NextResponse.json({ products });
  } catch (e) {
    console.error("Scan error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
