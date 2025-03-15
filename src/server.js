import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs';
import cors from 'cors';

// 导入数据库服务
import { getDatabase, initDatabase } from '../sql/database.js';
import { saveAccount, bulkSaveAccounts, getAccounts, saveAnnotation, getCategories, getStats } from '../sql/accountService.js';
import { exportToCsv, exportToJson } from '../sql/exportService.js';

// 调试信息
console.log('--------------------------------');
console.log('Twitter API服务器启动中...');
console.log('Node.js版本:', process.version);
console.log('当前工作目录:', process.cwd());
console.log('--------------------------------');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('__filename:', __filename);
console.log('__dirname:', __dirname);
console.log('--------------------------------');

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3001;

// 启用CORS - 允许所有来源访问
app.use(cors({
  origin: '*', // 允许所有来源访问
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Cache-Control', 'X-CSRF-Token'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: true,
  maxAge: 86400 // 预检请求结果缓存1天
}));

// 中间件
app.use(express.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, '..'))); // 提供根目录下的静态文件
app.use('/exports', express.static(path.join(__dirname, '..', 'exports'))); // 提供导出文件

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`已创建数据目录: ${dataDir}`);
}

// 在服务器启动时初始化数据库
initDatabase().then(() => {
  console.log('数据库初始化成功');
}).catch(err => {
  console.error('数据库初始化失败:', err);
});

// 迁移现有的JSON文件到新的目录结构
async function migrateExistingFiles() {
  try {
    console.log('检查并迁移现有文件到新的目录结构...');
    
    const files = await fsPromises.readdir(dataDir);
    
    // 查找所有以_data.json和_tweets.json结尾的文件
    for (const file of files) {
      if (file.endsWith('_data.json') || file.endsWith('_tweets.json')) {
        // 提取用户名
        const username = file.split('_')[0];
        const isDataFile = file.endsWith('_data.json');
        const isTweetsFile = file.endsWith('_tweets.json');
        
        // 为用户创建目录
        const userDir = path.join(dataDir, username);
        if (!fs.existsSync(userDir)) {
          await fsPromises.mkdir(userDir, { recursive: true });
          console.log(`为用户 ${username} 创建目录`);
        }
        
        // 目标文件名
        const targetFileName = isDataFile ? 'profile.json' : (isTweetsFile ? 'tweets.json' : file);
        const sourcePath = path.join(dataDir, file);
        const targetPath = path.join(userDir, targetFileName);
        
        // 检查目标文件是否已存在
        if (!fs.existsSync(targetPath)) {
          // 复制文件到新位置
          const content = await fsPromises.readFile(sourcePath, 'utf-8');
          await fsPromises.writeFile(targetPath, content, 'utf-8');
          console.log(`已将 ${file} 迁移到 ${targetPath}`);
        }
      }
    }
    
    console.log('文件迁移完成');
  } catch (error) {
    console.error('迁移文件时出错:', error);
  }
}

// 启动时迁移文件
migrateExistingFiles();

// 获取用户列表
app.get('/api/users', (req, res) => {
  try {
    const dataDir = path.join(__dirname, 'data');
    
    // 确保data目录存在
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      return res.json([]);
    }
    
    // 读取data目录下的所有用户文件夹
    const userDirs = fs.readdirSync(dataDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    // 收集每个用户的信息
    const users = [];
    for (const username of userDirs) {
      const profilePath = path.join(dataDir, username, 'profile.json');
      
      if (fs.existsSync(profilePath)) {
        try {
          const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
          const userData = profileData.data?.user?.result;
          
          if (userData) {
            const legacy = userData.legacy || {};
            users.push({
              username,
              name: legacy.name || username,
              profileImageUrl: legacy.profile_image_url_https || '',
              followersCount: legacy.followers_count || 0,
              friendsCount: legacy.friends_count || 0,
              description: legacy.description || ''
            });
          }
        } catch (error) {
          console.error(`Error parsing profile data for ${username}:`, error);
        }
      }
    }
    
    res.json(users);
  } catch (error) {
    console.error('Error getting user list:', error);
    res.status(500).json({ message: '获取用户列表失败' });
  }
});

// 添加新用户
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ message: '用户名不能为空' });
    }
    
    // 执行saveTwitterData.js脚本获取用户数据
    const scriptPath = path.join(__dirname, '..', 'scripts', 'saveTwitterData.js');
    
    console.log(`Executing: node ${scriptPath} ${username}`);
    const { stdout, stderr } = await execAsync(`node ${scriptPath} ${username}`);
    
    if (stderr) {
      console.error(`Error executing script: ${stderr}`);
    }
    
    console.log(`Script output: ${stdout}`);
    
    // 检查用户数据是否成功获取
    const userDir = path.join(__dirname, 'data', username);
    const profilePath = path.join(userDir, 'profile.json');
    
    if (!fs.existsSync(profilePath)) {
      return res.status(500).json({ message: '获取用户数据失败' });
    }
    
    // 读取用户数据
    const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    const userData = profileData.data?.user?.result;
    
    if (!userData) {
      return res.status(500).json({ message: '用户数据格式错误' });
    }
    
    const legacy = userData.legacy || {};
    const user = {
      username,
      name: legacy.name || username,
      profileImageUrl: legacy.profile_image_url_https || '',
      followersCount: legacy.followers_count || 0,
      friendsCount: legacy.friends_count || 0,
      description: legacy.description || ''
    };
    
    res.json(user);
  } catch (error) {
    console.error('Error adding new user:', error);
    res.status(500).json({ message: `获取用户数据失败: ${error.message}` });
  }
});

/**
 * 尝试调用脚本获取Twitter用户数据
 * @param {string} username - 用户名
 * @returns {Promise<boolean>} 是否成功获取数据
 */
async function fetchTwitterDataUsingScript(username) {
  try {
    console.log(`正在调用脚本获取用户 ${username} 数据...`);
    
    // 使用相对于项目根目录的路径
    const scriptPath = path.join(process.cwd(), 'scripts', 'saveTwitterData.js');
    console.log(`脚本路径: ${scriptPath}`);
    
    // 检查脚本是否存在
    if (!fs.existsSync(scriptPath)) {
      console.error(`脚本文件不存在: ${scriptPath}`);
      return false;
    }
    
    // 执行脚本，传入用户名作为参数
    const { stdout, stderr } = await execAsync(`node ${scriptPath} ${username}`);
    
    if (stderr && !stderr.includes('ExperimentalWarning')) {
      console.error(`脚本执行出错: ${stderr}`);
      return false;
    }
    
    console.log(`脚本执行输出: ${stdout}`);
    console.log(`已完成用户 ${username} 数据获取`);
    
    // 脚本保存路径应该是 src/data/username/profile.json 和 src/data/username/tweets.json
    const userDir = path.join(__dirname, 'data', username);
    const profilePath = path.join(userDir, 'profile.json');
    const tweetsPath = path.join(userDir, 'tweets.json');
    
    // 检查文件是否生成
    if (!fs.existsSync(profilePath)) {
      console.log(`警告：脚本执行完毕，但未找到 profile.json 文件: ${profilePath}`);
      
      // 等待一会，有时文件写入有延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!fs.existsSync(profilePath)) {
        console.error(`超时后仍未找到 profile.json 文件`);
        return false;
      }
    }
    
    console.log(`成功获取用户 ${username} 数据：`);
    console.log(`- 用户资料: ${profilePath}`);
    console.log(`- 推文数据: ${fs.existsSync(tweetsPath) ? tweetsPath : '未找到'}`);
    
    return true;
  } catch (error) {
    console.error(`调用脚本获取数据失败: ${error.message}`);
    return false;
  }
}

/**
 * 为特定用户生成Twitter个人资料HTML
 */
async function generateProfileHtml(username) {
  try {
    // 移除用户名中的@符号
    const cleanUsername = username.replace('@', '');
    console.log(`开始为用户 ${cleanUsername} 生成资料页面`);
    
    // 为用户创建单独的文件夹
    const userDir = path.join(__dirname, 'data', cleanUsername);
    console.log(`用户目录: ${userDir}`);
    
    // 确保用户目录存在
    if (!fs.existsSync(userDir)) {
      console.log(`用户目录不存在，创建目录: ${userDir}`);
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    // 文件路径在用户目录下
    const userDataPath = path.join(userDir, 'profile.json');
    const tweetsDataPath = path.join(userDir, 'tweets.json');
    
    console.log(`尝试读取: ${userDataPath}`);
    console.log(`尝试读取: ${tweetsDataPath}`);
    
    // 检查文件是否存在
    let userData, tweetsData;
    
    // 此时用户资料文件应该已存在（由API端点确保）
    if (!fs.existsSync(userDataPath)) {
      console.error(`用户数据文件不存在: ${userDataPath}`);
      return null;
    }
    
    try {
      const dataContent = await fsPromises.readFile(userDataPath, 'utf-8');
      userData = JSON.parse(dataContent);
      console.log(`成功读取用户数据`);
    } catch (err) {
      console.error(`读取用户数据失败: ${err.message}`);
      return null;
    }
    
    try {
      if (fs.existsSync(tweetsDataPath)) {
        const tweetsContent = await fsPromises.readFile(tweetsDataPath, 'utf-8');
        tweetsData = JSON.parse(tweetsContent);
        console.log(`成功读取推文数据`);
      } else {
        console.log(`推文数据文件不存在，使用空数据`);
        tweetsData = { data: { user: { result: { timeline_v2: { timeline: { instructions: [] } } } } } };
      }
    } catch (err) {
      console.error(`读取推文数据失败: ${err.message}`);
      tweetsData = { data: { user: { result: { timeline_v2: { timeline: { instructions: [] } } } } } };
    }
    
    // 生成HTML
    const html = generateHTML(userData, tweetsData);
    
    // 保存HTML到用户文件夹
    const profilePath = path.join(userDir, 'profile.html');
    await fsPromises.writeFile(profilePath, html, 'utf-8');
    console.log(`已保存HTML到: ${profilePath}`);
    
    return html;
  } catch (error) {
    console.error(`生成用户资料失败: ${error.message}`);
    return null;
  }
}

/**
 * 生成Twitter用户资料页面的HTML
 */
function generateHTML(userData, tweetsData) {
  // 提取用户信息
  const user = userData.data.user.result;
  const legacy = user.legacy || {};
  const profileImageUrl = legacy.profile_image_url_https || '';
  const bannerUrl = legacy.profile_banner_url || '';
  const name = legacy.name || '未知用户';
  const screenName = legacy.screen_name || '';
  const description = legacy.description || '无简介';
  const location = legacy.location || '';
  const url = legacy.entities?.url?.urls?.[0]?.expanded_url || '';
  const followersCount = legacy.followers_count || 0;
  const friendsCount = legacy.friends_count || 0;
  const tweetsCount = legacy.statuses_count || 0;
  const likesCount = legacy.favourites_count || 0;
  const createdAt = legacy.created_at ? new Date(legacy.created_at).toLocaleDateString('zh-CN', {year: 'numeric', month: 'long'}) : '';
  
  // 增强版认证状态检测
  // 检查多种可能的认证状态位置
  const isVerifiedLegacy = legacy.verified === true;
  const isBlueVerified = user.is_blue_verified === true;
  const hasVerifiedBadge = isVerifiedLegacy || isBlueVerified;
  
  // 验证标志HTML - 直接使用简单的HTML结构
  let verifiedBadgeHtml = '';
  if (hasVerifiedBadge) {
    verifiedBadgeHtml = `
      <span class="verified-badge" title="已验证账号">✓</span>
    `;
  }
  
  // 提取用户链接信息
  let userLinks = [];
  if (location) {
    userLinks.push({
      icon: 'map-marker-alt',
      text: location
    });
  }
  
  if (url) {
    userLinks.push({
      icon: 'link',
      text: url,
      isLink: true,
      href: url
    });
  }
  
  if (createdAt) {
    userLinks.push({
      icon: 'calendar-alt',
      text: `${createdAt}加入`
    });
  }
  
  // 生成用户链接HTML
  let userLinksHtml = '';
  if (userLinks.length > 0) {
    userLinksHtml = userLinks.map(link => {
      const linkHtml = link.isLink 
        ? `<a href="${link.href}" target="_blank" rel="noopener noreferrer">${link.text}</a>`
        : link.text;
      
      return `<div class="profile-meta-item"><i class="fas fa-${link.icon}"></i>${linkHtml}</div>`;
    }).join('');
  }
  
  // 提取推文
  let tweetsHTML = '';
  
  // 检查推文数据结构
  if (tweetsData.data?.user?.result?.timeline_v2?.timeline?.instructions) {
    const instructions = tweetsData.data.user.result.timeline_v2.timeline.instructions;
    
    // 处理置顶推文和普通推文
    const entries = [];
    
    // 处理置顶推文
    const pinnedEntry = instructions.find(i => i.type === 'TimelinePinEntry')?.entry;
    if (pinnedEntry) {
      const pinnedTweet = pinnedEntry.content?.itemContent?.tweet_results?.result;
      if (pinnedTweet) {
        entries.push({
          isPinned: true,
          tweet: pinnedTweet
        });
      }
    }
    
    // 处理普通推文列表
    const timelineAddEntries = instructions.find(i => i.type === 'TimelineAddEntries');
    if (timelineAddEntries && timelineAddEntries.entries) {
      timelineAddEntries.entries.forEach(entry => {
        if (entry.content?.itemContent?.tweet_results?.result) {
          entries.push({
            isPinned: false,
            tweet: entry.content.itemContent.tweet_results.result
          });
        }
      });
    }
    
    // 生成推文HTML
    let tweetCount = 0;
    entries.forEach(entry => {
      const tweet = entry.tweet;
      const tweetLegacy = tweet.legacy || {};
      
      // 推文内容
      const tweetText = tweetLegacy.full_text || '';
      const createdAt = new Date(tweetLegacy.created_at).toLocaleString('zh-CN');
      const retweetCount = tweetLegacy.retweet_count || 0;
      const favoriteCount = tweetLegacy.favorite_count || 0;
      const replyCount = tweetLegacy.reply_count || 0;
      const quoteCount = tweetLegacy.quote_count || 0;
      
      // 查找媒体内容
      let mediaHtml = '';
      if (tweetLegacy.entities?.media?.length > 0) {
        const mediaItems = tweetLegacy.entities.media;
        mediaHtml = '<div class="tweet-media">';
        
        mediaItems.forEach(media => {
          if (media.type === 'photo') {
            mediaHtml += `<img src="${media.media_url_https}" alt="推文图片" loading="lazy">`;
          } else if (media.type === 'video') {
            mediaHtml += `<video controls><source src="${media.video_info?.variants[0]?.url}" type="video/mp4"></video>`;
          }
        });
        
        mediaHtml += '</div>';
      }
      
      // 处理推文中的链接和提及
      let processedText = tweetText;
      
      // 处理URL
      if (tweetLegacy.entities?.urls) {
        tweetLegacy.entities.urls.forEach(urlEntity => {
          processedText = processedText.replace(
            urlEntity.url,
            `<a href="${urlEntity.expanded_url}" target="_blank" rel="noopener noreferrer">${urlEntity.display_url}</a>`
          );
        });
      }
      
      // 处理提及
      if (tweetLegacy.entities?.user_mentions) {
        tweetLegacy.entities.user_mentions.forEach(mention => {
          processedText = processedText.replace(
            new RegExp(`@${mention.screen_name}`, 'gi'),
            `<a href="https://twitter.com/${mention.screen_name}" target="_blank" rel="noopener noreferrer">@${mention.screen_name}</a>`
          );
        });
      }
      
      // 处理主题标签
      if (tweetLegacy.entities?.hashtags) {
        tweetLegacy.entities.hashtags.forEach(hashtag => {
          processedText = processedText.replace(
            new RegExp(`#${hashtag.text}`, 'gi'),
            `<a href="https://twitter.com/hashtag/${hashtag.text}" target="_blank" rel="noopener noreferrer">#${hashtag.text}</a>`
          );
        });
      }
      
      // 将换行符转换为<br>
      processedText = processedText.replace(/\n/g, '<br>');
      
      tweetCount++;
      tweetsHTML += `
        <div class="tweet ${entry.isPinned ? 'pinned-tweet' : ''}">
          ${entry.isPinned ? '<div class="pinned-label"><i class="fas fa-thumbtack"></i> 置顶推文</div>' : ''}
          <div class="tweet-header">
            <img src="${profileImageUrl}" class="tweet-avatar" alt="${name}" />
            <div class="tweet-user-info">
              <span class="tweet-name">${name}</span>
              <span class="tweet-username">@${screenName}</span>
              <span class="tweet-date">${createdAt}</span>
            </div>
          </div>
          <div class="tweet-content">${processedText}</div>
          ${mediaHtml}
          <div class="tweet-stats">
            <span class="tweet-stat"><i class="far fa-comment"></i> ${replyCount}</span>
            <span class="tweet-stat"><i class="fas fa-retweet"></i> ${retweetCount}</span>
            <span class="tweet-stat"><i class="far fa-heart"></i> ${favoriteCount}</span>
            <span class="tweet-stat"><i class="far fa-bookmark"></i> ${quoteCount}</span>
          </div>
        </div>
      `;
    });
    
    // 如果有推文，添加标题
    if (tweetCount > 0) {
      tweetsHTML = `<h2 class="tweets-title">推文 (${tweetCount})</h2>` + tweetsHTML;
    } else {
      tweetsHTML = '<div class="no-tweets"><i class="far fa-comment-alt"></i> 暂无推文</div>';
    }
  } else {
    tweetsHTML = '<div class="no-tweets"><i class="far fa-comment-alt"></i> 暂无推文</div>';
  }
  
  // 最终HTML
  const html = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} (@${screenName}) | Twitter</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
    <style>
      /* 基本样式 */
      :root {
        --background: #f7f9fa;
        --card-bg: #ffffff;
        --text-color: #0f1419;
        --secondary-text: #536471;
        --border-color: #eff3f4;
        --blue: #1DA1F2;
        --blue-hover: #1a91da;
      }
      
      @media (prefers-color-scheme: dark) {
        :root {
          --background: #15202b;
          --card-bg: #192734;
          --text-color: #ffffff;
          --secondary-text: #8899a6;
          --border-color: #38444d;
        }
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: var(--background);
        color: var(--text-color);
        line-height: 1.3;
      }
      
      a {
        color: var(--blue);
        text-decoration: none;
      }
      
      a:hover {
        text-decoration: underline;
      }
      
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 0;
      }
      
      .profile-card {
        background-color: var(--card-bg);
        border-radius: 16px;
        overflow: hidden;
        margin-bottom: 16px;
        border: 1px solid var(--border-color);
      }
      
      .profile-header {
        position: relative;
      }
      
      .profile-banner {
        width: 100%;
        height: 150px;
        background-color: var(--blue);
        background-size: cover;
        background-position: center;
      }
      
      .profile-avatar-container {
        position: absolute;
        bottom: -50px;
        left: 16px;
      }
      
      .profile-avatar {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        border: 4px solid var(--card-bg);
        object-fit: cover;
      }
      
      .profile-info {
        padding: 60px 16px 16px;
      }
      
      .profile-name-container {
        display: flex;
        align-items: center;
      }
      
      .profile-name {
        font-size: 20px;
        font-weight: bold;
        margin-right: 4px;
      }
      
      /* 强化蓝V标志的样式 - 使用简单明了的样式 */
      .verified-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        background-color: #1DA1F2;
        border-radius: 50%;
        margin-left: 4px;
        color: white;
        font-size: 12px;
        font-weight: bold;
        text-align: center;
        line-height: 1;
      }
      
      .profile-username {
        font-size: 15px;
        color: var(--secondary-text);
        margin-bottom: 12px;
      }
      
      /* 其余样式保持不变 */
      .profile-bio {
        margin-bottom: 15px;
        white-space: pre-line;
      }
      
      .profile-meta {
        display: flex;
        flex-wrap: wrap;
        color: var(--secondary-text);
        margin-bottom: 15px;
        font-size: 14px;
      }
      
      .profile-meta-item {
        display: flex;
        align-items: center;
        margin-right: 15px;
        margin-bottom: 5px;
      }
      
      .profile-meta-item i {
        margin-right: 5px;
        width: 16px;
        text-align: center;
      }
      
      .profile-stats {
        display: flex;
        flex-wrap: wrap;
        margin-top: 15px;
      }
      
      .profile-stat {
        margin-right: 20px;
        margin-bottom: 10px;
      }
      
      .profile-stat-value {
        font-weight: 700;
      }
      
      .profile-stat-label {
        color: var(--secondary-text);
        font-size: 14px;
      }
      
      /* 推文部分 */
      .tweets-title {
        font-size: 20px;
        font-weight: 700;
        margin: 20px 0 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--border-color);
      }
      
      .tweet {
        background-color: var(--card-bg);
        border-radius: 16px;
        padding: 12px;
        margin-bottom: 12px;
        border: 1px solid var(--border-color);
      }
      
      .pinned-tweet {
        border-left: 3px solid var(--blue);
      }
      
      .pinned-label {
        color: var(--secondary-text);
        font-size: 13px;
        margin-bottom: 8px;
      }
      
      .tweet-header {
        display: flex;
        margin-bottom: 10px;
      }
      
      .tweet-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        margin-right: 10px;
      }
      
      .tweet-user-info {
        flex: 1;
      }
      
      .tweet-name {
        font-weight: bold;
      }
      
      .tweet-username {
        color: var(--secondary-text);
        font-size: 14px;
      }
      
      .tweet-date {
        color: var(--secondary-text);
        font-size: 14px;
      }
      
      .tweet-content {
        margin-bottom: 10px;
        white-space: pre-line;
        word-wrap: break-word;
      }
      
      .tweet-media {
        margin: 10px 0;
        border-radius: 16px;
        overflow: hidden;
      }
      
      .tweet-media img, .tweet-media video {
        max-width: 100%;
        border-radius: 16px;
        cursor: pointer;
      }
      
      .tweet-stats {
        display: flex;
        color: var(--secondary-text);
        margin-top: 10px;
      }
      
      .tweet-stats span {
        display: flex;
        align-items: center;
        margin-right: 20px;
        font-size: 14px;
      }
      
      .tweet-stats i {
        margin-right: 5px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="profile-card">
        <div class="profile-header">
          <div class="profile-banner" style="background-image: url('${bannerUrl}')"></div>
          <div class="profile-avatar-container">
            <img src="${profileImageUrl}" class="profile-avatar" alt="${name}">
          </div>
        </div>
        <div class="profile-info">
          <div class="profile-name-container">
            <h1 class="profile-name">${name}</h1>
            ${hasVerifiedBadge ? `<span class="verified-badge" title="已验证账号">✓</span>` : ''}
          </div>
          <div class="profile-username">@${screenName}</div>
          <div class="profile-bio">${description}</div>
          <div class="profile-meta">
            ${userLinksHtml}
          </div>
          <div class="profile-stats">
          <div class="profile-stat">
            <span class="profile-stat-value">${friendsCount}</span>
            <span class="profile-stat-label"> 正在关注</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat-value">${followersCount}</span>
            <span class="profile-stat-label"> 关注者</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat-value">${tweetsCount}</span>
            <span class="profile-stat-label"> 推文</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat-value">${likesCount}</span>
            <span class="profile-stat-label"> 喜欢</span>
          </div>
        </div>
      </div>
    </div>
    
    ${tweetsHTML}
    
    <script>
      // 图片点击放大查看
      document.querySelectorAll('.tweet-media img').forEach(img => {
        img.addEventListener('click', () => {
          window.open(img.src, '_blank');
        });
      });
    </script>
  </body>
  </html>
  `;
  
  return html;
}

// API端点：获取用户资料
app.get('/api/twitter-profile/:username', async (req, res) => {
  let { username } = req.params;
  
  try {
    console.log(`收到获取用户资料请求: ${username}`);
    
    // 移除用户名中的@符号
    username = username.replace('@', '');
    
    // 先检查用户数据是否存在
    const userDir = path.join(__dirname, 'data', username);
    const profilePath = path.join(userDir, 'profile.json');
    
    // 如果用户数据不存在，尝试先获取数据
    if (!fs.existsSync(profilePath)) {
      console.log(`未找到用户 ${username} 数据，尝试通过脚本获取...`);
      
      // 创建用户目录（如果不存在）
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      
      // 调用脚本获取数据
      const success = await fetchTwitterDataUsingScript(username);
      
      if (!success) {
        return res.status(404).send({ 
          success: false, 
          message: `无法获取用户 ${username} 的数据。请确保用户名正确，或者手动导入数据。` 
        });
      }
      
      console.log(`成功获取用户 ${username} 数据，继续生成HTML...`);
    }
    
    // 生成HTML
    const html = await generateProfileHtml(username);
    
    if (html) {
      res.send({ success: true, html });
    } else {
      res.status(404).send({ 
        success: false, 
        message: `无法生成用户 ${username} 的资料页面。尽管尝试获取了数据，但生成HTML失败。` 
      });
    }
  } catch (error) {
    console.error(`处理请求失败: ${error.message}`);
    res.status(500).send({ success: false, message: '服务器错误', error: error.message });
  }
});

// API端点：获取所有可用的Twitter用户列表
app.get('/api/twitter-users', async (req, res) => {
  try {
    console.log('获取所有可用的Twitter用户列表');
    
    // 读取data目录中的所有子目录（用户目录）
    const entries = await fsPromises.readdir(dataDir, { withFileTypes: true });
    const userDirs = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
    
    // 构建用户列表，仅包含有效的用户（有profile.json文件的用户）
    const validUsers = [];
    
    for (const username of userDirs) {
      const userDataPath = path.join(dataDir, username, 'profile.json');
      
      if (fs.existsSync(userDataPath)) {
        try {
          // 读取用户数据文件
          const dataContent = await fsPromises.readFile(userDataPath, 'utf-8');
          const userData = JSON.parse(dataContent);
          
          // 提取基本信息
          const user = userData.data?.user?.result;
          const legacy = user?.legacy || {};
          
          validUsers.push({
            username: legacy.screen_name || username,
            displayName: legacy.name || username,
            avatarUrl: legacy.profile_image_url_https || '',
            description: legacy.description || '',
            followersCount: legacy.followers_count || 0,
            directory: username
          });
        } catch (err) {
          console.error(`读取用户 ${username} 数据时出错:`, err);
        }
      }
    }
    
    res.json({
      success: true,
      users: validUsers
    });
  } catch (error) {
    console.error('获取Twitter用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      error: error.message
    });
  }
});

// 添加API状态端点 - 提供服务器状态信息
app.get('/api/status', (req, res) => {
  console.log('[状态检查] 收到API状态检查请求');
  console.log('[状态检查] 请求头:', JSON.stringify(req.headers, null, 2));
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    version: process.version,
    serverInfo: {
      startTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      workingDirectory: process.cwd()
    }
  });
});

// 调试端点 - 显示请求详情
app.get('/api/debug', (req, res) => {
  // 记录请求头和查询参数等信息
  const requestInfo = {
    headers: req.headers,
    query: req.query,
    params: req.params,
    path: req.path,
    method: req.method,
    ip: req.ip,
    serverTime: new Date().toISOString()
  };
  
  console.log('调试端点请求信息:', JSON.stringify(requestInfo, null, 2));
  
  // 返回详细的请求信息以便调试
  res.json({
    success: true,
    requestInfo,
    message: '调试信息'
  });
});

// API端点：创建或更新Twitter用户数据
app.post('/api/twitter-profile/create', async (req, res) => {
  try {
    const { username, userData, tweetsData } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: username'
      });
    }

    // 移除用户名中的@符号
    const cleanUsername = username.replace('@', '');
    console.log(`开始为用户 ${cleanUsername} 创建/更新数据文件`);
    
    // 为用户创建单独的文件夹
    const userDir = path.join(__dirname, 'data', cleanUsername);
    
    // 确保用户目录存在
    if (!fs.existsSync(userDir)) {
      console.log(`创建用户目录: ${userDir}`);
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    // 文件路径
    const profileJsonPath = path.join(userDir, 'profile.json');
    const tweetsJsonPath = path.join(userDir, 'tweets.json');
    
    // 保存用户数据
    if (userData) {
      await fsPromises.writeFile(profileJsonPath, JSON.stringify(userData, null, 2), 'utf-8');
      console.log(`已保存用户资料数据到: ${profileJsonPath}`);
    }
    
    // 保存推文数据
    if (tweetsData) {
      await fsPromises.writeFile(tweetsJsonPath, JSON.stringify(tweetsData, null, 2), 'utf-8');
      console.log(`已保存用户推文数据到: ${tweetsJsonPath}`);
    }
    
    // 如果两个文件都存在，生成HTML
    if (fs.existsSync(profileJsonPath)) {
      try {
        const html = await generateProfileHtml(cleanUsername);
        
        res.json({
          success: true,
          message: `成功创建/更新用户 ${cleanUsername} 的数据文件`,
          profilePath: profileJsonPath,
          tweetsPath: tweetsJsonPath,
          htmlGenerated: !!html
        });
      } catch (error) {
        console.error(`生成HTML时出错: ${error.message}`);
        res.json({
          success: true,
          message: `已保存数据文件，但HTML生成失败: ${error.message}`,
          profilePath: profileJsonPath,
          tweetsPath: tweetsJsonPath,
          htmlGenerated: false
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: '保存数据文件失败'
      });
    }
  } catch (error) {
    console.error(`创建用户数据失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

// 添加简单的测试端点
app.get('/api/test-connection', (req, res) => {
  console.log('收到测试连接请求');
  console.log('请求头:', JSON.stringify(req.headers, null, 2));
  console.log('请求参数:', req.query);
  
  // 返回服务器当前时间和请求信息
  res.json({
    success: true,
    message: '连接测试成功',
    serverTime: new Date().toISOString(),
    requestInfo: {
      headers: req.headers,
      query: req.query,
      ip: req.ip
    }
  });
});

// 处理获取Twitter关注列表的请求 (如果还不存在)
app.get('/api/twitter/following', async (req, res) => {
  console.log('====== 获取Twitter关注列表请求 ======');
  console.log('请求参数:', req.query);
  console.log('用户名:', req.query.username);
  console.log('页数:', req.query.pages || '默认');
  
  const username = req.query.username;
  const pages = parseInt(req.query.pages) || 3;
  
  if (!username) {
    console.log('错误: 缺少username参数');
    return res.status(400).json({
      success: false,
      message: '缺少必需的username参数'
    });
  }
  
  console.log(`开始处理用户 ${username} 的关注列表，页数: ${pages}`);
  
  try {
    // 检查followdata目录是否存在，如果不存在则创建
    const followDataDir = path.join(__dirname, '..', 'followdata');
    console.log(`[检查目录] 关注数据目录: ${followDataDir}`);
    
    if (!fs.existsSync(followDataDir)) {
      console.log(`[创建目录] 创建followdata目录: ${followDataDir}`);
      fs.mkdirSync(followDataDir, { recursive: true });
    }
    
    // 检查是否已有此用户的本地数据
    const followingFilePath = path.join(followDataDir, `${username}_following.json`);
    console.log(`[检查文件] 关注列表文件路径: ${followingFilePath}`);
    
    if (fs.existsSync(followingFilePath)) {
      try {
        // 检查文件修改时间，如果是最近30分钟内的数据，直接使用
        const stats = fs.statSync(followingFilePath);
        const fileModifiedTime = new Date(stats.mtime);
        const fileAgeInMinutes = (new Date().getTime() - fileModifiedTime.getTime()) / (1000 * 60);
        const fileSizeInKB = stats.size / 1024;
        
        console.log(`[本地文件] 找到关注列表文件`);
        console.log(`[本地文件] 文件大小: ${fileSizeInKB.toFixed(2)} KB`);
        console.log(`[本地文件] 最后修改时间: ${fileModifiedTime.toISOString()}`);
        console.log(`[本地文件] 文件年龄: ${fileAgeInMinutes.toFixed(2)} 分钟`);
        
        // 读取文件内容
        const fileContent = fs.readFileSync(followingFilePath, 'utf-8');
        console.log(`[本地文件] 成功读取文件内容`);
        
        try {
          // 解析JSON
          const followingData = JSON.parse(fileContent);
          console.log(`[本地文件] 成功解析JSON数据`);
          
          // 验证数据结构
          if (followingData.accounts && Array.isArray(followingData.accounts)) {
            console.log(`[本地文件] 数据有效，包含 ${followingData.accounts.length} 个账号`);
            
            // 添加元数据
            followingData.fromLocalFile = true;
            followingData.fileAge = fileAgeInMinutes;
            followingData.fileModifiedTime = fileModifiedTime.toISOString();
            
            // 将关注列表保存到数据库
            try {
              console.log(`[数据库] 开始保存关注列表到数据库`);
              const saveResult = await bulkSaveAccounts(followingData.accounts, username);
              console.log(`[数据库] 保存结果: 新增 ${saveResult.inserted}, 更新 ${saveResult.updated}, 失败 ${saveResult.failed}`);
              
              // 添加数据库保存结果
              followingData.databaseSaveResult = saveResult;
            } catch (dbError) {
              console.error(`[数据库] 保存到数据库失败:`, dbError);
            }
            
            return res.json(followingData);
          } else {
            console.log(`[本地文件] 解析的JSON数据缺少accounts数组，可能格式不正确`);
          }
        } catch (parseError) {
          console.error(`[本地文件] JSON解析失败:`, parseError);
        }
      } catch (fileError) {
        console.error(`[本地文件] 读取文件失败:`, fileError);
      }
    } else {
      console.log(`[本地文件] 未找到用户 ${username} 的关注列表文件`);
    }
    
    // 如果没有有效的本地文件，调用脚本获取数据
    console.log(`[脚本执行] 准备执行脚本获取关注列表...`);
    
    // 构建脚本路径
    const scriptPath = path.join(__dirname, '..', 'scripts', 'getFollowing.js');
    console.log(`[脚本执行] 脚本路径: ${scriptPath}`);
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`[脚本执行] 错误: 未找到脚本文件: ${scriptPath}`);
      return res.status(500).json({
        success: false,
        message: `获取关注列表失败: 脚本文件不存在`
      });
    }
    
    // 执行脚本获取数据
    console.log(`[脚本执行] 开始执行脚本: node ${scriptPath} ${username} --pages=${pages}`);
    
    const scriptCommand = `node "${scriptPath}" "${username}" --pages=${pages}`;
    console.log(`[脚本执行] 完整命令: ${scriptCommand}`);
    
    exec(scriptCommand, async (error, stdout, stderr) => {
      console.log(`[脚本执行后] 脚本执行完成`);
      
      if (error) {
        console.error(`[脚本执行后] 脚本执行失败:`, error);
        console.error(`[脚本执行后] 错误输出:`, stderr);
        
        // 检查followdata目录内容，用于调试
        try {
          console.log(`[目录内容] 检查followdata目录内容:`);
          const dirFiles = fs.readdirSync(followDataDir);
          console.log(`[目录内容] followdata目录文件: ${dirFiles.join(', ')}`);
        } catch (e) {
          console.error(`[目录内容] 无法读取目录内容:`, e);
        }
        
        return res.status(500).json({
          success: false,
          message: `获取关注列表失败: 脚本执行错误: ${error.message}`,
          scriptOutput: stdout,
          scriptError: stderr
        });
      }
      
      console.log(`[脚本执行后] 脚本标准输出:`, stdout);
      
      if (stderr) {
        console.warn(`[脚本执行后] 脚本标准错误:`, stderr);
      }
      
      // 检查脚本是否生成了文件
      console.log(`[脚本执行后] 检查是否生成了关注列表文件`);
      
      if (fs.existsSync(followingFilePath)) {
        try {
          // 读取生成的文件
          const fileContent = fs.readFileSync(followingFilePath, 'utf-8');
          console.log(`[脚本执行后] 成功读取生成的文件`);
          
          try {
            // 解析JSON
            const followingData = JSON.parse(fileContent);
            console.log(`[脚本执行后] 成功解析生成的JSON数据`);
            
            // 验证数据结构
            if (followingData.accounts && Array.isArray(followingData.accounts)) {
              console.log(`[脚本执行后] 数据有效，包含 ${followingData.accounts.length} 个账号`);
              
              // 添加元数据
              followingData.fromLocalFile = false;
              followingData.generatedAt = new Date().toISOString();
              followingData.scriptOutput = stdout;
              
              // 将关注列表保存到数据库
              try {
                console.log(`[数据库] 开始保存关注列表到数据库`);
                const saveResult = await bulkSaveAccounts(followingData.accounts, username);
                console.log(`[数据库] 保存结果: 新增 ${saveResult.inserted}, 更新 ${saveResult.updated}, 失败 ${saveResult.failed}`);
                
                // 添加数据库保存结果
                followingData.databaseSaveResult = saveResult;
              } catch (dbError) {
                console.error(`[数据库] 保存到数据库失败:`, dbError);
              }
              
              return res.json(followingData);
            } else {
              console.error(`[脚本执行后] 解析的JSON数据缺少accounts数组`);
              return res.status(500).json({
                success: false,
                message: '获取关注列表失败: 生成的数据格式不正确',
                scriptOutput: stdout
              });
            }
          } catch (parseError) {
            console.error(`[脚本执行后] JSON解析失败:`, parseError);
            return res.status(500).json({
              success: false,
              message: `获取关注列表失败: 无法解析生成的JSON: ${parseError.message}`,
              fileContent: fileContent.substring(0, 200) + '...' // 只发送部分内容用于调试
            });
          }
        } catch (fileError) {
          console.error(`[脚本执行后] 读取生成的文件失败:`, fileError);
          return res.status(500).json({
            success: false,
            message: `获取关注列表失败: 无法读取生成的文件: ${fileError.message}`
          });
        }
      } else {
        console.error(`[脚本执行后] 脚本未能生成关注列表文件`);
        return res.status(500).json({
          success: false,
          message: '获取关注列表失败: 脚本执行后未找到关注列表文件',
          scriptOutput: stdout
        });
      }
    });
  } catch (error) {
    console.error(`[全局错误] 处理关注列表请求时出错:`, error);
    res.status(500).json({
      success: false,
      message: `获取关注列表失败: ${error.message}`
    });
  }
});

// API端点：检查文件系统状态
app.get('/api/filesystem-check', (req, res) => {
  try {
    // 检查脚本文件
    const scriptPath = path.join(__dirname, '..', 'scripts', 'getFollowing.js');
    const scriptExists = fs.existsSync(scriptPath);
    
    // 尝试读取脚本文件头部内容
    let scriptContent = '';
    if (scriptExists) {
      try {
        scriptContent = fs.readFileSync(scriptPath, 'utf8').substring(0, 500) + '...';
      } catch (err) {
        scriptContent = `读取失败: ${err.message}`;
      }
    }
    
    // 检查输出目录
    const outputDir = path.join(__dirname, '..', 'followdata');
    const outputDirExists = fs.existsSync(outputDir);
    
    // 如果输出目录存在，列出其中的文件
    let outputFiles = [];
    if (outputDirExists) {
      try {
        outputFiles = fs.readdirSync(outputDir);
      } catch (err) {
        outputFiles = [`读取目录失败: ${err.message}`];
      }
    }
    
    // 返回文件系统状态
    res.json({
      success: true,
      scriptInfo: {
        path: scriptPath,
        exists: scriptExists,
        preview: scriptContent
      },
      outputDir: {
        path: outputDir,
        exists: outputDirExists,
        files: outputFiles
      },
      serverInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: process.cwd(),
        dirname: __dirname
      }
    });
  } catch (error) {
    console.error('检查文件系统状态失败:', error);
    res.status(500).json({
      success: false,
      error: `检查文件系统状态失败: ${error.message}`
    });
  }
});

// 强化脚本执行方法 - 用于直接从浏览器测试脚本执行
app.get('/api/test-script', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const results = {
    logs: [],
    success: false,
    error: null,
    output: null
  };
  
  try {
    const { username = 'dotyyds1234', pages = 1 } = req.query;
    
    results.logs.push(`测试脚本执行: username=${username}, pages=${pages}`);
    
    // 检查脚本文件
    const scriptPath = path.join(__dirname, '..', 'scripts', 'getFollowing.js');
    if (!fs.existsSync(scriptPath)) {
      results.logs.push(`脚本文件不存在: ${scriptPath}`);
      results.error = `脚本文件不存在: ${scriptPath}`;
      return res.status(404).json(results);
    }
    
    results.logs.push(`脚本文件存在: ${scriptPath}`);
    
    // 确保输出目录存在
    const outputDir = path.join(__dirname, '..', 'followdata');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      results.logs.push(`创建输出目录: ${outputDir}`);
    } else {
      results.logs.push(`输出目录已存在: ${outputDir}`);
    }
    
    // 使用execFile执行脚本
    results.logs.push(`开始执行脚本...`);
    
    try {
      // 使用Promise包装子进程执行
      const { stdout, stderr } = await new Promise((resolve, reject) => {
        const child = exec(`node "${scriptPath}" "${username}" ${pages}`, {
          timeout: 60000 // 60秒超时
        }, (error, stdout, stderr) => {
          if (error) {
            reject({ error, stdout, stderr });
          } else {
            resolve({ stdout, stderr });
          }
        });
        
        // 收集实时输出
        child.stdout.on('data', (data) => {
          results.logs.push(`脚本输出: ${data}`);
          console.log(`[脚本输出] ${data}`);
        });
        
        child.stderr.on('data', (data) => {
          results.logs.push(`脚本错误: ${data}`);
          console.error(`[脚本错误] ${data}`);
        });
      });
      
      results.logs.push(`脚本执行完成`);
      results.logs.push(`stdout: ${stdout.substring(0, 200)}...`);
      
      if (stderr) {
        results.logs.push(`stderr: ${stderr}`);
      }
      
      // 检查输出文件
      const jsonPath = path.join(outputDir, `${username}_following.json`);
      results.logs.push(`检查输出文件: ${jsonPath}`);
      
      if (!fs.existsSync(jsonPath)) {
        results.logs.push(`输出文件不存在: ${jsonPath}`);
        results.error = `输出文件不存在: ${jsonPath}`;
        return res.json(results);
      }
      
      results.logs.push(`输出文件存在，准备读取`);
      
      // 读取输出文件
      const fileContent = fs.readFileSync(jsonPath, 'utf8');
      results.logs.push(`成功读取文件，内容长度: ${fileContent.length}`);
      
      // 解析JSON
      results.logs.push(`尝试解析JSON...`);
      const jsonData = JSON.parse(fileContent);
      results.logs.push(`成功解析JSON`);
      
      // 返回结果
      results.success = true;
      results.output = jsonData;
      return res.json(results);
      
    } catch (execError) {
      results.logs.push(`脚本执行错误: ${execError.error ? execError.error.message : execError.message || '未知错误'}`);
      
      if (execError.stdout) {
        results.logs.push(`标准输出: ${execError.stdout}`);
      }
      
      if (execError.stderr) {
        results.logs.push(`错误输出: ${execError.stderr}`);
      }
      
      results.error = `脚本执行错误: ${execError.error ? execError.error.message : execError.message || '未知错误'}`;
      return res.status(500).json(results);
    }
    
  } catch (error) {
    results.logs.push(`测试脚本执行失败: ${error.message}`);
    results.error = `测试脚本执行失败: ${error.message}`;
    return res.status(500).json(results);
  }
});

// 新增API：获取账号列表（从数据库）
app.get('/api/accounts', async (req, res) => {
  try {
    console.log('[数据库] 收到获取账号列表请求');
    console.log('[数据库] 请求参数:', req.query);
    
    const options = {
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0,
      category: req.query.category,
      isAnnotated: req.query.isAnnotated === 'true' ? true : 
                  req.query.isAnnotated === 'false' ? false : null,
      searchTerm: req.query.search,
      sortBy: req.query.sortBy || 'import_date',
      sortOrder: req.query.sortOrder || 'DESC'
    };
    
    // 从数据库获取账号列表
    const accounts = await getAccounts(options);
    
    // 获取总数和统计信息
    const stats = await getStats();
    
    console.log(`[数据库] 成功获取 ${accounts.length} 个账号`);
    
    res.json({
      success: true,
      accounts,
      total: stats.totalAccounts,
      annotated: stats.annotatedAccounts,
      stats
    });
  } catch (error) {
    console.error('[数据库] 获取账号列表失败:', error);
    res.status(500).json({
      success: false,
      message: `获取账号列表失败: ${error.message}`
    });
  }
});

// 新增API：保存账号标注
app.post('/api/annotation', async (req, res) => {
  try {
    console.log('[数据库] 收到保存标注请求');
    console.log('[数据库] 请求参数:', req.body);
    
    const { username, category, notes } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: '缺少必需的username参数'
      });
    }
    
    // 保存标注到数据库
    const result = await saveAnnotation(username, category, notes);
    
    console.log(`[数据库] 成功保存标注: ${JSON.stringify(result)}`);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[数据库] 保存标注失败:', error);
    res.status(500).json({
      success: false,
      message: `保存标注失败: ${error.message}`
    });
  }
});

// 新增API：获取分类列表
app.get('/api/categories', async (req, res) => {
  try {
    console.log('[数据库] 收到获取分类列表请求');
    
    // 从数据库获取分类列表
    const categories = await getCategories();
    
    console.log(`[数据库] 成功获取 ${categories.length} 个分类`);
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('[数据库] 获取分类列表失败:', error);
    res.status(500).json({
      success: false,
      message: `获取分类列表失败: ${error.message}`
    });
  }
});

// 新增API：导出数据
app.get('/api/export', async (req, res) => {
  try {
    console.log('[数据库] 收到导出数据请求');
    console.log('[数据库] 请求参数:', req.query);
    
    const { format, category, isAnnotated } = req.query;
    
    const options = {
      category,
      isAnnotated: isAnnotated === 'true' ? true : 
                  isAnnotated === 'false' ? false : null
    };
    
    let result;
    
    // 根据格式选择导出方法
    if (format === 'csv') {
      result = await exportToCsv(options);
    } else {
      result = await exportToJson(options);
    }
    
    console.log(`[数据库] 成功导出 ${result.count} 个账号到 ${result.filename}`);
    
    // 返回文件下载URL
    res.json({
      success: true,
      ...result,
      downloadUrl: `/exports/${result.filename}`
    });
  } catch (error) {
    console.error('[数据库] 导出数据失败:', error);
    res.status(500).json({
      success: false,
      message: `导出数据失败: ${error.message}`
    });
  }
});

// 数据库管理API路由
// 获取导入来源列表
app.get('/api/sources', async (req, res) => {
  try {
    console.log('[数据库] 获取导入来源列表');
    const db = await getDatabase();
    
    // 查询所有不同的imported_from值和对应的账号数量
    const sources = await db.all(`
      SELECT 
        imported_from AS source_username, 
        COUNT(*) AS count 
      FROM 
        twitter_accounts 
      WHERE 
        imported_from IS NOT NULL AND imported_from != ''
      GROUP BY 
        imported_from 
      ORDER BY 
        count DESC
    `);
    
    res.json({ success: true, sources });
  } catch (error) {
    console.error('[数据库] 获取导入来源列表失败:', error);
    res.status(500).json({ success: false, message: `获取导入来源列表失败: ${error.message}` });
  }
});

// 删除指定来源的账号
app.post('/api/sources/:source/delete', async (req, res) => {
  try {
    const source = req.params.source;
    console.log(`[数据库] 删除来源 ${source} 的账号`);
    
    const db = await getDatabase();
    
    // 先获取要删除的账号数量
    const countResult = await db.get(`
      SELECT COUNT(*) AS count 
      FROM twitter_accounts 
      WHERE imported_from = ?
    `, [source]);
    
    // 执行删除
    const result = await db.run(`
      DELETE FROM twitter_accounts 
      WHERE imported_from = ?
    `, [source]);
    
    // 更新分类表中的计数
    await db.run(`
      UPDATE categories 
      SET count = (
        SELECT COUNT(*) 
        FROM twitter_accounts 
        WHERE category = categories.name
      )
    `);
    
    res.json({ 
      success: true, 
      count: countResult.count,
      message: `已删除 ${countResult.count} 个从 ${source} 导入的账号` 
    });
  } catch (error) {
    console.error(`[数据库] 删除来源账号失败:`, error);
    res.status(500).json({ success: false, message: `删除来源账号失败: ${error.message}` });
  }
});

// 删除所有未标注账号
app.post('/api/accounts/unannotated/delete', async (req, res) => {
  try {
    console.log('[数据库] 删除所有未标注账号');
    
    const db = await getDatabase();
    
    // 先获取要删除的账号数量
    const countResult = await db.get(`
      SELECT COUNT(*) AS count 
      FROM twitter_accounts 
      WHERE annotated_at IS NULL
    `);
    
    // 执行删除
    const result = await db.run(`
      DELETE FROM twitter_accounts 
      WHERE annotated_at IS NULL
    `);
    
    res.json({ 
      success: true, 
      count: countResult.count,
      message: `已删除 ${countResult.count} 个未标注账号` 
    });
  } catch (error) {
    console.error('[数据库] 删除未标注账号失败:', error);
    res.status(500).json({ success: false, message: `删除未标注账号失败: ${error.message}` });
  }
});

// 清理重复账号
app.post('/api/accounts/duplicates/clean', async (req, res) => {
  try {
    console.log('[数据库] 清理重复账号');
    
    const db = await getDatabase();
    let cleanedCount = 0;
    
    // 查找重复的username（不考虑大小写）
    const duplicates = await db.all(`
      SELECT LOWER(username) AS lowercase_username, COUNT(*) AS count
      FROM twitter_accounts
      GROUP BY LOWER(username)
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length === 0) {
      return res.json({ 
        success: true, 
        count: 0,
        message: '未发现重复账号' 
      });
    }
    
    // 开始事务
    await db.exec('BEGIN TRANSACTION');
    
    try {
      // 处理每组重复
      for (const dup of duplicates) {
        const lowercaseUsername = dup.lowercase_username;
        
        // 获取这个用户名的所有账号，按annotated_at排序（已标注的优先保留）
        const accounts = await db.all(`
          SELECT * FROM twitter_accounts
          WHERE LOWER(username) = ?
          ORDER BY 
            CASE WHEN annotated_at IS NOT NULL THEN 0 ELSE 1 END,
            CASE WHEN import_date IS NOT NULL THEN import_date ELSE '1970-01-01' END DESC
        `, [lowercaseUsername]);
        
        if (accounts.length <= 1) continue;
        
        // 保留第一个账号（已标注或最新导入的）
        const keep = accounts[0];
        const toDelete = accounts.slice(1);
        
        // 更新要删除的账号数量
        cleanedCount += toDelete.length;
        
        // 删除重复账号
        for (const del of toDelete) {
          await db.run(`
            DELETE FROM twitter_accounts
            WHERE username = ?
          `, [del.username]);
        }
      }
      
      // 提交事务
      await db.exec('COMMIT');
      
      // 更新分类表中的计数
      await db.run(`
        UPDATE categories 
        SET count = (
          SELECT COUNT(*) 
          FROM twitter_accounts 
          WHERE category = categories.name
        )
      `);
      
      res.json({ 
        success: true, 
        count: cleanedCount,
        message: `已清理 ${cleanedCount} 个重复账号` 
      });
    } catch (error) {
      // 回滚事务
      await db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('[数据库] 清理重复账号失败:', error);
    res.status(500).json({ success: false, message: `清理重复账号失败: ${error.message}` });
  }
});

// 重命名分类
app.post('/api/categories/rename', async (req, res) => {
  try {
    const { sourceCategory, targetCategory } = req.body;
    
    if (!sourceCategory || !targetCategory) {
      return res.status(400).json({ 
        success: false, 
        message: '请提供源分类和目标分类名称' 
      });
    }
    
    console.log(`[数据库] 重命名分类 ${sourceCategory} → ${targetCategory}`);
    
    const db = await getDatabase();
    
    // 开始事务
    await db.exec('BEGIN TRANSACTION');
    
    try {
      // 获取要更新的账号数量
      const countResult = await db.get(`
        SELECT COUNT(*) AS count 
        FROM twitter_accounts 
        WHERE category = ?
      `, [sourceCategory]);
      
      // 更新账号的分类
      await db.run(`
        UPDATE twitter_accounts 
        SET category = ?
        WHERE category = ?
      `, [targetCategory, sourceCategory]);
      
      // 删除旧分类
      await db.run(`
        DELETE FROM categories
        WHERE name = ?
      `, [sourceCategory]);
      
      // 更新或插入新分类
      const existingCategory = await db.get(`
        SELECT * FROM categories
        WHERE name = ?
      `, [targetCategory]);
      
      if (existingCategory) {
        await db.run(`
          UPDATE categories 
          SET count = (
            SELECT COUNT(*) 
            FROM twitter_accounts 
            WHERE category = ?
          )
          WHERE name = ?
        `, [targetCategory, targetCategory]);
      } else {
        await db.run(`
          INSERT INTO categories (name, count, created_at)
          VALUES (?, (
            SELECT COUNT(*) 
            FROM twitter_accounts 
            WHERE category = ?
          ), datetime('now'))
        `, [targetCategory, targetCategory]);
      }
      
      // 提交事务
      await db.exec('COMMIT');
      
      res.json({ 
        success: true, 
        count: countResult.count,
        message: `已将分类 "${sourceCategory}" 重命名为 "${targetCategory}"` 
      });
    } catch (error) {
      // 回滚事务
      await db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('[数据库] 重命名分类失败:', error);
    res.status(500).json({ success: false, message: `重命名分类失败: ${error.message}` });
  }
});

// 合并分类
app.post('/api/categories/merge', async (req, res) => {
  try {
    const { sourceCategory, targetCategory } = req.body;
    
    if (!sourceCategory || !targetCategory) {
      return res.status(400).json({ 
        success: false, 
        message: '请提供源分类和目标分类名称' 
      });
    }
    
    if (sourceCategory === targetCategory) {
      return res.status(400).json({ 
        success: false, 
        message: '源分类和目标分类不能相同' 
      });
    }
    
    console.log(`[数据库] 合并分类 ${sourceCategory} → ${targetCategory}`);
    
    const db = await getDatabase();
    
    // 开始事务
    await db.exec('BEGIN TRANSACTION');
    
    try {
      // 获取要更新的账号数量
      const countResult = await db.get(`
        SELECT COUNT(*) AS count 
        FROM twitter_accounts 
        WHERE category = ?
      `, [sourceCategory]);
      
      // 更新账号的分类
      await db.run(`
        UPDATE twitter_accounts 
        SET category = ?
        WHERE category = ?
      `, [targetCategory, sourceCategory]);
      
      // 删除源分类
      await db.run(`
        DELETE FROM categories
        WHERE name = ?
      `, [sourceCategory]);
      
      // 更新目标分类计数
      await db.run(`
        UPDATE categories 
        SET count = (
          SELECT COUNT(*) 
          FROM twitter_accounts 
          WHERE category = ?
        )
        WHERE name = ?
      `, [targetCategory, targetCategory]);
      
      // 提交事务
      await db.exec('COMMIT');
      
      res.json({ 
        success: true, 
        count: countResult.count,
        message: `已将分类 "${sourceCategory}" 合并到 "${targetCategory}"` 
      });
    } catch (error) {
      // 回滚事务
      await db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('[数据库] 合并分类失败:', error);
    res.status(500).json({ success: false, message: `合并分类失败: ${error.message}` });
  }
});

// 备份数据库
app.post('/api/database/backup', async (req, res) => {
  try {
    console.log('[数据库] 备份数据库');
    
    const db = await getDatabase();
    
    // 生成备份文件名（带时间戳）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `xmark_backup_${timestamp}.db`;
    const backupPath = path.join(__dirname, '..', 'data', backupFilename);
    
    // 备份数据库
    await db.exec(`VACUUM INTO '${backupPath}'`);
    
    res.json({ 
      success: true, 
      filename: backupFilename,
      message: `数据库备份成功: ${backupFilename}` 
    });
  } catch (error) {
    console.error('[数据库] 备份数据库失败:', error);
    res.status(500).json({ success: false, message: `备份数据库失败: ${error.message}` });
  }
});

// 新增API：获取数据库统计信息
app.get('/api/stats', async (req, res) => {
  try {
    console.log('[数据库] 收到获取统计信息请求');
    
    // 从数据库获取统计信息
    const stats = await getStats();
    
    console.log(`[数据库] 成功获取统计信息: 总账号 ${stats.totalAccounts}，已标注 ${stats.annotatedAccounts}，分类 ${stats.totalCategories}`);
    
    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    console.error('[数据库] 获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      message: `获取统计信息失败: ${error.message}`
    });
  }
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('全局错误处理:', err);
  
  // 确保设置正确的MIME类型
  res.setHeader('Content-Type', 'application/json');
  
  // 返回JSON格式的错误响应
  return res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误'
  });
});

// API端点：获取用户的共同关注者列表
app.get('/api/same-followers/:username', async (req, res) => {
  let { username } = req.params;
  const refresh = req.query.refresh === 'true';
  
  try {
    console.log(`[共同关注] 收到请求获取用户 ${username} 的共同关注者，refresh=${refresh}`);
    
    // 确保用户目录存在
    const userDir = path.join(__dirname, 'data', username);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
      console.log(`[共同关注] 创建用户目录: ${userDir}`);
    }
    
    const sameFollowersPath = path.join(userDir, 'samefollower.json');
    let result;
    
    // 如果需要刷新或文件不存在，则重新获取数据
    if (refresh || !fs.existsSync(sameFollowersPath)) {
      console.log(`[共同关注] 需要获取新数据: ${sameFollowersPath}`);
      
      try {
        // 使用外部脚本获取共同关注者数据
        const scriptsDir = path.join(__dirname, '..', 'scripts');
        const scriptPath = path.join(scriptsDir, 'getSameFollowers.js');
        
        console.log(`[共同关注] 执行脚本: ${scriptPath} ${username}`);
        
        // 执行脚本获取共同关注者数据
        const { getSameFollowersForUser } = await import('../scripts/getSameFollowers.js');
        result = await getSameFollowersForUser(username);
        
        if (!result.success) {
          console.error(`[共同关注] 获取失败: ${result.error}`);
          throw new Error(result.error || '获取数据失败');
        }
      } catch (error) {
        console.error(`[共同关注] 处理失败: ${error.message}`);
        return res.status(500).send({ 
          success: false, 
          message: `获取用户 ${username} 的共同关注者数据失败`, 
          error: error.message 
        });
      }
    } else {
      // 如果文件存在，直接读取文件
      console.log(`[共同关注] 读取现有数据: ${sameFollowersPath}`);
      const fileData = await fsPromises.readFile(sameFollowersPath, 'utf8');
      result = JSON.parse(fileData);
    }
    
    res.send({ 
      success: true, 
      username,
      data: result
    });
  } catch (error) {
    console.error(`[共同关注] 处理请求失败: ${error.message}`);
    res.status(500).send({ success: false, message: '服务器错误', error: error.message });
  }
});

// 以下内容需放在末尾
// 404处理
app.use((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: `找不到路径: ${req.originalUrl}`
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Twitter API服务器已启动: http://localhost:${PORT}`);
  console.log(`API测试端点: http://localhost:${PORT}/api/status`);
  console.log(`关注列表API: http://localhost:${PORT}/api/twitter/following?username=dotyyds1234`);
  console.log(`共同关注者API: http://localhost:${PORT}/api/same-followers/elonmusk`);
  console.log(`账号列表API: http://localhost:${PORT}/api/accounts`);
});