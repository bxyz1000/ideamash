import { runSeed } from '../../../../scripts/seedIdeas';

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return new Response(JSON.stringify({ error: 'Not allowed in production' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const log = (msg: string) => {
        const jsonStr = JSON.stringify({ log: msg }) + '\n';
        controller.enqueue(encoder.encode(jsonStr));
      };

      try {
        await runSeed(log);
        log('=== DONE ===');
      } catch (err) {
        log(`Error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/jsonl',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
