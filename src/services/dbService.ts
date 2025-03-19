import { AccountProps } from './twitterService';

// 基础API URL
const API_BASE_URL = 'http://localhost:3001';

// 账号过滤选项接口
export interface AccountFilterOptions {
  limit?: number;
  offset?: number;
  category?: string;
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
export async function saveAnnotationToDB(username: string, category: string, notes: string, categories: string[] = []): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/annotation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        category,
        notes,
        categories
      })
    });
    
    if (!response.ok) {
      throw new Error(`保存标注失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`成功保存账号 ${username} 的标注信息`);
      return true;
    }
    
    throw new Error(data.message || '保存标注失败');
  } catch (error) {
    console.error('保存标注到数据库失败:', error);
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