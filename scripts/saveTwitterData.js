import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 将解析的Twitter数据保存为应用程序可用的JSON格式
 */
async function saveTwitterData() {
  try {
    // 读取user_data.html文件内容
    const htmlPath = path.resolve(__dirname, '../user_data.html');
    console.log(`正在读取文件: ${htmlPath}`);
    
    // 读取parseUser.js输出的JSON数据
    const rawJsonPath = path.resolve(__dirname, '../userData.json');
    if (!fs.existsSync(rawJsonPath)) {
      console.error('找不到userData.json文件，请先运行parseuser.js生成数据');
      return;
    }
    
    const userData = JSON.parse(fs.readFileSync(rawJsonPath, 'utf8'));
    
    // 确保目标目录存在
    const targetDir = path.resolve(__dirname, '../public/data/twitter');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // 保存为应用程序可用的JSON格式
    const targetPath = path.resolve(targetDir, 'user_data.json');
    fs.writeFileSync(targetPath, JSON.stringify(userData, null, 2));
    
    console.log(`Twitter数据已保存到: ${targetPath}`);
    console.log('完成！现在可以在应用程序中使用这些数据。');
  } catch (error) {
    console.error('保存Twitter数据时出错:', error);
  }
}

// 执行保存操作
saveTwitterData(); 