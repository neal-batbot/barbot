import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../src/config/db/schema.postgres';
import { eq } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres.ephbgwqsykcapizrimnd:ebvT8FhFjzVlEnnB@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

async function main() {
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    console.log('Checking current dify_bots configuration...');

    // Check current configuration
    const currentConfig = await db.select().from(config).where(eq(config.name, 'dify_bots'));

    if (currentConfig.length > 0) {
      console.log('Found existing configuration:');
      console.log(currentConfig[0].value);
    } else {
      console.log('No existing configuration found.');
    }

    // New configuration with both bots
    const newConfig = [
      {
        id: "ti-chatbot",
        title: "TI ChatBot Assistant",
        api_key: "app-cBHod54lb7bXLu1Pfvje6TLc",
        has_rating: true,
        ratings: ["Catalog工业", "Automotive汽车"],
        default_rating: "Catalog工业"
      },
      {
        id: "novosns",
        title: "Novosns Assistant",
        api_key: "app-aVBbh5NMBP1yswkV04fn4a3T",
        has_rating: false
      }
    ];

    const configValue = JSON.stringify(newConfig);

    if (currentConfig.length === 0) {
      console.log('\nInserting new dify_bots configuration...');
      await db.insert(config).values({
        name: 'dify_bots',
        value: configValue
      });
      console.log('✅ Inserted successfully');
    } else {
      console.log('\nUpdating dify_bots configuration...');
      await db.update(config)
        .set({ value: configValue })
        .where(eq(config.name, 'dify_bots'));
      console.log('✅ Updated successfully');
    }

    // Verify the update
    const verifyConfig = await db.select().from(config).where(eq(config.name, 'dify_bots'));
    console.log('\n✅ Configuration saved to database:');
    console.log(verifyConfig[0].value);

    console.log('\n✅ All done! Please verify the API response at:');
    console.log('curl http://localhost:3000/api/chat/bots');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
