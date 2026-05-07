import { db } from '../src/core/db';
import { config } from '../src/config/db/schema';
import { eq } from 'drizzle-orm';

async function addDifyUrl() {
  const difyUrl = process.env.DIFY_API_URL || 'https://api.dify.ai';

  // Check if dify_api_url already exists
  const existing = await db().select().from(config).where(eq(config.name, 'dify_api_url'));

  if (existing.length > 0) {
    console.log('✅ dify_api_url already exists in database');
    console.log('   Current value:', existing[0].value);
    console.log('\nUpdating to:', difyUrl);

    await db().update(config)
      .set({ value: difyUrl })
      .where(eq(config.name, 'dify_api_url'));

    console.log('✅ Updated successfully');
  } else {
    console.log('⚠️  dify_api_url not found in database');
    console.log('   Inserting:', difyUrl);

    await db().insert(config)
      .values({
        name: 'dify_api_url',
        value: difyUrl,
      });

    console.log('✅ Inserted successfully');
  }

  console.log('\nVerifying...');
  const updated = await db().select().from(config).where(eq(config.name, 'dify_api_url'));
  console.log('Current database value:', updated[0].value);

  process.exit(0);
}

addDifyUrl().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
