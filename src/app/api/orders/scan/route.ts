import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;
    if (!file) return NextResponse.json({ error: "No image" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mediaType = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          {
            type: "text",
            text: `This is a textile order sheet. Extract all information and return ONLY a JSON object, no other text.

Return this exact structure:
{
  "buyerName": "name of the buyer/client if visible, else null",
  "orderDate": "date in YYYY-MM-DD format if visible, else null",
  "title": "a short order title like 'Desmond May 2026'",
  "type": "production",
  "lines": [
    {
      "productName": "product/category name e.g. '3mm Bell Scarf'",
      "colorCategory": "color variant e.g. 'Black to Silver'",
      "designNumber": "design number if visible else ''",
      "targetQty": 15
    }
  ]
}

Rules:
- Skip TOTAL rows
- Each color variant is a separate line item
- targetQty is always an integer (number of pieces)
- If a row has no quantity or quantity is 0, skip it
- Return only the JSON object, no markdown`
          }
        ]
      }]
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("Order scan error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
