import { NextRequest, NextResponse } from "next/server";

function getOgTag(html: string, prop: string): string | null {
  return (
    html.match(
      new RegExp(
        `<meta[^>]*property=["']og:${prop}["'][^>]*content=["']([^"']+)["']`,
        "i",
      ),
    )?.[1] ??
    html.match(
      new RegExp(
        `<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${prop}["']`,
        "i",
      ),
    )?.[1] ??
    null
  );
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; infiniteMDBoard/1.5)",
      },
      signal: AbortSignal.timeout(5000),
    });
    const html = await res.text();

    const title =
      getOgTag(html, "title") ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
      hostname;

    const description = getOgTag(html, "description") ?? "";

    return NextResponse.json({
      title: title.slice(0, 120),
      description: description.slice(0, 300),
      image: getOgTag(html, "image"),
      hostname,
      faviconUrl: `https://www.google.com/s2/favicons?sz=32&domain=${hostname}`,
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
