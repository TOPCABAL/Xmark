import { AccountProps } from './twitterService';

/**
 * 生成Twitter用户链接
 * @param username Twitter用户名（带或不带@）
 * @returns 完整的Twitter链接
 */
function generateTwitterLink(username: string): string {
  // 移除@前缀（如果存在）
  const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
  return `https://x.com/${cleanUsername}`;
}

/**
 * 将标注数据导出为JSON格式
 * @param accounts 要导出的账号数据
 * @returns JSON字符串
 */
export function exportToJson(accounts: AccountProps[]): string {
  // 过滤只导出必要的字段，并添加Twitter链接
  const exportData = accounts.map(account => {
    const cleanUsername = account.username.replace(/^@/, '');
    const twitterLink = generateTwitterLink(cleanUsername);
    return {
      id: account.id,
      name: account.name,
      username: account.username,
      formatted_username: `@${cleanUsername} ${twitterLink}`, // 新增格式化的用户名+链接字段
      twitter_link: twitterLink, // 保留原始链接字段
      category: account.category || "",
      notes: account.notes || "",
      verified: account.verified || false,
      annotatedAt: account.annotatedAt || null,
      isAnnotated: account.isAnnotated || false
    };
  });
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * 将标注数据导出为CSV格式
 * @param accounts 要导出的账号数据
 * @returns CSV字符串
 */
export function exportToCsv(accounts: AccountProps[]): string {
  // CSV头部 - 添加格式化用户名和Twitter链接字段
  const headers = ['ID', '用户名', '格式化用户名', '昵称', 'Twitter链接', '分类', '备注', '是否已认证', '标注时间'];
  
  // CSV内容行 - 为每个用户添加链接
  const rows = accounts.map(account => {
    const cleanUsername = account.username.replace(/^@/, '');
    const twitterLink = generateTwitterLink(cleanUsername);
    const formattedUsername = `@${cleanUsername} ${twitterLink}`; // 格式化为"@username https://x.com/username"
    
    return [
      account.id,
      account.username,
      formattedUsername,
      account.name,
      twitterLink,
      account.category || "",
      account.notes || "",
      account.verified ? "是" : "否",
      account.annotatedAt ? new Date(account.annotatedAt).toLocaleString() : ""
    ];
  });
  
  // 转义CSV字段
  const escapeCsvField = (field: string | number | boolean) => {
    const stringField = String(field);
    // 如果字段包含逗号、双引号或换行符，则用双引号包裹并将内部双引号转义
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };
  
  // 构建CSV字符串
  const csvContent = [
    headers.map(escapeCsvField).join(','),
    ...rows.map(row => row.map(escapeCsvField).join(','))
  ].join('\n');
  
  return csvContent;
}

/**
 * 下载字符串内容为文件
 * @param content 要下载的内容
 * @param fileName 文件名
 * @param contentType 内容类型
 */
export function downloadFile(content: string, fileName: string, contentType: string): void {
  // 创建Blob对象
  const blob = new Blob([content], { type: contentType });
  
  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  
  // 触发下载
  document.body.appendChild(a);
  a.click();
  
  // 清理
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * 导出并下载标注数据
 * @param accounts 要导出的账号数据
 * @param format 导出格式 ('json' | 'csv')
 * @param fileName 文件名（可选）
 */
export function exportAndDownload(
  accounts: AccountProps[],
  format: 'json' | 'csv',
  fileName?: string
): void {
  let content: string;
  let contentType: string;
  let defaultFileName: string;
  
  // 根据格式导出数据
  if (format === 'json') {
    content = exportToJson(accounts);
    contentType = 'application/json';
    defaultFileName = 'twitter_annotations.json';
  } else {
    content = exportToCsv(accounts);
    contentType = 'text/csv';
    defaultFileName = 'twitter_annotations.csv';
  }
  
  // 使用提供的文件名或默认文件名
  const finalFileName = fileName || defaultFileName;
  
  // 下载文件
  downloadFile(content, finalFileName, contentType);
} 