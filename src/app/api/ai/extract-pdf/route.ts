import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdf = new PDFParse(buffer);
    const result = await pdf.getText();
    const text = result.pages.map((p) => p.text).join("\n\n");
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: "PDF extraction failed", details: String(err) }, { status: 500 });
  }
}
