// 引入必要的模块
import { getUserData } from './getDescription.js';
import { getUserTweets, generateUserDataHtml } from './getNewTweets.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 根据用户名获取推文数据
 * @param {string} username - Twitter用户名
 * @returns {Promise<Object>} 推文数据
 */
async function getTweetsByUsername(username = 'dotyyds1234') {
  try {
    // 清理用户名（移除@和空格）
    const cleanUsername = username.replace('@', '').trim();
    
    // 获取用户数据，包含用户ID
    console.log(`正在获取用户 ${cleanUsername} 的数据...`);
    const userData = await getUserData(cleanUsername);
    
    if (!userData || !userData.data || !userData.data.user || !userData.data.user.result || !userData.data.user.result.rest_id) {
      throw new Error(`无法获取用户 ${cleanUsername} 的数据`);
    }
    
    // 直接从用户数据中提取用户ID
    const userId = userData.data.user.result.rest_id;
    console.log(`获取到用户 ${cleanUsername} 的ID: ${userId}`);
    
    // 使用用户ID获取推文
    const tweetsData = await getUserTweets(userId, cleanUsername);
    
    // 生成HTML文件
    await generateUserDataHtml(cleanUsername, tweetsData);
    
    return tweetsData;
  } catch (error) {
    console.error(`获取推文失败:`, error.message);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 从命令行获取用户名，没有则使用默认值
    const username = process.argv[2] || 'dotyyds1234';
    await getTweetsByUsername(username);
    console.log('脚本执行完成');
  } catch (error) {
    console.error('程序执行失败:', error.message);
  }
}

// 如果直接运行此脚本，则执行主函数
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

// 导出函数供其他模块使用
export { getTweetsByUsername }; 