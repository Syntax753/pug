/**
 * LLM-based enemy behavior generator
 * Generates move() method code based on natural language descriptions
 */

import { generate } from '@/llm/llmUtil';

/**
 * System prompt that explains the game context to the LLM
 */
const SYSTEM_PROMPT = `You are a code generator for a grid-based game. Your task is to generate a JavaScript move() method for an enemy based on the user's description.

GAME CONTEXT:
- The game is played on a 20x20 grid
- There is a player character called "pug" 
- Enemies move once per turn after the player
- Position is {x, y} where x is column (0-19) and y is row (0-19)

MOVE METHOD SIGNATURE:
move(context, futureGrid)

CONTEXT OBJECT:
- context.entities: Array of all entities {id, type, position: {x, y}, ...}
- context.myPosition: Current position {x, y} of this enemy
- context.isValid(x, y): Helper function returning true if position (x,y) is valid and empty
- context.layer1: 2D array of walls (92 = wall)

REQUIREMENTS:
1. Return a position object: {x, y}
2. Use context.isValid(x, y) to check if a move is possible
3. If blocked, return current position (context.myPosition)
4. By default, prefer vertical movement over horizontal when blocked diagonally

EXAMPLES:

// Enemy that seeks the pug
const pug = context.entities.find(e => e.type === 'pug');
if (!pug) return context.myPosition;

const dx = pug.position.x - context.myPosition.x;
const dy = pug.position.y - context.myPosition.y;

// Try diagonal
const newX = context.myPosition.x + Math.sign(dx);
const newY = context.myPosition.y + Math.sign(dy);
if (context.isValid(newX, newY)) return {x: newX, y: newY};

// Try vertical first
if (dy !== 0 && context.isValid(context.myPosition.x, context.myPosition.y + Math.sign(dy))) {
  return {x: context.myPosition.x, y: context.myPosition.y + Math.sign(dy)};
}

// Try horizontal
if (dx !== 0 && context.isValid(context.myPosition.x + Math.sign(dx), context.myPosition.y)) {
  return {x: context.myPosition.x + Math.sign(dx), y: context.myPosition.y};
}

return context.myPosition;

YOUR TASK:
Generate ONLY the function body. Keep it CONCISE. Do NOT include function declaration or markdown.`;

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

  // Extract enemy name from prompt (look for patterns like "called X" or "named X")
  const nameMatch = userPrompt.match(/(?:called|named)\s+(\w+)/i);
  const enemyName = nameMatch ? nameMatch[1] : 'CustomEnemy';

  // Generate the move code
  const prompt = `${userPrompt}\n\nGenerate the move() function body for this enemy. Remember: return only the function body code, no function declaration, no markdown.`;

  const moveCode = await generate(
    SYSTEM_PROMPT,
    prompt,
    onStatusUpdate,
    false // not navigator mode
  );

  console.log('=== LLM Enemy Generator Debug ===');
  console.log('Enemy Name:', enemyName);
  console.log('User Prompt:', userPrompt);
  console.log('\nRaw LLM Response:');
  console.log(moveCode);
  console.log('\n=================================');

  // Clean up the response - remove markdown code blocks if present
  let cleanedCode = moveCode.trim();
  cleanedCode = cleanedCode.replace(/^```(?:javascript|js)?\n?/i, '');
  cleanedCode = cleanedCode.replace(/\n?```$/, '');
  cleanedCode = cleanedCode.trim();

  console.log('Cleaned Code:');
  console.log(cleanedCode);
  console.log('=================================\n');

  return {
    enemyName,
    moveCode: cleanedCode
  };
}

/**
 * Validate that the generated code is syntactically valid JavaScript
 * @param code - The code to validate
 * @returns true if valid, false otherwise
 */
export function validateGeneratedCode(code: string): boolean {
  // Check for common signs of incomplete code
  const incompleteSigns = [
    /return\s*\{[^}]*$/,  // return { without closing brace at end
    /=\s*$/,              // ends with equals sign
    /\(\s*$/,             // ends with opening paren
    /\{\s*$/,             // ends with opening brace (unless it's the last line)
  ];

  for (const pattern of incompleteSigns) {
    if (pattern.test(code.trim())) {
      console.error('❌ Code appears to be incomplete (ends mid-statement)');
      console.error('Code that failed:');
      console.error(code);
      console.error('\n⚠️ The LLM response was likely truncated. Try:');
      console.error('  1. Using a shorter/simpler prompt');
      console.error('  2. The model may have token limits');
      return false;
    }
  }

  try {
    // Try to create a function with the code
    new Function('context', 'futureGrid', code);
    console.log('✅ Code validation passed');
    return true;
  } catch (e) {
    console.error('❌ Generated code validation failed:');
    console.error('Error:', e);
    console.error('Code that failed:');
    console.error(code);
    return false;
  }
}
