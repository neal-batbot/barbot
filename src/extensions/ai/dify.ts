/**
 * Dify AI Platform Integration
 * https://docs.dify.ai/
 */

export interface DifyConfig {
  apiKey: string;
  apiUrl: string;
}

export interface DifyChatRequest {
  inputs: Record<string, any>;
  query: string;
  response_mode: 'streaming' | 'blocking';
  conversation_id?: string;
  user: string;
  files?: DifyFile[];
}

export interface DifyFile {
  type: 'image' | 'document';
  transfer_method: 'remote_url' | 'local_file';
  url?: string;
  upload_file_id?: string;
}

export interface DifyStreamEvent {
  event: string;
  conversation_id?: string;
  message_id?: string;
  answer?: string;
  task_id?: string;
  metadata?: any;
  data?: any;
}

export interface DifyStreamState {
  fullAnswer: string;
  conversationId: string;
  messageId: string;
  taskId: string;
  metadata?: any;
}

export interface DifyStreamOptions {
  model?: string;
  showNodeEvents?: boolean;
  onMessageEnd?: (state: DifyStreamState, event: DifyStreamEvent) => Promise<void> | void;
  onError?: (error: unknown) => void;
}

function buildDifyState(): DifyStreamState {
  return {
    fullAnswer: '',
    conversationId: '',
    messageId: '',
    taskId: '',
  };
}

function createOpenAIChunk(params: {
  id: string;
  model: string;
  created: number;
  delta: Record<string, any>;
  finishReason?: string | null;
  usage?: any;
  dify?: any;
}) {
  const chunk: any = {
    id: params.id,
    object: 'chat.completion.chunk',
    created: params.created,
    model: params.model,
    choices: [
      {
        index: 0,
        delta: params.delta,
        finish_reason: params.finishReason ?? null,
      },
    ],
  };

  if (params.usage) {
    chunk.usage = params.usage;
  }

  if (params.dify) {
    chunk._dify = params.dify;
  }

  return chunk;
}

function writeSse(controller: ReadableStreamDefaultController, encoder: TextEncoder, data: string) {
  controller.enqueue(encoder.encode(data));
}

function writeSseEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  eventName: string,
  payload: any
) {
  writeSse(controller, encoder, `event: ${eventName}\n`);
  writeSse(controller, encoder, `data: ${JSON.stringify(payload)}\n\n`);
}

function updateStateFromEvent(state: DifyStreamState, event: DifyStreamEvent) {
  if (event.conversation_id && !state.conversationId) {
    state.conversationId = event.conversation_id;
  }
  if (event.message_id && !state.messageId) {
    state.messageId = event.message_id;
  }
  if (event.task_id && !state.taskId) {
    state.taskId = event.task_id;
  }
}

export function createDifyAiSdkStream(
  difyStream: ReadableStream,
  options: DifyStreamOptions = {}
): { stream: ReadableStream; state: DifyStreamState } {
  const state = buildDifyState();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const showNodeEvents = options.showNodeEvents !== false;

  const stream = new ReadableStream({
    async start(controller) {
      const reader = difyStream.getReader();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr) as DifyStreamEvent;
              updateStateFromEvent(state, event);

              if (event.event === 'message' || event.event === 'agent_message') {
                if (event.answer) {
                  state.fullAnswer += event.answer;
                  const chunk = `0:${JSON.stringify(event.answer)}\n`;
                  writeSse(controller, encoder, chunk);
                }
              }

              if (showNodeEvents) {
                if (event.event === 'workflow_started') {
                  writeSseEvent(controller, encoder, 'workflow', {
                    status: 'started',
                    workflow_run_id: event.data?.id || event.data?.workflow_run_id || null,
                  });
                }
                if (event.event === 'workflow_finished') {
                  writeSseEvent(controller, encoder, 'workflow', {
                    status: 'finished',
                    workflow_run_id: event.data?.id || event.data?.workflow_run_id || null,
                  });
                }
                if (event.event === 'node_started') {
                  writeSseEvent(controller, encoder, 'node', {
                    status: 'started',
                    title: event.data?.title || event.data?.node_id || 'unknown-node',
                    node_type: event.data?.node_type || 'unknown-type',
                    node_id: event.data?.node_id || null,
                  });
                }
                if (event.event === 'node_finished') {
                  writeSseEvent(controller, encoder, 'node', {
                    status: 'finished',
                    title: event.data?.title || event.data?.node_id || 'unknown-node',
                    node_type: event.data?.node_type || 'unknown-type',
                    node_id: event.data?.node_id || null,
                    elapsed_ms:
                      event.data?.elapsed_time ??
                      event.data?.elapsed_ms ??
                      event.data?.duration ??
                      null,
                  });
                }
              }

              if (event.event === 'message_end') {
                state.metadata = event.metadata;
                if (options.onMessageEnd) {
                  await options.onMessageEnd(state, event);
                }

                const finishChunk = `d:${JSON.stringify({ finishReason: 'stop' })}\n`;
                writeSse(controller, encoder, finishChunk);
                controller.close();
                return;
              }
            } catch (parseError) {
              console.error('Failed to parse Dify SSE data:', parseError);
            }
          }
        }

        const finishChunk = `d:${JSON.stringify({ finishReason: 'stop' })}\n`;
        writeSse(controller, encoder, finishChunk);
        controller.close();
      } catch (error) {
        options.onError?.(error);
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });

  return { stream, state };
}

export function createDifyOpenAIStream(
  difyStream: ReadableStream,
  options: DifyStreamOptions = {}
): { stream: ReadableStream; state: DifyStreamState } {
  const state = buildDifyState();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const created = Math.floor(Date.now() / 1000);
  const model = options.model || 'dify-model';
  const showNodeEvents = options.showNodeEvents !== false;

  let chatId = `chatcmpl-${Date.now()}`;
  let hasStarted = false;

  const stream = new ReadableStream({
    async start(controller) {
      const reader = difyStream.getReader();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr) as DifyStreamEvent;
              updateStateFromEvent(state, event);

              if (state.taskId && chatId.startsWith('chatcmpl-')) {
                chatId = state.taskId;
              }

              if (event.event === 'message' || event.event === 'agent_message') {
                if (event.answer) {
                  state.fullAnswer += event.answer;
                  const chunk = createOpenAIChunk({
                    id: chatId,
                    created,
                    model,
                    delta: hasStarted
                      ? { content: event.answer }
                      : { role: 'assistant', content: event.answer },
                  });
                  writeSse(controller, encoder, `data: ${JSON.stringify(chunk)}\n\n`);
                  hasStarted = true;
                }
              }

              if (event.event === 'message_replace') {
                const chunk = createOpenAIChunk({
                  id: chatId,
                  created,
                  model,
                  delta: { content: event.answer || '' },
                });
                writeSse(controller, encoder, `data: ${JSON.stringify(chunk)}\n\n`);
              }

              if (showNodeEvents) {
                if (event.event === 'workflow_started') {
                  writeSseEvent(controller, encoder, 'workflow', {
                    status: 'started',
                    workflow_run_id: event.data?.workflow_run_id || event.data?.id || null,
                  });
                }
                if (event.event === 'workflow_finished') {
                  writeSseEvent(controller, encoder, 'workflow', {
                    status: 'finished',
                    workflow_run_id: event.data?.workflow_run_id || event.data?.id || null,
                  });
                }
                if (event.event === 'node_started') {
                  writeSseEvent(controller, encoder, 'node', {
                    status: 'started',
                    title: event.data?.title || event.data?.node_id || 'unknown-node',
                    node_type: event.data?.node_type || 'unknown-type',
                    node_id: event.data?.node_id || null,
                  });
                }
                if (event.event === 'node_finished') {
                  writeSseEvent(controller, encoder, 'node', {
                    status: 'finished',
                    title: event.data?.title || event.data?.node_id || 'unknown-node',
                    node_type: event.data?.node_type || 'unknown-type',
                    node_id: event.data?.node_id || null,
                    elapsed_ms:
                      event.data?.elapsed_time ??
                      event.data?.elapsed_ms ??
                      event.data?.duration ??
                      null,
                  });
                }
              }

              if (event.event === 'message_end') {
                state.metadata = event.metadata;
                if (options.onMessageEnd) {
                  await options.onMessageEnd(state, event);
                }

                const usage = event.metadata?.usage
                  ? {
                      prompt_tokens: event.metadata.usage.prompt_tokens || 0,
                      completion_tokens: event.metadata.usage.completion_tokens || 0,
                      total_tokens: event.metadata.usage.total_tokens || 0,
                    }
                  : undefined;

                const difyPayload = {
                  conversation_id: state.conversationId || event.conversation_id || null,
                  message_id: state.messageId || event.message_id || null,
                  task_id: state.taskId || event.task_id || null,
                  retriever_resources: event.metadata?.retriever_resources || null,
                };

                const endChunk = createOpenAIChunk({
                  id: chatId,
                  created,
                  model,
                  delta: {},
                  finishReason: 'stop',
                  usage,
                  dify: difyPayload,
                });
                writeSse(controller, encoder, `data: ${JSON.stringify(endChunk)}\n\n`);
                writeSse(controller, encoder, 'data: [DONE]\n\n');
                controller.close();
                return;
              }

              if (event.event === 'error') {
                const errorChunk = createOpenAIChunk({
                  id: chatId,
                  created,
                  model,
                  delta: {},
                  finishReason: 'stop',
                });
                errorChunk.error = {
                  message: (event as any).message || 'Dify stream error',
                  type: 'server_error',
                  code: (event as any).code,
                };
                writeSse(controller, encoder, `data: ${JSON.stringify(errorChunk)}\n\n`);
                writeSse(controller, encoder, 'data: [DONE]\n\n');
                controller.close();
                return;
              }
            } catch (parseError) {
              console.error('Failed to parse Dify SSE data:', parseError);
            }
          }
        }

        const endChunk = createOpenAIChunk({
          id: chatId,
          created,
          model,
          delta: {},
          finishReason: 'stop',
        });
        writeSse(controller, encoder, `data: ${JSON.stringify(endChunk)}\n\n`);
        writeSse(controller, encoder, 'data: [DONE]\n\n');
        controller.close();
      } catch (error) {
        options.onError?.(error);
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });

  return { stream, state };
}

/**
 * Stream chat messages from Dify API
 */
export async function streamDifyChatMessages(
  config: DifyConfig,
  request: DifyChatRequest
): Promise<ReadableStream> {
  const url = `${config.apiUrl}/v1/chat-messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    // Try to get error details from response body
    let errorMessage = `Dify API request failed: ${response.status} ${response.statusText}`;
    let errorData: any = null;
    try {
      const errorText = await response.text();
      if (errorText) {
        // Try to parse as JSON first
        try {
          errorData = JSON.parse(errorText);
          errorMessage = errorText; // Use full JSON string
        } catch (e) {
          // If not JSON, use as plain text
          errorMessage = errorText;
        }
      }
    } catch (e) {
      // Ignore error parsing error response
    }
    const error = new Error(errorMessage) as any;
    error.status = response.status;
    error.statusText = response.statusText;
    error.data = errorData; // Attach parsed error data if available
    throw error;
  }

  if (!response.body) {
    throw new Error('Dify API response has no body');
  }

  return response.body;
}

/**
 * Parse Dify SSE stream
 */
export async function* parseDifyStream(
  stream: ReadableStream
): AsyncGenerator<DifyStreamEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            yield data as DifyStreamEvent;
          } catch (e) {
            console.error('Failed to parse Dify SSE data:', e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Get Dify configuration from environment or config table
 */
export async function getDifyConfig(): Promise<DifyConfig | null> {
  try {
    const { getAllConfigs } = await import('@/shared/models/config');
    const configs = await getAllConfigs();

    // Priority: config table > env vars
    const apiKey = configs.dify_api_key || process.env.DIFY_API_KEY;
    const apiUrl = configs.dify_api_url || process.env.DIFY_API_URL;

    if (!apiKey || !apiUrl) {
      console.warn('Dify API credentials not configured');
      return null;
    }

    return { apiKey, apiUrl };
  } catch (error) {
    console.error('Failed to get Dify config:', error);
    return null;
  }
}

