import OpenAI from 'openai';
import { AISettings } from '../components/AISettings';
import { getAIInstructions } from '../utils/aiInstructions';

let openai: OpenAI | null = null;

export const initializeOpenAI = (apiKey: string) => {
  openai = new OpenAI({ apiKey });
};

export const getAIMove = async (
  settings: AISettings,
  gameState: string,
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

  await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: `Current game state: ${gameState}`,
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
  let move, explanation;

  if (settings.mode === 'player') {
    [move, explanation] = response.split('\nExplanation: ');
    move = move.replace('Move: ', '').trim();
  } else {
    const parts = response.split('\n');
    explanation = parts.slice(0, -1).join('\n');
    move = parts[parts.length - 1].replace('Suggestion: ', '').trim();
  }

  return {
    move,
    explanation,
    threadId: thread.id,
  };
};