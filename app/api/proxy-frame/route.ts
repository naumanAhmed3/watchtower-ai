// Simplified proxy — grabs a single JPEG frame from an MJPEG stream
// Note: IP Camera background streaming doesn't work on serverless (Vercel)
// This only works for single frame grabs

export const maxDuration = 10;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return Response.json({ error: 'Missing url' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { signal: controller.signal });
    const reader = res.body?.getReader();
    if (!reader) { clearTimeout(timeout); return Response.json({ error: 'No stream' }, { status: 502 }); }

    const buffer: number[] = [];
    let jpegStart = -1;
    let done = false;

    while (!done) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) break;

      for (let i = 0; i < value.length; i++) {
        buffer.push(value[i]);

        if (jpegStart === -1 && buffer.length >= 2) {
          const len = buffer.length;
          if (buffer[len - 2] === 0xFF && buffer[len - 1] === 0xD8) {
            jpegStart = len - 2;
          }
        }

        if (jpegStart >= 0 && buffer.length >= jpegStart + 4) {
          const len = buffer.length;
          if (buffer[len - 2] === 0xFF && buffer[len - 1] === 0xD9) {
            done = true;
            break;
          }
        }
      }

      if (buffer.length > 3 * 1024 * 1024) break;
    }

    reader.cancel().catch(() => {});
    clearTimeout(timeout);

    if (jpegStart >= 0) {
      const jpegBytes = Buffer.from(buffer.slice(jpegStart));
      const base64 = jpegBytes.toString('base64');
      return Response.json({ frame: `data:image/jpeg;base64,${base64}`, size: jpegBytes.length });
    }

    return Response.json({ error: 'No JPEG found' }, { status: 502 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
