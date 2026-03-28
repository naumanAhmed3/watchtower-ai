export function getApiBase() {
  if (typeof window === 'undefined') return '/api';
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
    return '/api';
  }
  return 'https://watchtower-backend-2ct4.onrender.com';
}

export async function analyzeFrameAPI(frame: string, prompt: string) {
  const res = await fetch(`${getApiBase()}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frame, prompt }),
  });
  return res.json();
}
