import { db } from '../src/core/db';
import { config } from '../src/config/db/schema';
import { eq } from 'drizzle-orm';

async function verifyDifyBots() {
  const configs = await db().select().from(config).where(eq(config.name, 'dify_bots'));

  if (configs.length === 0) {
    console.log('❌ dify_bots 配置不存在，需要插入');
    return false;
  }

  const currentConfig = configs[0].value;
  console.log('当前配置:', currentConfig);

  try {
    const bots = JSON.parse(currentConfig);
    console.log('✅ 配置格式正确');
    console.log('机器人数量:', bots.length);
    bots.forEach((bot: any, index: number) => {
      console.log(`  ${index + 1}. ${bot.title} (${bot.id})`);
    });

    const hasNovosns = bots.some((b: any) => b.id === 'novosns');
    if (!hasNovosns) {
      console.log('❌ novosns 机器人不存在，需要添加');
      return false;
    }

    console.log('✅ novosns 机器人已存在');
    return true;
  } catch (e) {
    console.log('❌ 配置 JSON 格式错误:', e);
    return false;
  }
}

async function updateDifyBots() {
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

  await db().update(config)
    .set({ value: JSON.stringify(newConfig) })
    .where(eq(config.name, 'dify_bots'));

  console.log('✅ 数据库配置已更新');
}

async function main() {
  const isCorrect = await verifyDifyBots();

  if (!isCorrect) {
    console.log('\n正在更新配置...');
    await updateDifyBots();

    // 验证更新
    console.log('\n验证更新后的配置:');
    await verifyDifyBots();
  }

  process.exit(0);
}

main();
