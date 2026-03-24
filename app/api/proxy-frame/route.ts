import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CACHE_DIR = '/tmp/watchtower-frames';

// Ensure cache dir exists
try { require('fs').mkdirSync(CACHE_DIR, { recursive: true }); } catch {}

// Background stream reader — grabs frames continuously and saves to disk
const activeStreams = new Map<string, { stop: () => void; lastFrame: string }>();

async function startStreamCapture(url: string) {
  const key = url;
  if (activeStreams.has(key)) return; // already running

  const state = { stop: () => {}, lastFrame: '' };
  activeStreams.set(key, state);

  let running = true;
  state.stop = () => { running = false; activeStreams.delete(key); };

  // Continuously grab frames
  while (running) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, { signal: controller.signal });
      const reader = res.body?.getReader();
      if (!reader) { clearTimeout(timeout); break; }

      const buffer: number[] = [];
      let jpegStart = -1;

      while (running) {
        const { done, value } = await reader.read();
        if (done) break;

        for (let i = 0; i < value.length; i++) {
          buffer.push(value[i]);

          // Find JPEG start: FF D8
          if (jpegStart === -1 && buffer.length >= 2) {
            const len = buffer.length;
            if (buffer[len - 2] === 0xFF && buffer[len - 1] === 0xD8) {
              jpegStart = len - 2;
            }
          }

          // Find JPEG end: FF D9
          if (jpegStart >= 0 && buffer.length >= jpegStart + 4) {
            const len = buffer.length;
            if (buffer[len - 2] === 0xFF && buffer[len - 1] === 0xD9) {
              // Got a complete frame!
              const jpegBytes = Buffer.from(buffer.slice(jpegStart));
              const base64 = `data:image/jpeg;base64,${jpegBytes.toString('base64')}`;
              state.lastFrame = base64;

              // Save to temp file
              const framePath = join(CACHE_DIR, 'latest.jpg');
              writeFileSync(framePath, jpegBytes);

              // Reset for next frame
              buffer.length = 0;
              jpegStart = -1;
            }
          }

          // Safety: don't accumulate more than 3MB
          if (buffer.length > 3 * 1024 * 1024) {
            buffer.length = 0;
            jpegStart = -1;
          }
        }
      }

      reader.cancel().catch(() => {});
      clearTimeout(timeout);
    } catch {
      // Connection lost — wait and retry
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// GET /api/proxy-frame?url=...&action=start  → start background capture + return latest frame
// GET /api/proxy-frame?url=...&action=stop   → stop background capture
// GET /api/proxy-frame?url=...               → return latest cached frame (instant, no new connection)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const action = searchParams.get('action');

  if (!url) return Response.json({ error: 'Missing url' }, { status: 400 });

  if (action === 'start') {
    startStreamCapture(url);
    return Response.json({ status: 'started' });
  }

  if (action === 'stop') {
    const stream = activeStreams.get(url);
    if (stream) stream.stop();
    return Response.json({ status: 'stopped' });
  }

  // Default: return latest frame
  const stream = activeStreams.get(url);
  if (stream?.lastFrame) {
    return Response.json({ frame: stream.lastFrame, size: stream.lastFrame.length });
  }

  // Fallback: try reading from disk cache
  const framePath = join(CACHE_DIR, 'latest.jpg');
  if (existsSync(framePath)) {
    const bytes = readFileSync(framePath);
    const base64 = `data:image/jpeg;base64,${bytes.toString('base64')}`;
    return Response.json({ frame: base64, size: bytes.length });
  }

  return Response.json({ frame: null, size: 0 });
}
