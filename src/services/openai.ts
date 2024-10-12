import OpenAI from 'openai';
import { AISettings } from '../components/AISettings';
import { getAIInstructions } from '../utils/aiInstructions';
import { GameState } from '../logic/gameState';

let openai: OpenAI | null = null;

export const initializeOpenAI = (apiKey: string) => {
  openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
};

export const getAIMove = async (
  settings: AISettings,
  gameState: GameState,
  threadId: string | null
): Promise<{ move: string; explanation: string; threadId: string }> => {
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }

  let thread;
  if (threadId) {
    thread = await openai.beta.threads.retrieve(threadId);
  } else {
    thread = await openai.beta.threads.create();
  }

  const boardState = JSON.stringify(gameState.board);
  const currentPlayer = gameState.currentPlayer;
  const gameStatus = gameState.status;

  await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: `Current game state:
Board: ${boardState}
Current player: ${currentPlayer}
Game status: ${gameStatus}`,
  });

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: settings.assistantId,
    instructions: getAIInstructions(settings.mode, settings.level),
  });

  let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

  while (runStatus.status !== 'completed') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  }

  const messages = await openai.beta.threads.messages.list(thread.id);
  const lastMessage = messages.data[0];

  if (lastMessage.role !== 'assistant') {
    throw new Error('Unexpected response from AI');
  }

  const content = lastMessage.content[0];

  if (content.type !== 'text') {
    throw new Error('Unexpected content type from AI');
  }

  const response = content.text.value;
  console.log("Raw AI response:", response); // Log the raw response

  let move, explanation;

  if (settings.mode === 'player') {
    const moveMatch = response.match(/Move:\s*([a-h][1-8][a-h][1-8])/);
    if (moveMatch) {
      move = moveMatch[1];
      explanation = response.replace(moveMatch[0], '').trim();
    } else {
      throw new Error('Invalid move format in AI response');
    }
  } else {
    const parts = response.split('\n');
    const moveMatch = parts[parts.length - 1].match(/Suggestion:\s*([a-h][1-8][a-h][1-8])/);
    if (moveMatch) {
      move = moveMatch[1];
      explanation = parts.slice(0, -1).join('\n').trim();
    } else {
      throw new Error('Invalid move format in AI response');
    }
  }

  return {
    move,
    explanation,
    threadId: thread.id,
  };
};