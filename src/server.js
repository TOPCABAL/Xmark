import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs';
import cors from 'cors';

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

// 中间件
app.use(express.json());
app.use(cors({
  origin: '*', // 开发环境允许所有来源访问
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`已创建数据目录: ${dataDir}`);
}

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
  const isVerified = legacy.verified || false;
  
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
  
  // 生成完整HTML
  const html = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} (@${screenName}) | Twitter</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --primary-color: #1DA1F2;
        --text-color: #14171A;
        --secondary-text: #657786;
        --border-color: #E1E8ED;
        --background: #F5F8FA;
        --link-color: #1DA1F2;
        --card-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: var(--background);
        color: var(--text-color);
        line-height: 1.4;
        font-size: 15px;
        max-width: 700px;
        margin: 0 auto;
        padding: 15px 20px;
      }
      
      a {
        color: var(--link-color);
        text-decoration: none;
      }
      
      a:hover {
        text-decoration: underline;
      }
      
      /* 用户资料卡片 */
      .profile-card {
        background-color: white;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: var(--card-shadow);
        margin-bottom: 20px;
      }
      
      .profile-header {
        position: relative;
      }
      
      .profile-banner {
        width: 100%;
        height: 200px;
        background-color: var(--primary-color);
        background-size: cover;
        background-position: center;
      }
      
      .profile-avatar-container {
        position: absolute;
        bottom: -60px;
        left: 20px;
        padding: 4px;
        background-color: white;
        border-radius: 50%;
      }
      
      .profile-avatar {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        border: 4px solid white;
        object-fit: cover;
      }
      
      .profile-info {
        padding: 70px 20px 20px;
      }
      
      .profile-name-container {
        display: flex;
        align-items: center;
        margin-bottom: 4px;
      }
      
      .profile-name {
        font-size: 22px;
        font-weight: 700;
        margin-right: 4px;
      }
      
      .verified-badge {
        color: white;
        background-color: var(--primary-color);
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }
      
      .profile-username {
        font-size: 15px;
        color: var(--secondary-text);
        margin-bottom: 12px;
      }
      
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
        background-color: white;
        border-radius: 16px;
        padding: 15px;
        margin-bottom: 15px;
        box-shadow: var(--card-shadow);
      }
      
      .pinned-tweet {
        border-left: 3px solid var(--primary-color);
      }
      
      .pinned-label {
        font-size: 13px;
        color: var(--secondary-text);
        margin-bottom: 8px;
      }
      
      .pinned-label i {
        transform: rotate(45deg);
        margin-right: 5px;
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
        object-fit: cover;
      }
      
      .tweet-user-info {
        display: flex;
        flex-direction: column;
      }
      
      .tweet-name {
        font-weight: 700;
      }
      
      .tweet-username, .tweet-date {
        font-size: 14px;
        color: var(--secondary-text);
      }
      
      .tweet-content {
        margin-bottom: 12px;
        word-wrap: break-word;
        white-space: pre-wrap;
      }
      
      .tweet-media {
        margin: 10px 0;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        grid-gap: 8px;
        border-radius: 16px;
        overflow: hidden;
      }
      
      .tweet-media img, .tweet-media video {
        width: 100%;
        max-height: 400px;
        object-fit: cover;
        border-radius: 12px;
      }
      
      .tweet-media img {
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .tweet-media img:hover {
        opacity: 0.9;
      }
      
      .tweet-stats {
        display: flex;
        margin-top: 12px;
        color: var(--secondary-text);
      }
      
      .tweet-stat {
        display: flex;
        align-items: center;
        margin-right: 20px;
        font-size: 14px;
      }
      
      .tweet-stat i {
        margin-right: 5px;
      }
      
      .no-tweets {
        text-align: center;
        padding: 40px;
        color: var(--secondary-text);
        background-color: white;
        border-radius: 16px;
        box-shadow: var(--card-shadow);
      }
      
      .no-tweets i {
        font-size: 40px;
        margin-bottom: 15px;
        display: block;
      }
      
      /* 响应式设计 */
      @media (max-width: 800px) {
        body {
          max-width: 95%;
          padding: 10px;
        }
      }
    </style>
  </head>
  <body>
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
          ${isVerified ? '<div class="verified-badge"><i class="fas fa-check"></i></div>' : ''}
        </div>
        <div class="profile-username">@${screenName}</div>
        <div class="profile-bio">${description}</div>
        
        <div class="profile-meta">
          ${location ? `<div class="profile-meta-item"><i class="fas fa-map-marker-alt"></i>${location}</div>` : ''}
          ${url ? `<div class="profile-meta-item"><i class="fas fa-link"></i><a href="${url}" target="_blank">${url}</a></div>` : ''}
          ${createdAt ? `<div class="profile-meta-item"><i class="far fa-calendar-alt"></i>${createdAt}加入</div>` : ''}
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
  
  // 在HTML的style标签内添加额外的样式
  const styleEndPos = html.indexOf('</style>');
  
  if (styleEndPos !== -1) {
    const bodyStyles = `
      body {
        font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: var(--background);
        color: var(--text-color);
        line-height: 1.4;
        font-size: 15px;
        max-width: 700px;
        margin: 0 auto;
        padding: 15px 20px;
      }
      
      .profile-card {
        margin-bottom: 20px;
      }
      
      .profile-info {
        padding: 70px 20px 20px;
      }
      
      .profile-avatar {
        width: 120px;
        height: 120px;
      }
      
      .profile-avatar-container {
        bottom: -60px;
      }
      
      .tweet {
        padding: 15px;
        margin-bottom: 15px;
      }
      
      @media (max-width: 800px) {
        body {
          max-width: 95%;
          padding: 10px;
        }
      }
    `;
    
    html = html.slice(0, styleEndPos) + bodyStyles + html.slice(styleEndPos);
  }
  
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

// API状态检查端点
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Twitter API服务运行中',
    time: new Date().toISOString()
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

// 启动服务器
app.listen(PORT, () => {
  console.log(`Twitter API服务器已启动: http://localhost:${PORT}`);
  console.log(`API测试端点: http://localhost:${PORT}/api/status`);
  console.log(`用户资料API: http://localhost:${PORT}/api/twitter-profile/dotyyds1234`);
}); 