import OpenAI from 'openai';
import { EventEmitter } from 'events';
import { AISettings } from '../components/AISettings';
import { getAIInstructions } from '../utils/aiInstructions';
import { GameState } from '../logic/gameState';
import { Thread } from 'openai/resources/beta/threads/threads';
import { AssistantStreamEvent } from 'openai/resources/beta/assistants';

let openai: OpenAI | null = null;

export const initializeOpenAI = (apiKey: string) => {
  openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
};

class ChessEventHandler extends EventEmitter {
  private client: OpenAI;
  private moveResult: { move: string; chainOfThoughts: string } | null = null;
  private onThoughtUpdate: (thought: string) => void;

  constructor(client: OpenAI, onThoughtUpdate: (thought: string) => void) {
    super();
    this.client = client;
    this.onThoughtUpdate = onThoughtUpdate;
  }

  async onEvent(event: AssistantStreamEvent) {
    try {
      console.log('Event received:', event);
      if (event.event === 'thread.run.requires_action') {
        await this.handleRequiresAction(
          event.data,
          event.data.id,
          event.data.thread_id,
        );
      } else if (event.event === 'thread.run.completed') {
        if (!this.moveResult) {
          const messages = await this.client.beta.threads.messages.list(event.data.thread_id);
          const lastAssistantMessage = messages.data.find(msg => msg.role === 'assistant');
          if (lastAssistantMessage) {
            console.log('Last assistant message:', lastAssistantMessage.content);
          }
          throw new Error('AI did not make a move');
        }
        this.emit('moveCompleted', this.moveResult);
      } else if ( event.event === 'thread.message.delta' && event.data.delta && event.data.delta.content && event.data.delta.content[0].type === 'text' ) {
        const txt = event.data.delta.content[0].text
        if(!!txt) {
          console.log('Message delta:', txt.value);
          this.onThoughtUpdate(txt.value || '');
        }
      }
    } catch (error) {
      console.error('Error handling event:', error);
      this.emit('error', error);
    }
  }

  async handleRequiresAction(data: any, runId: string, threadId: string) {
    try {
      const toolCalls = data.required_action.submit_tool_outputs.tool_calls;
      const toolOutputs = toolCalls.map((toolCall: any) => {
        if (toolCall.function.name === 'make_move') {
          const functionArgs = JSON.parse(toolCall.function.arguments);
          this.moveResult = {
            move: functionArgs.move,
            chainOfThoughts: functionArgs.chainOfThoughts
          };
          return {
            tool_call_id: toolCall.id,
            output: JSON.stringify({ success: true }),
          };
        }
        return null;
      }).filter(Boolean);

      await this.submitToolOutputs(toolOutputs, runId, threadId);
    } catch (error) {
      console.error('Error processing required action:', error);
      this.emit('error', error);
    }
  }

  async submitToolOutputs(toolOutputs: any[], runId: string, threadId: string) {
    try {
      const stream = await this.client.beta.threads.runs.submitToolOutputsStream(
        threadId,
        runId,
        { tool_outputs: toolOutputs },
      );
      for await (const event of stream) {
        this.emit('event', event);
      }
    } catch (error) {
      console.error('Error submitting tool outputs:', error);
      this.emit('error', error);
    }
  }
}

export const getAIMove = async (
  settings: AISettings,
  gameState: GameState,
  moveHistory: any,
  threadId: string | null,
  onThoughtUpdate: (thought: string) => void
): Promise<{ move: string; chainOfThoughts: string; threadId: string }> => {
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }

  return new Promise(async (resolve, reject) => {
    if(!openai) {
      throw new Error('OpenAI client not initialized');
    }
    try {
      let thread: Thread;
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
--------------------------------
Current player: ${currentPlayer}
Game status: ${gameStatus}
Game mode: ${gameState.aiMode}
Move History: ${moveHistory.map((move: any) => JSON.stringify(move)).join('\n')}`,
      });

      const eventHandler = new ChessEventHandler(openai, onThoughtUpdate);
      eventHandler.on('event', eventHandler.onEvent.bind(eventHandler));
      eventHandler.on('moveCompleted', (result) => {
        resolve({ ...result, threadId: thread.id });
      });
      eventHandler.on('error', (error) => {
        reject(error);
      });

      const stream = await openai.beta.threads.runs.stream(
        thread.id,
        {
          assistant_id: settings.assistantId,
          tool_choice: { type: 'function', function: { name: 'make_move' } },
          instructions: getAIInstructions(settings.mode, settings.level),
          tools: [
            {
              type: 'function',
              function: {
                name: 'make_move',
                description: 'Make a chess move and provide commentary',
                parameters: {
                  type: 'object',
                  properties: {
                    chainOfThoughts: {
                      type: 'string',
                      description: `A chain-of-thoughts 
1. Analyze Board State: Assess current piece positions, material count, and threats.
2. Generate Legal Moves: List all possible moves for the current player.
3. Evaluate Moves: Score each move based on material gain, positional strength, and king safety.
4. Predict Opponent's Responses: Simulate the opponent's best possible reactions.
5. Apply Evaluation Function: Use heuristics or models to score each resulting board state.
6. Choose Optimal Move: Select the move with the highest evaluation score.`,
                    },
                    move: {
                      type: 'string',
                      description: 'The chess move in algebraic notation (e.g., "e2e4"). It must always be a valid move and include from and to squares.',
                    },
                  },
                  required: ['chainOfThoughts', 'move'],
                },
              },
            },
          ],
        },
      );

      for await (const event of stream) {
        eventHandler.emit('event', event);
      }
    } catch (error) {
      console.error('Error in getAIMove:', error);
      reject(new Error('Failed to get AI move: ' + (error as Error).message));
    }
  });
};