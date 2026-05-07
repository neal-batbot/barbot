import { ChatGenerator } from '@/shared/blocks/chat/generator';
import { PiChatEntry } from '@/shared/blocks/chat/pi-chat-entry';
import { getChatUiMode } from '@/shared/lib/chat-ui-mode';

export default function ChatPage() {
  return getChatUiMode() === 'legacy' ? <ChatGenerator /> : <PiChatEntry />;
}
