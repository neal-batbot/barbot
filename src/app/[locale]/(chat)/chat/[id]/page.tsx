import { LegacyChatById } from '@/shared/blocks/chat/legacy-chat-by-id';
import { PiChatEntry } from '@/shared/blocks/chat/pi-chat-entry';
import { getChatUiMode } from '@/shared/lib/chat-ui-mode';

export default function ChatByIdPage() {
  return getChatUiMode() === 'legacy' ? <LegacyChatById /> : <PiChatEntry />;
}
