import { getAllConfigs } from '../src/shared/models/config';

async function main() {
  try {
    const configs = await getAllConfigs();

    console.log('dify_bots config value:');
    console.log(configs.dify_bots || 'undefined');

    if (configs.dify_bots) {
      const bots = JSON.parse(configs.dify_bots);
      console.log('\nParsed bots:');
      console.log(JSON.stringify(bots, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
