import { AccountProps } from './twitterService';

// 本地存储键名
const STORAGE_KEY = 'xmark_annotated_accounts';

// 本地存储的账号数据，添加了额外的标注信息
export interface AnnotatedAccount extends AccountProps {
  annotatedAt: number; // 标注时间戳
  notes?: string;      // 备注信息
  isAnnotated: true;   // 标记为已标注
}

// 获取所有已标注的账号
export function getAnnotatedAccounts(): AnnotatedAccount[] {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) {
      return [];
    }
    return JSON.parse(storedData);
  } catch (error) {
    console.error('读取本地账号数据失败:', error);
    return [];
  }
}

// 保存已标注的账号列表
export function saveAnnotatedAccounts(accounts: AnnotatedAccount[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    return true;
  } catch (error) {
    console.error('保存账号数据失败:', error);
    return false;
  }
}

// 根据账号ID查找已标注的账号
export function findAnnotatedAccountById(id: string): AnnotatedAccount | undefined {
  const accounts = getAnnotatedAccounts();
  return accounts.find(account => account.id === id);
}

// 根据用户名查找已标注的账号
export function findAnnotatedAccountByUsername(username: string): AnnotatedAccount | undefined {
  const accounts = getAnnotatedAccounts();
  // 移除@符号进行比较
  const normalizedUsername = username.replace('@', '');
  return accounts.find(account => account.username.replace('@', '') === normalizedUsername);
}

// 添加或更新已标注的账号
export function saveAnnotatedAccount(account: AccountProps, notes?: string): AnnotatedAccount {
  const accounts = getAnnotatedAccounts();
  
  // 查找是否已存在该账号
  const existingIndex = accounts.findIndex(a => a.id === account.id);
  
  // 创建标注账号对象
  const annotatedAccount: AnnotatedAccount = {
    ...account,
    annotatedAt: Date.now(),
    notes: notes || '',
    isAnnotated: true
  };
  
  // 更新或添加账号
  if (existingIndex >= 0) {
    accounts[existingIndex] = {
      ...annotatedAccount,
      // 保留原有备注，如果没有提供新备注
      notes: notes || accounts[existingIndex].notes || ''
    };
  } else {
    accounts.push(annotatedAccount);
  }
  
  // 保存到本地存储
  saveAnnotatedAccounts(accounts);
  
  return annotatedAccount;
}

// 删除已标注的账号
export function removeAnnotatedAccount(id: string): boolean {
  let accounts = getAnnotatedAccounts();
  const initialLength = accounts.length;
  
  accounts = accounts.filter(account => account.id !== id);
  
  if (accounts.length !== initialLength) {
    return saveAnnotatedAccounts(accounts);
  }
  
  return false;
}

// 批量标注账号
export function annotateAccounts(accounts: AccountProps[], category?: string): AnnotatedAccount[] {
  const existingAccounts = getAnnotatedAccounts();
  const result: AnnotatedAccount[] = [];
  
  accounts.forEach(account => {
    // 查找是否已存在
    const existingIndex = existingAccounts.findIndex(a => a.id === account.id);
    
    // 创建标注账号对象
    const annotatedAccount: AnnotatedAccount = {
      ...account,
      category: category || account.category,
      annotatedAt: Date.now(),
      notes: '',
      isAnnotated: true
    };
    
    // 更新或添加
    if (existingIndex >= 0) {
      // 保留原有信息
      existingAccounts[existingIndex] = {
        ...annotatedAccount,
        notes: existingAccounts[existingIndex].notes || '',
        // 如果没有提供新分类，保留原分类
        category: category || existingAccounts[existingIndex].category
      };
      result.push(existingAccounts[existingIndex]);
    } else {
      existingAccounts.push(annotatedAccount);
      result.push(annotatedAccount);
    }
  });
  
  // 保存到本地存储
  saveAnnotatedAccounts(existingAccounts);
  
  return result;
}

// 获取分组统计
export function getCategoryStats(): Record<string, number> {
  const accounts = getAnnotatedAccounts();
  const stats: Record<string, number> = {
    total: accounts.length,
    uncategorized: 0
  };
  
  accounts.forEach(account => {
    if (!account.category) {
      stats.uncategorized += 1;
    } else {
      if (!stats[account.category]) {
        stats[account.category] = 0;
      }
      stats[account.category] += 1;
    }
  });
  
  return stats;
}

// 清空所有本地数据
export function clearAllAnnotatedAccounts(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('清空账号数据失败:', error);
    return false;
  }
} 