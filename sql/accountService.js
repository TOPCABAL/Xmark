import { getDatabase } from './database.js';

/**
 * 保存单个账号信息到数据库
 * @param {Object} account 账号信息对象
 * @param {string} importSource 导入来源（用户名）
 * @returns {Promise<Object>} 保存结果
 */
export async function saveAccount(account, importSource = '') {
  const db = await getDatabase();
  const now = new Date().toISOString();
  
  // 移除用户名中的@符号作为数据库主键
  const cleanUsername = account.username.replace(/^@/, '');
  
  try {
    // 检查账号是否已存在
    const existing = await db.get(
      'SELECT * FROM twitter_accounts WHERE username = ?', 
      cleanUsername
    );
    
    if (existing) {
      // 更新现有账号信息，但保留已有的标注
      await db.run(`
        UPDATE twitter_accounts SET
          twitter_id = ?,
          name = ?,
          description = ?,
          avatar_url = ?,
          verified = ?,
          followers_count = ?,
          following_count = ?,
          tweet_count = ?,
          imported_from = ?,
          import_date = ?,
          last_updated = ?
        WHERE username = ?
      `, [
        account.id,
        account.name,
        account.description || '',
        account.avatar || '',
        account.verified ? 1 : 0,
        account.metrics?.followers || 0,
        account.metrics?.following || 0,
        account.metrics?.tweets || 0,
        importSource,
        now,
        now,
        cleanUsername
      ]);
      
      return { updated: true, username: cleanUsername };
    } else {
      // 插入新账号
      await db.run(`
        INSERT INTO twitter_accounts (
          username, twitter_id, name, description, avatar_url, verified,
          followers_count, following_count, tweet_count,
          imported_from, import_date, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        cleanUsername,
        account.id,
        account.name,
        account.description || '',
        account.avatar || '',
        account.verified ? 1 : 0,
        account.metrics?.followers || 0,
        account.metrics?.following || 0,
        account.metrics?.tweets || 0,
        importSource,
        now,
        now
      ]);
      
      return { inserted: true, username: cleanUsername };
    }
  } catch (error) {
    console.error(`保存账号 ${cleanUsername} 失败:`, error);
    throw error;
  }
}

/**
 * 批量保存账号信息到数据库
 * @param {Array} accounts 账号信息对象数组
 * @param {string} importSource 导入来源（用户名）
 * @returns {Promise<Object>} 批量保存结果
 */
export async function bulkSaveAccounts(accounts, importSource = '') {
  const db = await getDatabase();
  let results = { inserted: 0, updated: 0, failed: 0 };
  const now = new Date().toISOString();
  
  // 记录导入历史
  const importResult = await db.run(`
    INSERT INTO import_history (
      source_username, accounts_count, import_date
    ) VALUES (?, ?, ?)
  `, [importSource, accounts.length, now]);
  
  const importId = importResult.lastID;
  
  // 开始事务
  await db.exec('BEGIN TRANSACTION');
  
  try {
    for (const account of accounts) {
      try {
        const result = await saveAccount(account, importSource);
        if (result.inserted) {
          results.inserted++;
        } else if (result.updated) {
          results.updated++;
        }
      } catch (error) {
        results.failed++;
        console.error(`批量保存中账号 ${account.username} 失败:`, error);
      }
    }
    
    // 更新导入历史
    await db.run(`
      UPDATE import_history SET 
        success_count = ?, 
        notes = ?
      WHERE id = ?
    `, [
      results.inserted + results.updated,
      `成功导入 ${results.inserted} 个新账号，更新 ${results.updated} 个账号，失败 ${results.failed} 个`,
      importId
    ]);
    
    // 提交事务
    await db.exec('COMMIT');
    
    return results;
  } catch (error) {
    // 回滚事务
    await db.exec('ROLLBACK');
    console.error('批量保存账号失败:', error);
    throw error;
  }
}

/**
 * 从数据库获取账号列表
 * @param {Object} options 过滤选项
 * @returns {Promise<Array>} 账号列表
 */
export async function getAccounts(options = {}) {
  const db = await getDatabase();
  const {
    limit = 100,
    offset = 0,
    category = null,
    isAnnotated = null,
    searchTerm = null,
    sortBy = 'import_date',
    sortOrder = 'DESC',
    imported_from = null
  } = options;
  
  // 构建查询条件
  let conditions = [];
  let params = [];
  
  if (category) {
    // 同时支持查找单个分类或多分类中包含的情况
    conditions.push('(category = ? OR categories LIKE ?)');
    params.push(category, `%${category}%`);
  }
  
  if (isAnnotated === true) {
    conditions.push('annotated_at IS NOT NULL');
  } else if (isAnnotated === false) {
    conditions.push('annotated_at IS NULL');
  }
  
  if (imported_from) {
    conditions.push('imported_from = ?');
    params.push(imported_from);
  }
  
  if (searchTerm) {
    conditions.push('(username LIKE ? OR name LIKE ? OR notes LIKE ?)');
    params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
  }
  
  // 构建查询语句
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `
    SELECT
      username,
      twitter_id AS id,
      name,
      description,
      avatar_url AS avatar,
      verified,
      category,
      categories,
      notes,
      followers_count,
      following_count,
      tweet_count,
      annotated_at,
      import_date,
      last_updated,
      CASE WHEN annotated_at IS NOT NULL THEN 1 ELSE 0 END AS isAnnotated
    FROM twitter_accounts
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `;
  
  params.push(limit, offset);
  
  try {
    const accounts = await db.all(query, params);
    
    // 转换为前端需要的格式
    return accounts.map(account => ({
      id: account.id,
      name: account.name,
      username: '@' + account.username,
      formatted_username: `@${account.username} https://x.com/${account.username}`,
      twitter_link: `https://x.com/${account.username}`,
      category: account.category || '',
      categories: account.categories ? JSON.parse(account.categories) : [],
      notes: account.notes || '',
      verified: Boolean(account.verified),
      annotatedAt: account.annotated_at,
      isAnnotated: Boolean(account.isAnnotated),
      metrics: {
        followers: account.followers_count,
        following: account.following_count,
        tweets: account.tweet_count
      }
    }));
  } catch (error) {
    console.error('获取账号列表失败:', error);
    throw error;
  }
}

/**
 * 保存账号标注信息
 * @param {string} username 用户名
 * @param {string} category 主分类
 * @param {string[]} categories 多标签分类数组
 * @param {string} notes 备注
 * @returns {Promise<Object>} 保存结果
 */
export async function saveAnnotation(username, category, notes, categories = []) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  
  // 移除用户名中的@符号
  username = username.replace(/^@/, '');
  
  // 格式化分类数组为JSON字符串
  const categoriesJson = JSON.stringify(categories);
  
  try {
    // 开始事务
    await db.exec('BEGIN TRANSACTION');
    
    // 更新账号标注
    await db.run(`
      UPDATE twitter_accounts SET
        category = ?,
        categories = ?,
        notes = ?,
        annotated_at = COALESCE(annotated_at, ?),
        last_updated = ?
      WHERE username = ?
    `, [category, categoriesJson, notes, now, now, username]);
    
    // 处理主分类
    if (category && category.trim() !== '') {
      await updateOrCreateCategory(db, category, now);
    }
    
    // 处理多标签分类
    if (categories && categories.length > 0) {
      for (const cat of categories) {
        if (cat && cat.trim() !== '') {
          await updateOrCreateCategory(db, cat, now);
        }
      }
    }
    
    // 提交事务
    await db.exec('COMMIT');
    
    return { success: true, username };
  } catch (error) {
    // 回滚事务
    await db.exec('ROLLBACK');
    console.error(`保存标注失败 (${username}):`, error);
    throw error;
  }
}

/**
 * 更新或创建分类
 * @param {Object} db 数据库连接
 * @param {string} category 分类名称
 * @param {string} now 当前时间
 */
async function updateOrCreateCategory(db, category, now) {
  // 先检查分类是否存在
  const existingCategory = await db.get(
    'SELECT * FROM categories WHERE name = ?', 
    category
  );
  
  if (existingCategory) {
    // 更新分类计数
    await db.run(`
      UPDATE categories SET
        count = (SELECT COUNT(*) FROM twitter_accounts WHERE category = ? OR categories LIKE ?),
        created_at = MIN(created_at, ?)
      WHERE name = ?
    `, [category, `%${category}%`, now, category]);
  } else {
    // 插入新分类
    await db.run(`
      INSERT INTO categories (name, count, created_at)
      VALUES (?, 1, ?)
    `, [category, now]);
  }
}

/**
 * 获取分类列表
 * @returns {Promise<Array>} 分类列表
 */
export async function getCategories() {
  const db = await getDatabase();
  
  try {
    return await db.all(`
      SELECT name, count
      FROM categories
      ORDER BY count DESC, name ASC
    `);
  } catch (error) {
    console.error('获取分类列表失败:', error);
    throw error;
  }
}

/**
 * 获取总账号数和标注数
 * @returns {Promise<Object>} 统计信息
 */
export async function getStats() {
  const db = await getDatabase();
  
  try {
    const totalAccounts = await db.get('SELECT COUNT(*) as count FROM twitter_accounts');
    const annotatedAccounts = await db.get('SELECT COUNT(*) as count FROM twitter_accounts WHERE annotated_at IS NOT NULL');
    const totalCategories = await db.get('SELECT COUNT(*) as count FROM categories');
    
    return {
      totalAccounts: totalAccounts.count,
      annotatedAccounts: annotatedAccounts.count,
      totalCategories: totalCategories.count
    };
  } catch (error) {
    console.error('获取统计信息失败:', error);
    throw error;
  }
} 