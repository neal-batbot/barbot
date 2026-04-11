import { getModel } from '@mariozechner/pi-ai';
import type { AgentEvent, AgentMessage, AgentState, ThinkingLevel } from '@mariozechner/pi-agent-core';

type ChatNewResponse = {
  code: number;
  message: string;
  data?: { id?: string };
};

type ChatMessagesResponse = {
  code: number;
  message: string;
  data?: {
    list?: Array<{
      role?: string;
      parts?: string | null;
    }>;
  };
};

export class BarbotPiSession {
  private readonly listeners = new Set<(event: AgentEvent) => void>();
  private abortController: AbortController | null = null;
  private backendChatId: string | null = null;
  private _state: AgentState;

  constructor() {
    const model = getModel('openai', 'gpt-4.1-mini');
    this._state = {
      systemPrompt: '',
      model,
      thinkingLevel: 'off',
      tools: [],
      messages: [],
      isStreaming: false,
      streamMessage: null,
      pendingToolCalls: new Set<string>(),
      error: undefined,
    };
  }

  public get state(): AgentState {
    return this._state;
  }

  public subscribe(listener: (event: AgentEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public setModel(model: AgentState['model']): void {
    this._state.model = model;
  }

  public setThinkingLevel(level: ThinkingLevel): void {
    this._state.thinkingLevel = level;
  }

  public setTools(tools: AgentState['tools']): void {
    this._state.tools = tools;
  }

  public appendMessage(message: AgentMessage): void {
    this._state.messages = [...this._state.messages, message];
  }

  public steer(message: AgentMessage): void {
    this.appendMessage(message);
  }

  public abort(): void {
    this.abortController?.abort();
  }

  public async prompt(input: string | AgentMessage | AgentMessage[]): Promise<void> {
    if (this._state.isStreaming) {
      throw new Error('Agent is already processing a prompt');
    }

    const userText = this.extractPromptText(input).trim();
    if (!userText) {
      return;
    }

    this.abortController = new AbortController();
    this._state.isStreaming = true;
    this._state.streamMessage = null;
    this._state.error = undefined;
    this.emit({ type: 'agent_start' });
    this.emit({ type: 'turn_start' });

    const userMessage: AgentMessage = {
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };
    this._state.messages = [...this._state.messages, userMessage];
    this.emit({ type: 'message_start', message: userMessage });
    this.emit({ type: 'message_end', message: userMessage });

    try {
      await this.ensureBackendChat(userText, this.abortController.signal);
      const assistantMessage = await this.sendToBackend(
        userText,
        this.abortController.signal
      );
      this.emit({
        type: 'turn_end',
        message: assistantMessage,
        toolResults: [],
      });
      this.emit({ type: 'agent_end', messages: this._state.messages });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'chat_request_failed';
      this._state.error = message;
      const errorAssistant: AgentMessage = {
        role: 'assistant',
        api: 'openai-completions',
        provider: this._state.model.provider,
        model: this._state.model.id,
        content: [{ type: 'text', text: message }],
        usage: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            total: 0,
          },
        },
        stopReason: 'error',
        errorMessage: message,
        timestamp: Date.now(),
      };
      this._state.messages = [...this._state.messages, errorAssistant];
      this.emit({ type: 'message_start', message: errorAssistant });
      this.emit({ type: 'message_end', message: errorAssistant });
      this.emit({
        type: 'turn_end',
        message: errorAssistant,
        toolResults: [],
      });
      this.emit({ type: 'agent_end', messages: this._state.messages });
    } finally {
      this._state.isStreaming = false;
      this._state.streamMessage = null;
      this.abortController = null;
    }
  }

  private async ensureBackendChat(
    userText: string,
    signal?: AbortSignal
  ): Promise<void> {
    if (this.backendChatId) {
      return;
    }

    const response = await fetch('/api/chat/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        message: { text: userText },
        body: {
          model: this._state.model.id,
          provider: this._state.model.provider,
        },
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`create_chat_failed_${response.status}`);
    }

    const payload = (await response.json()) as ChatNewResponse;
    if (payload.code !== 0 || !payload.data?.id) {
      throw new Error(payload.message || 'create_chat_failed');
    }
    this.backendChatId = payload.data.id;
  }

  private async sendToBackend(
    userText: string,
    signal?: AbortSignal
  ): Promise<AgentMessage> {
    if (!this.backendChatId) {
      throw new Error('chat_id_missing');
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        chatId: this.backendChatId,
        model: this._state.model.id,
        provider: this._state.model.provider,
        webSearch: false,
        message: {
          id: `msg-${Date.now()}`,
          role: 'user',
          parts: [{ type: 'text', text: userText }],
        },
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`chat_failed_${response.status}`);
    }

    if (!response.body) {
      throw new Error('chat_stream_missing');
    }

    const baseAssistantMessage: AgentMessage = {
      role: 'assistant',
      api: 'openai-completions',
      provider: this._state.model.provider,
      model: this._state.model.id,
      content: [{ type: 'text', text: '' }],
      usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          total: 0,
        },
      },
      stopReason: 'stop',
      timestamp: Date.now(),
    };

    this._state.streamMessage = baseAssistantMessage;
    this.emit({ type: 'message_start', message: baseAssistantMessage });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';
    let streamDone = false;
    let assistantText = '';

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      sseBuffer += decoder.decode(value, { stream: true });
      sseBuffer = sseBuffer.replace(/\r\n/g, '\n');

      let separatorIndex = sseBuffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        const rawEvent = sseBuffer.slice(0, separatorIndex).trim();
        sseBuffer = sseBuffer.slice(separatorIndex + 2);
        separatorIndex = sseBuffer.indexOf('\n\n');

        if (!rawEvent) {
          continue;
        }

        const payload = rawEvent
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('\n');

        if (!payload || payload === '[DONE]') {
          streamDone = payload === '[DONE]';
          continue;
        }

        let chunk: any;
        try {
          chunk = JSON.parse(payload);
        } catch {
          continue;
        }

        if (chunk.type === 'text-delta' && typeof chunk.delta === 'string') {
          assistantText += chunk.delta;
          const updatedMessage: AgentMessage = {
            ...baseAssistantMessage,
            content: [{ type: 'text', text: assistantText }],
          };
          this._state.streamMessage = updatedMessage;
          this.emit({
            type: 'message_update',
            message: updatedMessage,
            assistantMessageEvent: {
              type: 'text-delta',
              contentIndex: 0,
              delta: chunk.delta,
              partial: updatedMessage,
            } as any,
          });
        } else if (chunk.type === 'error') {
          throw new Error(
            typeof chunk.errorText === 'string'
              ? chunk.errorText
              : 'chat_stream_error'
          );
        }
      }
    }

    const finalText =
      assistantText || (await this.fetchLatestAssistantText(signal));
    const finalAssistantMessage: AgentMessage = {
      ...baseAssistantMessage,
      content: [{ type: 'text', text: finalText || 'No response' }],
    };

    this._state.streamMessage = null;
    this._state.messages = [...this._state.messages, finalAssistantMessage];
    this.emit({ type: 'message_end', message: finalAssistantMessage });
    return finalAssistantMessage;
  }

  private async fetchLatestAssistantText(signal?: AbortSignal): Promise<string> {
    if (!this.backendChatId) {
      return '';
    }

    const response = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        chatId: this.backendChatId,
        page: 1,
        limit: 20,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`fetch_messages_failed_${response.status}`);
    }

    const payload = (await response.json()) as ChatMessagesResponse;
    if (payload.code !== 0) {
      throw new Error(payload.message || 'fetch_messages_failed');
    }

    const list = payload.data?.list ?? [];
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const item = list[i];
      if (item.role !== 'assistant' || !item.parts) {
        continue;
      }
      try {
        const parts = JSON.parse(item.parts) as Array<{
          type?: string;
          text?: string;
        }>;
        const text = parts
          .filter((part) => part.type === 'text' && typeof part.text === 'string')
          .map((part) => part.text || '')
          .join('\n')
          .trim();
        if (text) {
          return text;
        }
      } catch {
        // Ignore invalid message payloads and continue.
      }
    }

    return '';
  }

  private extractPromptText(input: string | AgentMessage | AgentMessage[]): string {
    if (typeof input === 'string') {
      return input;
    }

    if (Array.isArray(input)) {
      for (let i = input.length - 1; i >= 0; i -= 1) {
        const text = this.extractMessageText(input[i]);
        if (text) {
          return text;
        }
      }
      return '';
    }

    return this.extractMessageText(input);
  }

  private extractMessageText(message: AgentMessage): string {
    if (!message || typeof message !== 'object') {
      return '';
    }
    if (!('content' in message)) {
      return '';
    }

    const content = message.content as unknown;
    if (typeof content === 'string') {
      return content;
    }
    if (!Array.isArray(content)) {
      return '';
    }
    return content
      .filter(
        (part) =>
          part &&
          typeof part === 'object' &&
          'type' in part &&
          (part as { type?: string }).type === 'text' &&
          typeof (part as { text?: unknown }).text === 'string'
      )
      .map((part) => (part as { text: string }).text)
      .join('\n');
  }

  private emit(event: AgentEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
