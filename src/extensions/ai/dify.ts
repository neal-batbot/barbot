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
  metadata?: any;
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

