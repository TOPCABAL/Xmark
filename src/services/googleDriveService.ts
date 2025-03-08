import { AccountProps } from './twitterService';
import { exportToJson } from './exportService';

// Google Drive API配置
const API_KEY = 'YOUR_API_KEY'; // 需要替换为实际的API密钥
const CLIENT_ID = 'YOUR_CLIENT_ID'; // 需要替换为实际的客户端ID
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// 文件名常量
const ANNOTATION_FILE_NAME = 'twitter_annotations.json';

/**
 * 初始化Google Drive API
 * @returns Promise<boolean> 初始化是否成功
 */
export async function initGoogleDriveApi(): Promise<boolean> {
  // 如果在浏览器环境中没有gapi，则放弃
  if (typeof window === 'undefined' || !window.gapi) {
    console.error('Google API客户端未加载');
    return false;
  }

  return new Promise((resolve) => {
    // 加载gapi client
    window.gapi.load('client:auth2', async () => {
      try {
        await window.gapi.client.init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          discoveryDocs: DISCOVERY_DOCS,
          scope: SCOPES
        });
        
        // 检查是否已登录
        const isSignedIn = window.gapi.auth2.getAuthInstance().isSignedIn.get();
        console.log('Google Drive API初始化成功，登录状态:', isSignedIn);
        resolve(true);
      } catch (error) {
        console.error('Google Drive API初始化失败:', error);
        resolve(false);
      }
    });
  });
}

/**
 * 检查Google账号登录状态
 * @returns boolean 是否已登录
 */
export function isGoogleSignedIn(): boolean {
  if (typeof window === 'undefined' || !window.gapi || !window.gapi.auth2) {
    return false;
  }
  
  try {
    return window.gapi.auth2.getAuthInstance().isSignedIn.get();
  } catch (error) {
    console.error('检查Google登录状态失败:', error);
    return false;
  }
}

/**
 * 登录Google账号
 * @returns Promise<boolean> 登录是否成功
 */
export async function signInToGoogle(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.gapi || !window.gapi.auth2) {
    console.error('Google API客户端未初始化');
    return false;
  }
  
  try {
    await window.gapi.auth2.getAuthInstance().signIn();
    return true;
  } catch (error) {
    console.error('Google登录失败:', error);
    return false;
  }
}

/**
 * 登出Google账号
 * @returns Promise<boolean> 登出是否成功
 */
export async function signOutFromGoogle(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.gapi || !window.gapi.auth2) {
    console.error('Google API客户端未初始化');
    return false;
  }
  
  try {
    await window.gapi.auth2.getAuthInstance().signOut();
    return true;
  } catch (error) {
    console.error('Google登出失败:', error);
    return false;
  }
}

/**
 * 将标注数据上传到Google Drive
 * @param accounts 要上传的账号数据
 * @returns Promise<string|null> 文件ID或null（上传失败）
 */
export async function uploadToGoogleDrive(accounts: AccountProps[]): Promise<string|null> {
  if (!isGoogleSignedIn()) {
    console.error('未登录Google账号');
    return null;
  }
  
  try {
    // 转换数据为JSON字符串
    const jsonData = exportToJson(accounts);
    
    // 检查文件是否已存在
    const existingFileId = await findAnnotationFile();
    
    if (existingFileId) {
      // 更新现有文件
      await window.gapi.client.drive.files.update({
        fileId: existingFileId,
        media: {
          mimeType: 'application/json',
          body: jsonData
        }
      });
      return existingFileId;
    } else {
      // 创建新文件
      const metadata = {
        name: ANNOTATION_FILE_NAME,
        mimeType: 'application/json'
      };
      
      const accessToken = window.gapi.auth.getToken().access_token;
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([jsonData], { type: 'application/json' }));
      
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        body: form
      });
      
      const data = await response.json();
      return data.id || null;
    }
  } catch (error) {
    console.error('上传到Google Drive失败:', error);
    return null;
  }
}

/**
 * 从Google Drive下载标注数据
 * @returns Promise<AccountProps[]|null> 下载的账号数据或null（下载失败）
 */
export async function downloadFromGoogleDrive(): Promise<AccountProps[]|null> {
  if (!isGoogleSignedIn()) {
    console.error('未登录Google账号');
    return null;
  }
  
  try {
    // 查找标注文件
    const fileId = await findAnnotationFile();
    
    if (!fileId) {
      console.error('未找到标注文件');
      return null;
    }
    
    // 下载文件内容
    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media'
    });
    
    // 解析JSON数据
    const data = JSON.parse(response.body);
    
    if (!Array.isArray(data)) {
      console.error('下载的数据不是有效的账号数组');
      return null;
    }
    
    return data as AccountProps[];
  } catch (error) {
    console.error('从Google Drive下载失败:', error);
    return null;
  }
}

/**
 * 查找标注文件
 * @returns Promise<string|null> 文件ID或null（未找到）
 */
async function findAnnotationFile(): Promise<string|null> {
  try {
    const response = await window.gapi.client.drive.files.list({
      q: `name='${ANNOTATION_FILE_NAME}'`,
      spaces: 'drive',
      fields: 'files(id, name)'
    });
    
    const files = response.result.files;
    
    if (files && files.length > 0) {
      return files[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('查找标注文件失败:', error);
    return null;
  }
}

/**
 * 声明全局window对象的gapi属性
 */
declare global {
  interface Window {
    gapi: any;
  }
} 