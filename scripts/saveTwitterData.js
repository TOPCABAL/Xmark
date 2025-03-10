import { getUserData } from './getDescription.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// 将exec转换为Promise版本
const execPromise = promisify(exec);

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 生成用户主页HTML
 * @param {Object} userData - 用户简介数据
 * @param {Object} tweetsData - 用户推文数据
 * @returns {string} HTML字符串
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
  
  // 提取推文
  let tweetsHTML = '<div class="tweets-container">';
  
  // 检查推文数据结构
  console.log("解析推文数据...");
  
  if (tweetsData.data?.user?.result?.timeline_v2?.timeline?.instructions) {
    const instructions = tweetsData.data.user.result.timeline_v2.timeline.instructions;
    console.log(`找到 ${instructions.length} 条指令`);
    
    // 首先处理置顶推文
    const pinnedEntry = instructions.find(i => i.type === 'TimelinePinEntry')?.entry;
    if (pinnedEntry) {
      console.log("找到置顶推文");
      const pinnedTweet = pinnedEntry.content?.itemContent?.tweet_results?.result;
      if (pinnedTweet) {
        const tweetUser = pinnedTweet.core?.user_results?.result;
        const tweetLegacy = pinnedTweet.legacy || {};
        
        const tweetText = tweetLegacy.full_text || '';
        const createdAt = new Date(tweetLegacy.created_at).toLocaleString();
        const retweetCount = tweetLegacy.retweet_count || 0;
        const favoriteCount = tweetLegacy.favorite_count || 0;
        const replyCount = tweetLegacy.reply_count || 0;
        
        // 处理媒体
        let mediaHTML = '';
        if (tweetLegacy.entities?.media?.length > 0) {
          mediaHTML = '<div class="tweet-media">';
          for (const media of tweetLegacy.entities.media) {
            if (media.type === 'photo') {
              mediaHTML += `<img src="${media.media_url_https}" alt="推文图片" class="tweet-image">`;
            } else if (media.type === 'video') {
              mediaHTML += `<video controls src="${media.video_info?.variants[0]?.url}" class="tweet-video"></video>`;
            }
          }
          mediaHTML += '</div>';
        }
        
        tweetsHTML += `
          <div class="tweet pinned-tweet">
            <div class="pinned-label"><i class="fas fa-thumbtack"></i> 置顶推文</div>
            <div class="tweet-header">
              <img src="${profileImageUrl}" alt="${name}" class="tweet-avatar">
              <div class="tweet-user-info">
                <span class="tweet-name">${name}</span>
                <span class="tweet-username">@${screenName}</span>
                <span class="tweet-date">${createdAt}</span>
              </div>
            </div>
            <div class="tweet-content">
              <p>${tweetText}</p>
              ${mediaHTML}
            </div>
            <div class="tweet-stats">
              <span class="tweet-replies"><i class="fa fa-comment"></i> ${replyCount}</span>
              <span class="tweet-retweets"><i class="fa fa-retweet"></i> ${retweetCount}</span>
              <span class="tweet-likes"><i class="fa fa-heart"></i> ${favoriteCount}</span>
            </div>
          </div>
        `;
      }
    }
    
    // 然后处理普通推文
    const entriesInstruction = instructions.find(i => i.type === 'TimelineAddEntries');
    if (entriesInstruction && entriesInstruction.entries) {
      const entries = entriesInstruction.entries;
      console.log(`找到 ${entries.length} 条数据项`);
      
      // 过滤出推文条目
      const tweetEntries = entries.filter(e => 
        e.content?.itemContent?.tweet_results?.result &&
        e.content.itemContent.itemType === 'TimelineTweet'
      );
      
      console.log(`其中包含 ${tweetEntries.length} 条推文`);
      
      // 生成推文HTML
      for (const entry of tweetEntries) {
        const tweet = entry.content.itemContent.tweet_results.result;
        const tweetUser = tweet.core?.user_results?.result;
        const tweetLegacy = tweet.legacy || {};
        
        const tweetText = tweetLegacy.full_text || '';
        const createdAt = new Date(tweetLegacy.created_at).toLocaleString();
        const retweetCount = tweetLegacy.retweet_count || 0;
        const favoriteCount = tweetLegacy.favorite_count || 0;
        const replyCount = tweetLegacy.reply_count || 0;
        
        // 处理媒体
        let mediaHTML = '';
        if (tweetLegacy.entities?.media?.length > 0) {
          mediaHTML = '<div class="tweet-media">';
          for (const media of tweetLegacy.entities.media) {
            if (media.type === 'photo') {
              mediaHTML += `<img src="${media.media_url_https}" alt="推文图片" class="tweet-image">`;
            } else if (media.type === 'video') {
              mediaHTML += `<video controls src="${media.video_info?.variants[0]?.url}" class="tweet-video"></video>`;
            }
          }
          mediaHTML += '</div>';
        }
        
        tweetsHTML += `
          <div class="tweet">
            <div class="tweet-header">
              <img src="${profileImageUrl}" alt="${name}" class="tweet-avatar">
              <div class="tweet-user-info">
                <span class="tweet-name">${name}</span>
                <span class="tweet-username">@${screenName}</span>
                <span class="tweet-date">${createdAt}</span>
              </div>
            </div>
            <div class="tweet-content">
              <p>${tweetText}</p>
              ${mediaHTML}
            </div>
            <div class="tweet-stats">
              <span class="tweet-replies"><i class="fa fa-comment"></i> ${replyCount}</span>
              <span class="tweet-retweets"><i class="fa fa-retweet"></i> ${retweetCount}</span>
              <span class="tweet-likes"><i class="fa fa-heart"></i> ${favoriteCount}</span>
            </div>
          </div>
        `;
      }
    }
  } else {
    console.log("未找到推文数据或数据结构不符合预期");
    tweetsHTML += '<div class="no-tweets">未找到推文</div>';
  }
  
  tweetsHTML += '</div>';
  
  // 生成完整HTML
  return `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} (@${screenName}) / X</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: #f7f9fa;
        color: #0f1419;
        line-height: 1.5;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: white;
        border-left: 1px solid #eff3f4;
        border-right: 1px solid #eff3f4;
      }
      .profile-banner {
        width: 100%;
        height: 200px;
        background-image: url('${bannerUrl}');
        background-size: cover;
        background-position: center;
      }
      .profile-info {
        padding: 20px;
        border-bottom: 1px solid #eff3f4;
        position: relative;
      }
      .profile-avatar {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        border: 4px solid white;
        position: absolute;
        top: -60px;
        left: 20px;
      }
      .profile-details {
        margin-top: 60px;
      }
      .profile-name {
        font-size: 20px;
        font-weight: bold;
      }
      .profile-username {
        font-size: 15px;
        color: #536471;
        margin-bottom: 12px;
      }
      .profile-bio {
        margin-bottom: 12px;
      }
      .profile-meta {
        display: flex;
        gap: 20px;
        color: #536471;
        font-size: 14px;
        margin-bottom: 12px;
      }
      .profile-stats {
        display: flex;
        gap: 20px;
        margin-top: 12px;
      }
      .stat-value {
        font-weight: bold;
        color: #0f1419;
      }
      .stat-label {
        color: #536471;
      }
      .tweets-container {
        padding: 0;
      }
      .tweet {
        padding: 15px;
        border-bottom: 1px solid #eff3f4;
      }
      .pinned-tweet {
        background-color: #f7f9fa;
      }
      .pinned-label {
        font-size: 13px;
        color: #536471;
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
        display: flex;
        flex-direction: column;
      }
      .tweet-name {
        font-weight: bold;
      }
      .tweet-username, .tweet-date {
        color: #536471;
        font-size: 14px;
      }
      .tweet-content {
        margin-bottom: 10px;
      }
      .tweet-media {
        margin-top: 10px;
        border-radius: 16px;
        overflow: hidden;
      }
      .tweet-image, .tweet-video {
        max-width: 100%;
        border-radius: 16px;
      }
      .tweet-stats {
        display: flex;
        gap: 20px;
        color: #536471;
        font-size: 14px;
      }
      .no-tweets {
        padding: 20px;
        text-align: center;
        color: #536471;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="profile-banner"></div>
      <div class="profile-info">
        <img src="${profileImageUrl}" alt="${name}" class="profile-avatar">
        <div class="profile-details">
          <h1 class="profile-name">${name}</h1>
          <div class="profile-username">@${screenName}</div>
          <div class="profile-bio">${description}</div>
          <div class="profile-meta">
            ${location ? `<div><i class="fas fa-map-marker-alt"></i> ${location}</div>` : ''}
            ${url ? `<div><i class="fas fa-link"></i> <a href="${url}" target="_blank">${url}</a></div>` : ''}
          </div>
          <div class="profile-stats">
            <div class="stat">
              <span class="stat-value">${followersCount}</span>
              <span class="stat-label">关注者</span>
            </div>
            <div class="stat">
              <span class="stat-value">${friendsCount}</span>
              <span class="stat-label">正在关注</span>
            </div>
          </div>
        </div>
      </div>
      ${tweetsHTML}
    </div>
  </body>
  </html>
  `;
}

/**
 * 保存用户主页数据
 * @param {string} username - Twitter用户名
 */
async function saveTwitterProfile(username) {
  try {
    console.log(`开始获取用户 ${username} 的主页数据...`);
    
    // 创建用户数据目录
    const userDataDir = path.join(__dirname, '..', 'src', 'data', username);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
      console.log(`创建用户数据目录: ${userDataDir}`);
    }
    
    // 1. 获取用户简介数据
    console.log(`获取用户 ${username} 的简介数据...`);
    const userData = await getUserData(username);
    
    // 保存用户简介数据到src/data目录
    const userProfilePath = path.join(userDataDir, 'profile.json');
    fs.writeFileSync(userProfilePath, JSON.stringify(userData, null, 2));
    console.log(`保存用户简介数据到: ${userProfilePath}`);
    
    // 2. 从用户数据中提取用户ID
    const userId = userData.data.user.result.rest_id;
    console.log(`获取到用户ID: ${userId}`);
    
    // 3. 使用用户ID获取推文数据
    console.log(`获取用户 ${username} 的推文数据...`);
    
    // 调用originTweets.js脚本获取推文数据
    const originTweetsPath = path.join(__dirname, '..', 'originTweets.js');
    const tweetsJsonPath = path.join(userDataDir, 'tweets.json');
    
    // 检查是否已存在推文数据文件
    let tweetsData;
    if (!fs.existsSync(tweetsJsonPath)) {
      console.log(`执行originTweets.js获取推文数据...`);
      
      // 执行originTweets.js脚本，并传递用户ID和输出目录
      await execPromise(`node ${originTweetsPath} ${userId} "${userDataDir}"`);
      
      // 读取生成的推文数据
      tweetsData = JSON.parse(fs.readFileSync(tweetsJsonPath, 'utf8'));
    } else {
      console.log(`已存在推文数据文件: ${tweetsJsonPath}`);
      tweetsData = JSON.parse(fs.readFileSync(tweetsJsonPath, 'utf8'));
    }
    
    // 4. 生成HTML
    console.log(`生成用户 ${username} 的主页HTML...`);
    const html = generateHTML(userData, tweetsData);
    
    // 5. 保存HTML文件
    const htmlFilePath = path.join(userDataDir, 'profile.html');
    fs.writeFileSync(htmlFilePath, html);
    
    console.log(`成功保存用户 ${username} 的主页数据到: ${htmlFilePath}`);
    return htmlFilePath;
  } catch (error) {
    console.error(`保存用户 ${username} 的主页数据失败:`, error.message);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    // 从命令行获取用户名，没有则使用默认值
    const username = process.argv[2] || 'dotyyds1234';
    
    console.log(`开始处理用户: ${username}`);
    const filePath = await saveTwitterProfile(username);
    
    console.log(`操作完成，已生成HTML文件: ${filePath}`);
  } catch (error) {
    console.error('程序执行失败:', error.message);
    process.exit(1);
  }
}

// 执行主函数
main();
