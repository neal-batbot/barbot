import { db } from '../src/core/db';
import { chat } from '../src/config/db/schema';
import { eq } from 'drizzle-orm';

async function clearAllConversationIds() {
  console.log('Starting to clear all Dify conversation_ids...\n');

  const chats = await db().select().from(chat).where(eq(chat.provider, 'dify'));

  console.log(`Found ${chats.length} Dify chats\n`);

  let clearedCount = 0;

  for (const c of chats) {
    if (c.metadata) {
      try {
        const metadata = JSON.parse(c.metadata);
        if (metadata.dify_conversation_id) {
          console.log(`[${c.id.substring(0, 8)}] Clearing conversation_id for "${c.title}"`);
          console.log(`  Old conversation_id: ${metadata.dify_conversation_id}`);

          const newMetadata = { ...metadata };
          delete newMetadata.dify_conversation_id;

          await db().update(chat)
            .set({ metadata: JSON.stringify(newMetadata) })
            .where(eq(chat.id, c.id));

          clearedCount++;
        }
      } catch (e) {
        console.error(`Failed to clear conversation_id for chat ${c.id}:`, e);
      }
    }
  }

  console.log(`\n✅ Successfully cleared ${clearedCount} conversation_id(s)`);
  console.log('✅ All Dify chats can now start fresh conversations\n');

  process.exit(0);
}

clearAllConversationIds().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
