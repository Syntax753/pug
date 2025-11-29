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
- directions: "all" | "ortho" (default: "all")
- preference: "vertical" | "horizontal" | "none" (movement axis preference)

EXAMPLES:
User: "Create a ghost that flies through walls and chases the pug in straight lines"
JSON: { "name": "Ghost", "attitude": "towards", "fly": true, "directions": "ortho", "preference": "none" }

User: "A scared rat that runs away horizontally"
JSON: { "name": "Rat", "attitude": "away", "fly": false, "directions": "ortho", "preference": "horizontal" }
`;

interface EnemyParams {
  name: string;
  attitude: 'towards' | 'away' | 'random';
  fly: boolean;
  directions: 'all' | 'ortho';
  preference: 'vertical' | 'horizontal' | 'none';
}

/**
 * Generate the JavaScript move() code based on parameters
 */
function generateMoveCode(params: EnemyParams): string {
  const { attitude, fly, directions, preference } = params;

  if (attitude === 'random') {
    return `
      // Random movement
      const dirs = [
        {x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0}
        ${directions === 'all' ? ', {x:1, y:1}, {x:1, y:-1}, {x:-1, y:1}, {x:-1, y:-1}' : ''}
      ];
      // Shuffle directions
      for (let i = dirs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
      }
      
      for (const dir of dirs) {
        const newX = context.myPosition.x + dir.x;
        const newY = context.myPosition.y + dir.y;
        
        // Check bounds
        if (newX < 0 || newX >= 20 || newY < 0 || newY >= 20) continue;
        
        // Check collision
        if (futureGrid[newY][newX] !== 0) continue;
        
        // Check walls (unless flying)
        ${fly ? '// Flying ignores walls' : 'if (context.layer1[newY][newX] === 92) continue;'}
        
        return {x: newX, y: newY};
      }
      return context.myPosition;
    `;
  }

  // Logic for seeking/fleeing
  return `
    const pug = context.entities.find(e => e.type === 'pug');
    if (!pug) return context.myPosition;

    let dx = pug.position.x - context.myPosition.x;
    let dy = pug.position.y - context.myPosition.y;

    ${attitude === 'away' ? '// Run away!\n    dx = -dx;\n    dy = -dy;' : '// Seek player'}

    const moves = [];
    
    // Determine move priority based on preference
    const tryHoriz = dx !== 0;
    const tryVert = dy !== 0;
    
    // Orthogonal moves
    if (tryHoriz) moves.push({x: Math.sign(dx), y: 0});
    if (tryVert) moves.push({x: 0, y: Math.sign(dy)});
    
    // Diagonal moves (only if allowed)
    ${directions === 'all' ? `
    if (tryHoriz && tryVert) {
      moves.push({x: Math.sign(dx), y: Math.sign(dy)});
    }` : ''}
    
    // Sort moves based on preference
    ${preference === 'vertical'
      ? `// Prefer vertical
         moves.sort((a, b) => Math.abs(b.y) - Math.abs(a.y));`
      : preference === 'horizontal'
        ? `// Prefer horizontal
         moves.sort((a, b) => Math.abs(b.x) - Math.abs(a.x));`
        : ''
    }

    for (const move of moves) {
      const newX = context.myPosition.x + move.x;
      const newY = context.myPosition.y + move.y;
      
      // Check bounds
      if (newX < 0 || newX >= 20 || newY < 0 || newY >= 20) continue;
      
      // Check collision with other entities
      if (futureGrid[newY][newX] !== 0) continue;
      
      // Check walls (unless flying)
      ${fly ? '// Flying ignores walls' : 'if (context.layer1[newY][newX] === 92) continue;'}
      
      return {x: newX, y: newY};
    }
    
    return context.myPosition;
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
    // Handle potential markdown code blocks
    const jsonStr = rawResponse.replace(/^```json\n?|```$/g, '').trim();
    params = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse JSON from LLM:', e);
    // Fallback default
    params = { name: 'Unknown', attitude: 'towards', fly: false, directions: 'all', preference: 'vertical' };
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
