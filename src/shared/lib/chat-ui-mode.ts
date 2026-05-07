export type ChatUiMode = 'pi' | 'legacy';

export function getChatUiMode(): ChatUiMode {
  return process.env.CHAT_UI === 'legacy' ? 'legacy' : 'pi';
}

