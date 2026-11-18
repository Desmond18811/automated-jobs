import { complete } from '../services/documents/llm';

async function main() {
  console.log('[Test] Sending test prompt to OpenRouter using configured model...');
  try {
    const reply = await complete({
      prompt: 'Respond in one short sentence confirming you are Claude Opus and ready for JAVI.',
    });
    console.log('[Test] Successfully received response from OpenRouter:');
    console.log('--------------------------------------------------');
    console.log(reply);
    console.log('--------------------------------------------------');
  } catch (err: any) {
    console.error('[Test] Failed to call OpenRouter:', err?.message || err);
    if (err?.cause) console.error('[Test] Cause:', err.cause);
    process.exit(1);
  }
}

main();
