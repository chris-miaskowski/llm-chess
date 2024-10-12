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
    tools: [
      {
        type: "function",
        function: {
          name: "make_move",
          description: "Make a chess move and provide commentary",
          parameters: {
            type: "object",
            properties: {
              move: {
                type: "string",
                description: "The chess move in algebraic notation (e.g., 'e2e4', 'Nf3', 'O-O')",
              },
              comment: {
                type: "string",
                description: "Commentary or explanation for the move",
              },
            },
            required: ["move", "comment"],
            additionalProperties: false
          },
          strict: true
        },
      },
    ],
  });

  let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

  while (runStatus.status !== 'completed') {
    if (runStatus.status === 'requires_action') {
      const toolCalls = runStatus.required_action?.submit_tool_outputs.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        const toolCall = toolCalls[0];
        if (toolCall.function.name === 'make_move') {
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          // Submit the tool outputs back to the run
          await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
            tool_outputs: [
              {
                tool_call_id: toolCall.id,
                output: JSON.stringify({ success: true }),
              },
            ],
          });

          return {
            move: functionArgs.move,
            explanation: functionArgs.comment,
            threadId: thread.id,
          };
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  }

  throw new Error('AI did not make a move');
};