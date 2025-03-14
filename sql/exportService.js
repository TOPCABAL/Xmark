import { getDatabase } from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 导出路径
const EXPORT_DIR = path.join(__dirname, '..', 'exports');

// 确保导出目录存在
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  console.log(`已创建导出目录: ${EXPORT_DIR}`);
}

/**
 * 导出数据到CSV文件
 * @param {Object} options 选项参数
 * @param {string} options.category 筛选的分类
 * @param {boolean} options.isAnnotated 是否已标注
 * @returns {Promise<{success: boolean, filename: string, count: number, filePath: string}>}
 */
export async function exportToCsv(options = {}) {
  const db = await getDatabase();
  
  try {
    console.log(`[导出CSV] 开始导出数据, 选项:`, options);
    
    // 构建SQL查询
    let sql = 'SELECT * FROM twitter_accounts WHERE 1=1';
    const params = [];
    
    if (options.category) {
      sql += ' AND category = ?';
      params.push(options.category);
    }
    
    if (options.isAnnotated === true) {
      sql += ' AND annotated_at IS NOT NULL';
    } else if (options.isAnnotated === false) {
      sql += ' AND annotated_at IS NULL';
    }
    
    sql += ' ORDER BY import_date DESC';
    
    // 执行查询
    const accounts = await db.all(sql, params);
    
    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        message: '没有找到符合条件的账号',
        count: 0
      };
    }
    
    console.log(`[导出CSV] 找到 ${accounts.length} 个符合条件的账号`);
    
    // 生成CSV
    let csv = 'username,twitter_id,name,description,category,notes,followers_count,following_count,tweet_count,verified,imported_from,import_date,annotated_at\n';
    
    accounts.forEach(account => {
      // 处理特殊字符，确保CSV格式正确
      const escapeCsvField = (field) => {
        if (field === null || field === undefined) return '';
        
        const str = String(field);
        // 如果包含逗号、双引号或换行符，需要用双引号包裹并转义双引号
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      csv += [
        escapeCsvField(account.username),
        escapeCsvField(account.twitter_id),
        escapeCsvField(account.name),
        escapeCsvField(account.description),
        escapeCsvField(account.category),
        escapeCsvField(account.notes),
        account.followers_count || 0,
        account.following_count || 0,
        account.tweet_count || 0,
        account.verified ? 1 : 0,
        escapeCsvField(account.imported_from),
        escapeCsvField(account.import_date),
        escapeCsvField(account.annotated_at)
      ].join(',') + '\n';
    });
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const categoryStr = options.category ? `_${options.category}` : '';
    const annotatedStr = options.isAnnotated === true ? '_annotated' : 
                        options.isAnnotated === false ? '_unannotated' : '';
    
    const filename = `twitter_accounts${categoryStr}${annotatedStr}_${timestamp}.csv`;
    const filePath = path.join(EXPORT_DIR, filename);
    
    // 确保导出目录存在
    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(filePath, csv, 'utf8');
    
    console.log(`[导出CSV] 成功导出到文件: ${filePath}`);
    
    return {
      success: true,
      filename,
      filePath,
      count: accounts.length
    };
  } catch (error) {
    console.error('[导出CSV] 导出数据失败:', error);
    throw new Error(`导出CSV失败: ${error.message}`);
  }
}

/**
 * 导出数据到JSON文件
 * @param {Object} options 选项参数
 * @param {string} options.category 筛选的分类
 * @param {boolean} options.isAnnotated 是否已标注
 * @returns {Promise<{success: boolean, filename: string, count: number, filePath: string}>}
 */
export async function exportToJson(options = {}) {
  const db = await getDatabase();
  
  try {
    console.log(`[导出JSON] 开始导出数据, 选项:`, options);
    
    // 构建SQL查询
    let sql = 'SELECT * FROM twitter_accounts WHERE 1=1';
    const params = [];
    
    if (options.category) {
      sql += ' AND category = ?';
      params.push(options.category);
    }
    
    if (options.isAnnotated === true) {
      sql += ' AND annotated_at IS NOT NULL';
    } else if (options.isAnnotated === false) {
      sql += ' AND annotated_at IS NULL';
    }
    
    sql += ' ORDER BY import_date DESC';
    
    // 执行查询
    const accounts = await db.all(sql, params);
    
    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        message: '没有找到符合条件的账号',
        count: 0
      };
    }
    
    console.log(`[导出JSON] 找到 ${accounts.length} 个符合条件的账号`);
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const categoryStr = options.category ? `_${options.category}` : '';
    const annotatedStr = options.isAnnotated === true ? '_annotated' : 
                        options.isAnnotated === false ? '_unannotated' : '';
    
    const filename = `twitter_accounts${categoryStr}${annotatedStr}_${timestamp}.json`;
    const filePath = path.join(EXPORT_DIR, filename);
    
    // 确保导出目录存在
    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(filePath, JSON.stringify({
      accounts,
      meta: {
        exportDate: new Date().toISOString(),
        count: accounts.length,
        filters: options
      }
    }, null, 2), 'utf8');
    
    console.log(`[导出JSON] 成功导出到文件: ${filePath}`);
    
    return {
      success: true,
      filename,
      filePath,
      count: accounts.length
    };
  } catch (error) {
    console.error('[导出JSON] 导出数据失败:', error);
    throw new Error(`导出JSON失败: ${error.message}`);
  }
} 