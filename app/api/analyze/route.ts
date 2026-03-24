import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { frame, prompt } = await req.json();
    if (!frame || !prompt) {
      return Response.json({ error: 'Missing frame or prompt' }, { status: 400 });
    }

    // Ensure frame is a proper data URL
    let imageUrl = frame;
    if (!imageUrl.startsWith('data:image/')) {
      // If it's raw base64 without prefix, add it
      imageUrl = `data:image/jpeg;base64,${imageUrl}`;
    }

    // Validate it's a real data URL with actual base64 content
    const base64Part = imageUrl.split(',')[1];
    if (!base64Part || base64Part.length < 100) {
      return Response.json({ error: 'Invalid image data — too small or empty' }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content: `You are a surveillance AI. Analyze the image for the specified activity.
Respond ONLY with JSON: {"detected": true/false, "confidence": 0-100, "description": "what you see", "region": "top-left|top-right|center|bottom-left|bottom-right|full-frame"}
The "region" field should indicate WHERE in the frame the activity is occurring. Be specific about locations and actions.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Is this activity happening? "${prompt}"` },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content || '{}';
    const match = text.match(/\{[\s\S]*\}/);
    return Response.json(match ? JSON.parse(match[0]) : { detected: false, confidence: 0, description: 'Parse error' });
  } catch (error: any) {
    console.error('Analyze error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
