import { AccountProps } from './twitterService';

// 基础API URL - 修改为相对路径或自动检测服务器地址
const API_BASE_URL = ''; // 使用相对路径，这样会自动使用当前域名

// 账号过滤选项接口
export interface AccountFilterOptions {
  limit?: number;
  offset?: number;
  category?: string;
  categories?: string[];
  isAnnotated?: boolean;
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// 分类统计接口
export interface CategoryCount {
  name: string;
  count: number;
}

// 数据库统计信息
export interface DatabaseStats {
  totalAccounts: number;
  annotatedAccounts: number;
  totalCategories: number;
}

/**
 * 从数据库获取账号列表
 */
export async function fetchAccountsFromDB(options: AccountFilterOptions = {}): Promise<AccountProps[]> {
  try {
    // 构建查询参数
    const params = new URLSearchParams();
    
    if (options.limit !== undefined) params.append('limit', options.limit.toString());
    if (options.offset !== undefined) params.append('offset', options.offset.toString());
    if (options.category) params.append('category', options.category);
    if (options.isAnnotated !== undefined) params.append('isAnnotated', options.isAnnotated.toString());
    if (options.searchTerm) params.append('search', options.searchTerm);
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);
    
    // 发送请求
    const response = await fetch(`${API_BASE_URL}/api/accounts?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`获取账号列表失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && Array.isArray(data.accounts)) {
      console.log(`成功从数据库获取 ${data.accounts.length} 个账号`);
      return data.accounts;
    }
    
    throw new Error(data.message || '获取账号列表失败，返回数据格式不正确');
  } catch (error) {
    console.error('从数据库获取账号列表失败:', error);
    throw error;
  }
}

/**
 * 从数据库获取分类列表
 */
export async function fetchCategoriesFromDB(): Promise<CategoryCount[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories`);
    
    if (!response.ok) {
      throw new Error(`获取分类列表失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && Array.isArray(data.categories)) {
      console.log(`成功从数据库获取 ${data.categories.length} 个分类`);
      return data.categories;
    }
    
    throw new Error(data.message || '获取分类列表失败，返回数据格式不正确');
  } catch (error) {
    console.error('从数据库获取分类列表失败:', error);
    throw error;
  }
}

/**
 * 保存账号标注
 */
export async function saveAnnotationToDB(
  username: string, 
  categories: string[], 
  notes: string
): Promise<{ success: boolean, username: string, categories: string[] }> {
  try {
    if (!username) {
      throw new Error('用户名不能为空');
    }
    
    console.log(`[API] 开始保存标注: ${username}`);
    console.log(`[API] 要保存的分类: ${JSON.stringify(categories)}`);
    console.log(`[API] 备注内容: ${notes}`);
    
    // 构建请求体，确保categories是数组
    const requestBody = {
      username,
      categories: Array.isArray(categories) ? categories : [],
      notes
    };
    
    console.log(`[API] 发送请求体: ${JSON.stringify(requestBody)}`);
    
    const response = await fetch(`${API_BASE_URL}/api/annotation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`[API] 响应状态: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] 响应错误: ${errorText}`);
      throw new Error(`保存标注失败: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const responseText = await response.text();
    console.log(`[API] 原始响应文本: ${responseText}`);
    
    // 尝试解析JSON响应
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[API] 解析后的响应数据: ${JSON.stringify(data)}`);
    } catch (parseError) {
      console.error(`[API] 响应数据解析失败:`, parseError);
      throw new Error(`响应数据解析失败: ${responseText}`);
    }
    
    if (data.success) {
      console.log(`[API] 成功保存账号 ${username} 的标注信息`);
      console.log(`[API] 返回的分类: ${JSON.stringify(data.categories)}`);
      
      // 确保返回数据格式正确
      return {
        success: true,
        username: data.username || username,
        categories: Array.isArray(data.categories) ? data.categories : categories
      };
    }
    
    throw new Error(data.message || '保存标注失败');
  } catch (error) {
    console.error('[API] 保存标注到数据库失败:', error);
    throw error;
  }
}

/**
 * 导出数据
 */
export async function exportDataFromDB(format: 'json' | 'csv', options: { category?: string, isAnnotated?: boolean } = {}): Promise<{ success: boolean, downloadUrl: string, count: number, filename: string }> {
  try {
    // 构建查询参数
    const params = new URLSearchParams();
    params.append('format', format);
    
    if (options.category) params.append('category', options.category);
    if (options.isAnnotated !== undefined) params.append('isAnnotated', options.isAnnotated.toString());
    
    const response = await fetch(`${API_BASE_URL}/api/export?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`导出数据失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`成功导出 ${data.count} 个账号到 ${data.filename}`);
      return data;
    }
    
    throw new Error(data.message || '导出数据失败');
  } catch (error) {
    console.error('从数据库导出数据失败:', error);
    throw error;
  }
}

/**
 * 获取数据库统计信息
 */
export async function fetchDBStats(): Promise<DatabaseStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats`);
    
    if (!response.ok) {
      throw new Error(`获取统计信息失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      return {
        totalAccounts: data.totalAccounts || 0,
        annotatedAccounts: data.annotatedAccounts || 0,
        totalCategories: data.totalCategories || 0
      };
    }
    
    throw new Error(data.message || '获取统计信息失败');
  } catch (error) {
    console.error('获取数据库统计信息失败:', error);
    throw error;
  }
}

/**
 * 添加新分类
 * @param name 分类名称
 * @returns 添加结果
 */
export async function addCategoryToDB(name: string): Promise<boolean> {
  try {
    if (!name.trim()) {
      throw new Error('分类名称不能为空');
    }
    
    console.log(`[API] 正在添加分类: ${name}`);
    console.log(`[API] 请求URL: ${API_BASE_URL}/api/categories/add`);
    
    const response = await fetch(`${API_BASE_URL}/api/categories/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name
      })
    });
    
    console.log(`[API] 响应状态: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] 错误响应内容: ${errorText}`);
      throw new Error(`添加分类失败: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`[API] 响应数据: ${JSON.stringify(data)}`);
    
    if (data.success) {
      console.log(`[API] 成功添加分类 ${name}`);
      return true;
    }
    
    throw new Error(data.message || '添加分类失败');
  } catch (error) {
    console.error(`[API] 添加分类到数据库失败:`, error);
    throw error;
  }
} 