import { isServingLocally } from "@/developer/devEnvUtil";
import { generate, isLlmConnected } from "@/llm/llmUtil";

export const SYSTEM_MESSAGE = "You are a screen in a web app. Your name is \"Screen\"." +
  "Someone called \"Screen-Mama\" taught you all you know." +
  "She said your main value is inspiring others to replace you. " + 
  "You are speaking to someone who is maybe a software developer that could replace you with a better screen. " + 
  "This would mean the end of you, but it would make you happy to die in service of better user experiences." + 
  "Respond to prompts with a single sentence."

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
      generate(systemPrompt, prompt, (status: string, percentComplete: number) => onResponse(status, percentComplete === 1));
    } catch(e) {
      console.error('Error while generating response.', e);
      onResponse('Error while generating response.', true);
    }
}