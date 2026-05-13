export interface AiCard {
  headline: string;
  insights: [string, string, string];
}

export async function generateAiCard(title: string, desc: string): Promise<AiCard | null> {
  try {
    const prompt = `Summarize this startup idea for a pitch card. Return ONLY valid JSON: {"headline":"...","insights":["...","...","..."]}. headline = 1 bold direct sentence. insights = 3 short sentences covering: target market, key pain, why it could work. No buzzwords. Title: ${title} Desc: ${desc}`;

    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.result as AiCard;
  } catch {
    return null;
  }
}
