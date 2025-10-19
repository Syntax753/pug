import { submitPrompt } from "./prompt";

export async function getLLMNavigatorMove(
    systemPrompt: string, userPrompt: string
): Promise<string> {
    return new Promise((resolve) => {
        submitPrompt(
            systemPrompt,
            userPrompt,
            () => {}, // onStart
            (response, isFinal) => { if (isFinal) resolve(response || "down"); }
        );
    });
}