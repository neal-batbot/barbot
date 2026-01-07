import { db } from '../src/core/db';
import { config } from '../src/config/db/schema';

async function verifyDifyConfig() {
  const configs = await db().select().from(config);

  const difyApiUrlConfig = configs.find(c => c.name === 'dify_api_url');
  const difyApiKeyConfig = configs.find(c => c.name === 'dify_api_key');
  const difyBotsConfig = configs.find(c => c.name === 'dify_bots');

  const difyApiUrl = difyApiUrlConfig?.value;
  const difyApiKey = difyApiKeyConfig?.value;
  const difyBots = difyBotsConfig?.value;

  console.log('=== Dify Configuration ===\n');
  console.log('Dify API URL:', difyApiUrl || '❌ Not configured');
  console.log('Dify API Key:', difyApiKey ? `✅ ${difyApiKey.substring(0, 15)}...` : '❌ Not set');
  console.log('');

  if (difyBots) {
    try {
      const bots = JSON.parse(difyBots);
      console.log(`✅ Dify Bots Config: ${bots.length} bot(s) configured`);
      bots.forEach((bot: any, index: number) => {
        console.log(`  ${index + 1}. ${bot.title} (${bot.id})`);
        console.log(`     API Key: ${bot.api_key.substring(0, 15)}...`);
        console.log(`     Has Rating: ${bot.has_rating ? 'Yes' : 'No'}`);
      });
    } catch (e) {
      console.log('❌ Dify Bots Config: Invalid JSON format');
      console.log('   Raw value:', difyBots);
    }
  } else {
    console.log('⚠️  Dify Bots Config: Not configured (using global API key)');
  }

  console.log('\n=== Testing API Connection ===\n');

  // Test API connection with each bot
  if (difyApiUrl && difyApiKey) {
    console.log('Testing with global API key...\n');

    try {
      const response = await fetch(`${difyApiUrl}/v1/chat-messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${difyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {},
          query: 'test',
          response_mode: 'blocking',
          user: 'test-verification',
        }),
      });

      console.log(`Response Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Global API key connection successful!');
        console.log('Conversation ID:', data.conversation_id);
        console.log('Message ID:', data.message_id);
      } else {
        const error = await response.text();
        console.log('❌ Global API key connection failed:');
        console.log('   ', error);
      }
    } catch (e) {
      console.log('❌ API connection error:', e);
    }
  }

  // Test each bot's API key
  if (difyBots) {
    try {
      const bots = JSON.parse(difyBots);

      console.log('\n=== Testing Bot-Specific API Keys ===\n');

      for (const bot of bots) {
        console.log(`Testing ${bot.title}...`);

        try {
          const response = await fetch(`${difyApiUrl}/v1/chat-messages`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${bot.api_key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: {},
              query: 'test',
              response_mode: 'blocking',
              user: 'test-verification',
            }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`  ✅ Connection successful!`);
            console.log(`  Conversation ID: ${data.conversation_id}`);
          } else {
            const error = await response.text();
            console.log(`  ❌ Connection failed (${response.status}):`);
            console.log(`     ${error}`);
          }
        } catch (e) {
          console.log(`  ❌ Connection error:`, e);
        }

        console.log('');
      }
    } catch (e) {
      console.log('Failed to parse bots config for testing');
    }
  }

  console.log('\n=== Verification Complete ===\n');

  process.exit(0);
}

verifyDifyConfig().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
