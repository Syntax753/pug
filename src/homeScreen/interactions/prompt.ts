import { isServingLocally } from "@/developer/devEnvUtil";
import { generate, isLlmConnected } from "@/llm/llmUtil";

export const SYSTEM_MESSAGE = ``;

export const GENERATING = '...';

export async function submitPrompt(
  systemPrompt: string,
  prompt: string,
  onStart: () => void,
  onResponse: (response: string, isFinal: boolean) => void
) {
    onStart();
    try {
      if (!isLlmConnected()) { 
        const message = isServingLocally() 
        ? `LLM is not connected. You're in a dev environment where this is expected (hot reloads, canceling the LLM load). You can refresh the page to load the LLM.`
        : 'LLM is not connected. Try refreshing the page.';
        onResponse(message, true); 
        return; 
      }
      generate(systemPrompt + '\n\n'+ prompt, (status: string, percentComplete: number) => onResponse(status, percentComplete === 1));
    } catch(e) {
      console.error('Error while generating response.', e);
      onResponse('Error while generating response.', true);
    }
}