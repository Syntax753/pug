/**
 * LLM-based enemy behavior generator
 * Generates move() method code based on natural language descriptions
 */

import { generate } from '@/llm/llmUtil';

/**
 * System prompt that explains the game context to the LLM
 */
const SYSTEM_PROMPT = `You are a game content generator. Your task is to analyze the user's description of an enemy and return a JSON object defining its behavior.

GAME CONTEXT:
- Grid: 20x20
- Player: "pug"
- Enemies: Move once per turn

OUTPUT FORMAT:
Return ONLY a JSON object with these fields:
- name: string (Use the full descriptive name, e.g., "Happy Horse", "Giggly Ghost")
- attitude: "towards" | "away" | "random" (default: "towards")
- fly: boolean (true if it can fly over walls/obstacles, false otherwise)
- movementPattern: Array of {x, y} objects representing possible moves relative to (0,0)
  - Default (all): [{x:0,y:1},{x:0,y:-1},{x:1,y:0},{x:-1,y:0},{x:1,y:1},{x:1,y:-1},{x:-1,y:1},{x:-1,y:-1}]
  - Ortho: [{x:0,y:1},{x:0,y:-1},{x:1,y:0},{x:-1,y:0}]
  - Knight: [{x:1,y:2},{x:1,y:-2},{x:-1,y:2},{x:-1,y:-2},{x:2,y:1},{x:2,y:-1},{x:-2,y:1},{x:-2,y:-1}]
- preference: "vertical" | "horizontal" | "none" (movement axis preference)

EXAMPLES:
User: "Create a ghost that flies through walls and chases the pug in straight lines"
JSON: { "name": "Ghost", "attitude": "towards", "fly": true, "movementPattern": [{"x":0,"y":1},{"x":0,"y":-1},{"x":1,"y":0},{"x":-1,"y":0}], "preference": "none" }

User: "A scared rat that runs away horizontally"
JSON: { "name": "Rat", "attitude": "away", "fly": false, "movementPattern": [{"x":0,"y":1},{"x":0,"y":-1},{"x":1,"y":0},{"x":-1,"y":0}], "preference": "horizontal" }
`;

interface EnemyParams {
  name: string;
  attitude: 'towards' | 'away' | 'random';
  fly: boolean;
  movementPattern: { x: number, y: number }[];
  preference: 'vertical' | 'horizontal' | 'none';
}

/**
 * Generate the JavaScript move() code based on parameters
 */
function generateMoveCode(params: EnemyParams): string {
  const { attitude, fly, movementPattern, preference } = params;

  // Serialize movement pattern for injection into code
  const patternJson = JSON.stringify(movementPattern);

  return `
    const pug = context.entities.find(e => e.type === 'pug');
    const targetPos = pug ? pug.position : context.myPosition; // Default to self if no pug (for random)
    
    // Possible moves relative to current position
    const patterns = ${patternJson};
    
    // Calculate all valid candidate moves
    const candidates = [];
    
    for (const pat of patterns) {
      const newX = context.myPosition.x + pat.x;
      const newY = context.myPosition.y + pat.y;
      
      // Check bounds
      if (newX < 0 || newX >= 20 || newY < 0 || newY >= 20) continue;
      
      // Check collision with other entities
      if (futureGrid[newY][newX] !== 0) continue;
      
      // Check walls (unless flying)
      ${fly ? '// Flying ignores walls' : 'if (context.layer1[newY][newX] === 92) continue;'}
      
      candidates.push({x: newX, y: newY});
    }
    
    if (candidates.length === 0) return context.myPosition;
    
    ${attitude === 'random' ? `
      // Random movement: just pick a random valid candidate
      const idx = Math.floor(Math.random() * candidates.length);
      return candidates[idx];
    ` : `
      // Sort candidates based on attitude and preference
      candidates.sort((a, b) => {
        // 1. Calculate squared distance to target
        const distA = Math.pow(a.x - targetPos.x, 2) + Math.pow(a.y - targetPos.y, 2);
        const distB = Math.pow(b.x - targetPos.x, 2) + Math.pow(b.y - targetPos.y, 2);
        
        // Primary sort: Distance
        if (distA !== distB) {
          ${attitude === 'towards' ? 'return distA - distB;' : 'return distB - distA;'}
        }
        
        // Secondary sort: Preference (Tie-breaker)
        ${preference === 'vertical'
      ? `// Prefer vertical movement (larger Y change)
             const dY_A = Math.abs(a.y - context.myPosition.y);
             const dY_B = Math.abs(b.y - context.myPosition.y);
             return dY_B - dY_A;`
      : preference === 'horizontal'
        ? `// Prefer horizontal movement (larger X change)
             const dX_A = Math.abs(a.x - context.myPosition.x);
             const dX_B = Math.abs(b.x - context.myPosition.x);
             return dX_B - dX_A;`
        : 'return 0;'
    }
      });
      
      return candidates[0];
    `}
  `;
}

/**
 * Generate enemy move() code from natural language
 * @param userPrompt - Natural language description of enemy behavior
 * @param onStatusUpdate - Callback for generation progress
 * @returns Object with enemyName and moveCode
 */
export async function generateEnemyBehavior(
  userPrompt: string,
  onStatusUpdate: (status: string, percentComplete: number) => void
): Promise<{ enemyName: string; moveCode: string }> {

  const rawResponse = await generate(
    SYSTEM_PROMPT,
    userPrompt,
    onStatusUpdate,
    false // not navigator mode
  );

  console.log('=== LLM Enemy Generator Debug ===');
  console.log('User Prompt:', userPrompt);
  console.log('\nRaw LLM Response:', rawResponse);

  let params: EnemyParams;
  try {
    // Try to parse JSON from the response
    let jsonStr = rawResponse;

    // 1. Try to find a JSON code block
    const codeBlockMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    } else {
      // 2. Fallback: Try to find the first '{' and last '}'
      const firstBrace = rawResponse.indexOf('{');
      const lastBrace = rawResponse.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = rawResponse.substring(firstBrace, lastBrace + 1);
      }
    }

    // Clean up any remaining whitespace
    jsonStr = jsonStr.trim();

    params = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse JSON from LLM:', e);
    // Fallback default
    params = {
      name: 'Unknown',
      attitude: 'towards',
      fly: false,
      movementPattern: [{ x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }], // Default ortho
      preference: 'vertical'
    };
  }

  console.log('Parsed Params:', params);

  const moveCode = generateMoveCode(params);

  console.log('Generated Code:');
  console.log(moveCode);
  console.log('=================================\n');

  return {
    enemyName: params.name,
    moveCode: moveCode
  };
}

/**
 * Validate that the generated code is syntactically valid JavaScript
 * @param code - The code to validate
 * @returns true if valid, false otherwise
 */
export function validateGeneratedCode(code: string): boolean {
  try {
    // Try to create a function with the code
    new Function('context', 'futureGrid', code);
    return true;
  } catch (e) {
    console.error('Code validation failed:', e);
    return false;
  }
}
