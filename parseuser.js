import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取JSON文件
function parseUserJson(filePath) {
    try {
        // 读取文件
        const rawData = fs.readFileSync(filePath, 'utf8');
        
        // 解析JSON
        const userData = JSON.parse(rawData);
        
        // 提取有用的信息
        const extractedData = extractUserInfo(userData);
        
        // 尝试读取description.json (如果存在)
        try {
            const descriptionPath = path.resolve(__dirname, 'description.json');
            if (fs.existsSync(descriptionPath)) {
                console.log('正在解析用户描述文件...');
                const descriptionData = JSON.parse(fs.readFileSync(descriptionPath, 'utf8'));
                
                // 更新用户信息
                const profileInfo = extractProfileInfo(descriptionData);
                if (profileInfo) {
                    extractedData.user = {
                        ...extractedData.user,
                        ...profileInfo
                    };
                }
            }
        } catch (descError) {
            console.error('解析用户描述文件出错:', descError.message);
        }
        
        // 输出提取的信息
        console.log('提取的用户信息:');
        console.log(JSON.stringify(extractedData, null, 2));
        
        // 保存解析后的数据为JSON文件
        const jsonOutputPath = path.resolve(__dirname, 'userData.json');
        fs.writeFileSync(jsonOutputPath, JSON.stringify(extractedData, null, 2));
        console.log(`解析后的JSON数据已保存到: ${jsonOutputPath}`);
        
        // 生成HTML并保存
        generateHtml(extractedData);
        
        return extractedData;
    } catch (error) {
        console.error('解析用户数据时出错:', error.message);
        return null;
    }
}

// 从description.json文件中提取个人资料信息
function extractProfileInfo(descriptionData) {
    try {
        if (descriptionData && 
            descriptionData.data && 
            descriptionData.data.user && 
            descriptionData.data.user.result) {
            
            const userResult = descriptionData.data.user.result;
            
            if (userResult.legacy) {
                return {
                    id: userResult.rest_id || '',
                    screenName: userResult.legacy.screen_name || '',
                    name: userResult.legacy.name || '',
                    description: userResult.legacy.description || '',
                    followersCount: userResult.legacy.followers_count || 0,
                    friendsCount: userResult.legacy.friends_count || 0,
                    favouritesCount: userResult.legacy.favourites_count || 0,
                    statusesCount: userResult.legacy.statuses_count || 0,
                    createdAt: userResult.legacy.created_at || '',
                    profileImageUrl: userResult.legacy.profile_image_url_https || '',
                    isBlueVerified: userResult.is_blue_verified || false,
                    isVerified: userResult.legacy.verified || false,
                    location: userResult.legacy.location || '',
                    pinnedTweetIds: userResult.legacy.pinned_tweet_ids_str || []
                };
            }
        }
        return null;
    } catch (error) {
        console.error('提取个人资料信息出错:', error.message);
        return null;
    }
}

// 从复杂的JSON结构中提取有用信息
function extractUserInfo(userData) {
    try {
        const result = {
            user: {},
            tweets: [],
            timeline: {
                cursors: []
            }
        };
        
        // 提取用户基本信息
        if (userData && userData.data && userData.data.user && userData.data.user.result) {
            const userResult = userData.data.user.result;
            
            if (userResult.legacy) {
                result.user = {
                    id: userResult.rest_id || userResult.id_str || '',
                    screenName: userResult.legacy.screen_name || '',
                    name: userResult.legacy.name || '',
                    description: userResult.legacy.description || '',
                    followersCount: userResult.legacy.followers_count || 0,
                    friendsCount: userResult.legacy.friends_count || 0,
                    statusesCount: userResult.legacy.statuses_count || 0,
                    profileImageUrl: userResult.legacy.profile_image_url_https || ''
                };
            }
        }
        
        // 递归查找所有推文
        result.tweets = findTweets(userData);
        
        // 提取时间线游标
        const cursors = findCursors(userData);
        if (cursors.length > 0) {
            result.timeline.cursors = cursors;
        }
        
        return result;
    } catch (error) {
        console.error('提取用户信息时出错:', error.message);
        return { error: error.message };
    }
}

// 递归查找所有推文
function findTweets(obj, results = []) {
    if (!obj || typeof obj !== 'object') return results;
    
    // 查找推文对象
    if (obj.entryType === 'TimelineTimelineItem' || 
        obj.__typename === 'TimelineTimelineItem') {
        
        // 检查是否包含推文内容
        if (obj.itemContent && 
            (obj.itemContent.tweet_results || obj.itemContent.tweetResults)) {
            
            const tweetResult = obj.itemContent.tweet_results || obj.itemContent.tweetResults;
            
            if (tweetResult && tweetResult.result) {
                const tweet = tweetResult.result;
                
                // 提取推文信息
                const tweetInfo = extractTweetInfo(tweet);
                if (tweetInfo) {
                    results.push(tweetInfo);
                }
            }
        }
    }
    
    // 检查timeline_module类型的条目
    if ((obj.entryType === 'TimelineTimelineModule' || 
         obj.__typename === 'TimelineTimelineModule') && 
        obj.items && Array.isArray(obj.items)) {
        
        // 处理模块中的每个项目
        obj.items.forEach(item => findTweets(item, results));
    }
    
    // 递归遍历所有对象和数组
    if (Array.isArray(obj)) {
        obj.forEach(item => findTweets(item, results));
    } else {
        Object.values(obj).forEach(val => {
            if (val && typeof val === 'object') {
                findTweets(val, results);
            }
        });
    }
    
    return results;
}

// 提取推文信息
function extractTweetInfo(tweet) {
    try {
        // 检查不同可能的推文结构
        let legacy = null;
        
        if (tweet.legacy) {
            legacy = tweet.legacy;
        } else if (tweet.tweet && tweet.tweet.legacy) {
            legacy = tweet.tweet.legacy;
        } else if (tweet.core && tweet.core.user_results && 
                  tweet.core.user_results.result && 
                  tweet.core.user_results.result.legacy) {
            // 用于处理可能的嵌套结构
        }
        
        if (!legacy) return null;
        
        // 提取媒体信息
        const media = [];
        if (legacy.entities && legacy.entities.media && Array.isArray(legacy.entities.media)) {
            legacy.entities.media.forEach(m => {
                media.push({
                    type: m.type,
                    url: m.media_url_https,
                    display_url: m.display_url
                });
            });
        }
        
        // 提取扩展媒体
        if (legacy.extended_entities && legacy.extended_entities.media && 
            Array.isArray(legacy.extended_entities.media)) {
            
            legacy.extended_entities.media.forEach(m => {
                // 检查是否已添加此媒体
                const exists = media.some(existing => existing.url === m.media_url_https);
                
                if (!exists) {
                    media.push({
                        type: m.type,
                        url: m.media_url_https,
                        display_url: m.display_url,
                        video_info: m.video_info
                    });
                }
            });
        }
        
        return {
            id: legacy.id_str,
            created_at: legacy.created_at,
            full_text: legacy.full_text,
            retweet_count: legacy.retweet_count,
            favorite_count: legacy.favorite_count,
            reply_count: legacy.reply_count,
            quote_count: legacy.quote_count,
            media: media,
            user: {
                id: tweet.core && tweet.core.user_results && 
                    tweet.core.user_results.result ? 
                    tweet.core.user_results.result.rest_id : null,
                screen_name: tweet.core && tweet.core.user_results && 
                            tweet.core.user_results.result && 
                            tweet.core.user_results.result.legacy ? 
                            tweet.core.user_results.result.legacy.screen_name : null,
                name: tweet.core && tweet.core.user_results && 
                     tweet.core.user_results.result && 
                     tweet.core.user_results.result.legacy ? 
                     tweet.core.user_results.result.legacy.name : null
            }
        };
    } catch (error) {
        console.error('提取推文信息时出错:', error.message);
        return null;
    }
}

// 递归查找所有游标
function findCursors(obj, results = []) {
    if (!obj || typeof obj !== 'object') return results;
    
    // 如果找到游标对象
    if (obj.entryType === 'TimelineTimelineCursor' && 
        obj.__typename === 'TimelineTimelineCursor' && 
        obj.value && obj.cursorType) {
        
        results.push({
            value: obj.value,
            cursorType: obj.cursorType
        });
    }
    
    // 递归遍历所有对象和数组
    if (Array.isArray(obj)) {
        obj.forEach(item => findCursors(item, results));
    } else {
        Object.values(obj).forEach(val => {
            if (val && typeof val === 'object') {
                findCursors(val, results);
            }
        });
    }
    
    return results;
}

// 生成HTML并保存
function generateHtml(data) {
    const htmlPath = path.resolve(__dirname, 'user_data.html');
    
    let htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>用户数据</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        .user-info {
            background-color: #f5f8fa;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .user-info img {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            margin-right: 15px;
            float: left;
        }
        .user-header {
            display: flex;
            align-items: center;
        }
        .verified-badge {
            display: inline-block;
            width: 18px;
            height: 18px;
            background-color: #1da1f2;
            border-radius: 50%;
            margin-left: 5px;
            position: relative;
        }
        .verified-badge:after {
            content: "✓";
            color: white;
            position: absolute;
            font-size: 12px;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        .user-info h1 {
            margin-top: 0;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
        }
        .user-info p {
            margin: 5px 0;
            color: #657786;
        }
        .user-desc {
            clear: both;
            padding-top: 15px;
        }
        .user-meta {
            color: #657786;
            font-size: 0.9em;
            margin-top: 10px;
        }
        .user-meta span {
            margin-right: 15px;
        }
        .user-stats {
            clear: both;
            padding-top: 15px;
            display: flex;
            gap: 20px;
        }
        .user-stats div {
            flex: 1;
        }
        .tweet {
            background-color: white;
            border: 1px solid #e1e8ed;
            border-radius: 15px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .tweet-header {
            margin-bottom: 10px;
            font-weight: bold;
        }
        .tweet-text {
            margin-bottom: 10px;
        }
        .tweet-media {
            margin: 10px 0;
        }
        .tweet-media img, .tweet-media video {
            max-width: 100%;
            max-height: 400px;
            border-radius: 10px;
            margin-top: 10px;
        }
        .tweet-stats {
            color: #657786;
            display: flex;
            gap: 15px;
        }
        .tweet-date {
            color: #657786;
            font-size: 0.9em;
        }
        .no-tweets {
            text-align: center;
            padding: 40px;
            color: #657786;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="user-info">
`;

    // 添加用户信息
    if (data.user && data.user.name) {
        const verifiedBadge = data.user.isBlueVerified || data.user.isVerified ? 
            '<span class="verified-badge"></span>' : '';
        
        // 格式化创建日期
        let joinDate = '';
        if (data.user.createdAt) {
            const date = new Date(data.user.createdAt);
            joinDate = date.toLocaleString('zh-CN', { year: 'numeric', month: 'long' });
        }
        
        htmlContent += `
        <div class="user-header">
            <img src="${data.user.profileImageUrl || ''}" alt="${data.user.name}">
            <div>
                <h1>${data.user.name} ${verifiedBadge}</h1>
                <p>@${data.user.screenName}</p>
            </div>
        </div>
        
        <div class="user-desc">
            <p>${data.user.description || ''}</p>
            
            <div class="user-meta">
                ${data.user.location ? `<span>📍 ${data.user.location}</span>` : ''}
                ${joinDate ? `<span>🗓️ ${joinDate}加入</span>` : ''}
            </div>
            
            <div class="user-stats">
                <div>关注: ${data.user.friendsCount || 0}</div>
                <div>粉丝: ${data.user.followersCount || 0}</div>
                <div>推文: ${data.user.statusesCount || 0}</div>
                ${data.user.favouritesCount ? `<div>喜欢: ${data.user.favouritesCount}</div>` : ''}
            </div>
        </div>
    </div>
`;
    } else {
        htmlContent += `
        <h1>用户信息</h1>
        <p>未能解析到用户基本信息</p>
    </div>
`;
    }

    // 添加推文
    if (data.tweets && data.tweets.length > 0) {
        htmlContent += `
    <h2>推文 (${data.tweets.length})</h2>
`;

        // 为每条推文创建HTML
        data.tweets.forEach(tweet => {
            const date = new Date(tweet.created_at);
            const formattedDate = date.toLocaleString('zh-CN');
            
            htmlContent += `
    <div class="tweet">
        <div class="tweet-header">
            ${tweet.user.name ? tweet.user.name : ''} 
            ${tweet.user.screen_name ? `(@${tweet.user.screen_name})` : ''}
        </div>
        <div class="tweet-text">${tweet.full_text.replace(/\n/g, '<br>')}</div>
`;

            // 添加媒体
            if (tweet.media && tweet.media.length > 0) {
                htmlContent += `        <div class="tweet-media">`;
                
                tweet.media.forEach(media => {
                    if (media.type === 'photo') {
                        htmlContent += `
            <img src="${media.url}" alt="图片">`;
                    } else if (media.type === 'video' && media.video_info) {
                        // 尝试查找最高质量的视频URL
                        let videoUrl = '';
                        if (media.video_info.variants && media.video_info.variants.length > 0) {
                            const mp4Variants = media.video_info.variants.filter(v => v.content_type === 'video/mp4');
                            if (mp4Variants.length > 0) {
                                // 按比特率排序，获取最高质量
                                mp4Variants.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                                videoUrl = mp4Variants[0].url;
                            }
                        }
                        
                        if (videoUrl) {
                            htmlContent += `
            <video controls>
                <source src="${videoUrl}" type="video/mp4">
                您的浏览器不支持视频标签
            </video>`;
                        }
                    }
                });
                
                htmlContent += `
        </div>`;
            }

            // 添加统计
            htmlContent += `
        <div class="tweet-stats">
            <span>回复: ${tweet.reply_count || 0}</span>
            <span>转发: ${tweet.retweet_count || 0}</span>
            <span>引用: ${tweet.quote_count || 0}</span>
            <span>喜欢: ${tweet.favorite_count || 0}</span>
        </div>
        <div class="tweet-date">${formattedDate}</div>
    </div>
`;
        });
    } else {
        htmlContent += `
    <div class="no-tweets">
        <h2>没有找到推文</h2>
        <p>请检查JSON数据格式或尝试其他解析方法</p>
    </div>
`;
    }

    // 完成HTML
    htmlContent += `
</body>
</html>
`;

    // 写入HTML文件
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`HTML已生成: ${htmlPath}`);
}

// 主函数
function main() {
    const filePath = path.resolve(__dirname, 'User.json');
    
    console.log(`正在解析文件: ${filePath}`);
    const userData = parseUserJson(filePath);
    
    if (userData) {
        console.log('解析完成!');
    } else {
        console.log('解析失败!');
    }
}

// 执行主函数
main();
