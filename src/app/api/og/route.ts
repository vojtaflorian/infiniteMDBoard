import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { APP_VERSION } from "@/lib/config";

const log = createLogger("api/og");

/** Maximum HTML body size to read (512 KB). */
const MAX_BODY_SIZE = 512 * 1024;

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

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // SSRF protection: only allow http(s) protocols
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    log.warn("Blocked non-http URL", parsed.protocol);
    return NextResponse.json({ error: "Only HTTP(S) URLs allowed" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": `Mozilla/5.0 (compatible; ${APP_VERSION})`,
      },
      signal: AbortSignal.timeout(5000),
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return NextResponse.json({ error: "Not an HTML page" }, { status: 422 });
    }

    // Read limited body to avoid memory issues
    const reader = res.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: "Empty response" }, { status: 502 });
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.byteLength;
      if (totalSize > MAX_BODY_SIZE) {
        reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const html = new TextDecoder().decode(
      chunks.length === 1 ? chunks[0] : Buffer.concat(chunks),
    );

    const hostname = parsed.hostname;
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
  } catch (err) {
    log.error("OG fetch failed", url, err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
