#!/usr/bin/env node
import { getTweets } from './getNewTweets.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 手动获取Twitter用户数据的CLI脚本
 */
async function main() {
  // 从命令行参数获取用户名
  const username = process.argv[2];
  
  if (!username) {
    console.error('\n错误: 请提供Twitter用户名');
    console.log('\n用法: node fetchTwitterUser.js <用户名>');
    console.log('例如: node fetchTwitterUser.js elonmusk\n');
    process.exit(1);
  }
  
  console.log(`\n开始获取用户 ${username} 的Twitter数据...`);
  
  try {
    // 调用getTweets函数获取数据
    const data = await getTweets(username);
    
    // 创建符号链接，使生成的HTML文件在前端可见
    const htmlSource = path.join(__dirname, '..', 'public', `${username}_user_data.html`);
    const htmlDest = path.join(__dirname, '..', 'public', 'user_data.html');
    
    // 如果目标文件已存在，则删除
    if (fs.existsSync(htmlDest)) {
      fs.unlinkSync(htmlDest);
    }
    
    // 复制文件而不是创建符号链接（更兼容）
    fs.copyFileSync(htmlSource, htmlDest);
    
    console.log(`\n✅ 成功获取用户 ${username} 的数据`);
    console.log(`✅ HTML文件已创建: ${htmlSource}`);
    console.log(`✅ HTML文件已复制为默认文件: ${htmlDest}\n`);
    
    console.log('现在您可以在应用中查看此用户的Twitter数据\n');
  } catch (error) {
    console.error(`\n❌ 获取用户 ${username} 的Twitter数据失败:`);
    console.error(error.message);
    console.error('\n请检查用户名是否正确，以及网络连接是否正常\n');
    process.exit(1);
  }
}

// 执行主函数
main(); 