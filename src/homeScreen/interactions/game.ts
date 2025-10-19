import { submitPrompt } from "./prompt";

const SYSTEM_PROMPT = "You are a navigator and must return a single direction: up, down, left, or right.";

/**
 * Gets a directional move from the LLM based on the provided context.
 * @param userPrompt The full prompt to send to the LLM.
 * @returns A promise that resolves to the direction string from the LLM.
 */
export async function getLLMNavigatorMove(
    userPrompt: string
): Promise<string> {
    return new Promise((resolve) => {
        submitPrompt(
            `${SYSTEM_PROMPT}`,
            `${userPrompt}`,
            () => {}, // onStart
            (response, isFinal) => { if (isFinal) resolve(response || "down"); }
        );
    });
}