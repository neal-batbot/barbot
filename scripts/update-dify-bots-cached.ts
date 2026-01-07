import { saveConfigs } from '../src/shared/models/config';

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

async function main() {
  try {
    console.log('Updating dify_bots configuration with cache invalidation...');

    await saveConfigs({
      dify_bots: JSON.stringify(newConfig)
    });

    console.log('✅ Configuration updated and cache invalidated!');
    console.log('\nPlease verify the API response:');
    console.log('curl http://localhost:3000/api/chat/bots');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
