import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { fileURLToPath } from 'url';

// 在ESM模块中获取__dirname和__filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 代理设置
// const PROXY_HOST = '127.0.0.1';
// const PROXY_PORT = 7890;

// 创建HTTPS代理代理
// const agent = new HttpsProxyAgent(`http://${PROXY_HOST}:${PROXY_PORT}`);

// 添加Axios超时和重试配置
const AXIOS_TIMEOUT = 30000; // 30秒
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000; // 2秒

/**
 * 带重试的Axios请求
 */
async function axiosWithRetry(options, retries = MAX_RETRIES) {
  try {
    // 添加超时配置
    const configWithTimeout = {
      ...options,
      timeout: AXIOS_TIMEOUT
    };
    return await axios(configWithTimeout);
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    // 判断是否是值得重试的错误
    if (error.code === 'ECONNABORTED' || 
        error.code === 'ETIMEDOUT' || 
        !error.response || 
        error.response.status >= 500) {
      console.log(`请求失败，${retries}秒后重试...`, error.message);
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      console.log(`开始第${MAX_RETRIES - retries + 1}次重试...`);
      return axiosWithRetry(options, retries - 1);
    }
    
    // 对于其他错误，直接抛出
    throw error;
  }
}

/**
 * 获取Twitter用户ID
 * @param {string} username - Twitter用户名
 * @returns {Promise<Object>} 包含用户ID和关注数量的对象
 */
async function getUserId(username, headers) {
  // 验证用户名
  if (!username) {
    throw new Error('用户名不能为空');
  }
  
  // 清理用户名 (移除@符号和空格)
  username = username.replace(/^@/, '').trim();
  
  const url = "https://x.com/i/api/graphql/G3KGOASz96M-Qu0nwmGXNg/UserByScreenName";
  
  const variables = {
    screen_name: username,
    withSafetyModeUserFields: true
  };
  
  const features = {
    hidden_profile_likes_enabled: true,
    hidden_profile_subscriptions_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    subscriptions_verification_info_is_identity_verified_enabled: true,
    subscriptions_verification_info_verified_since_enabled: true,
    highlights_tweets_tab_ui_enabled: true,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true
  };

  // 构建请求URL
  const queryParams = new URLSearchParams({
    'variables': JSON.stringify(variables),
    'features': JSON.stringify(features)
  });
  
  // 请求配置
  const options = {
    method: 'GET',
    url: `${url}?${queryParams.toString()}`,
    headers: headers,
    // 添加HTTPS代理支持
    // httpsAgent: agent,
    proxy: false, // 使用httpsAgent替代proxy配置
    validateStatus: status => status < 500 // 允许非500错误状态码通过，以便我们可以检查响应
  };

  try {
    console.log(`正在获取用户 ${username} 的ID...`);
    const response = await axiosWithRetry(options);
    
    // 检查HTML响应
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html') || 
        (typeof response.data === 'string' && response.data.trim().toLowerCase().startsWith('<!doctype'))) {
      console.error('收到HTML响应而非JSON');
      throw new Error('Twitter API返回了HTML页面而不是API数据，可能是身份验证失败');
    }
    
    if (response.data && 
        response.data.data && 
        response.data.data.user && 
        response.data.data.user.result) {
      const userId = response.data.data.user.result.rest_id;
      // 获取关注数量
      const friendsCount = response.data.data.user.result.legacy?.friends_count || 0;
      console.log(`成功获取用户ID: ${userId}, 关注数量: ${friendsCount}`);
      
      return { 
        userId, 
        friendsCount 
      };
    } else {
      throw new Error('未找到用户ID');
    }
  } catch (error) {
    console.error(`获取用户ID失败:`, error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      const contentType = error.response.headers['content-type'] || '';
      if (contentType.includes('text/html')) {
        console.error('收到HTML响应而非JSON');
      }
      console.error('响应数据:', JSON.stringify(error.response.data).substring(0, 200) + '...');
    }
    throw error;
  }
}

/**
 * 获取Twitter用户关注列表
 * @param {string} username - Twitter用户名
 * @param {number} pages - 获取的页数 (默认3页)
 * @param {string} dataDir - 数据保存目录
 * @returns {Promise<Object>} 关注列表数据
 */
async function getFollowingList(username = 'dotyyds1234', pages = 3, dataDir) {
  // 验证用户名
  if (!username) {
    throw new Error('用户名不能为空');
  }
  
  // 清理用户名 (移除@符号和空格)
  username = username.replace(/^@/, '').trim();
  
  // 确保数据目录存在
  if (!dataDir) {
    dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`创建数据目录: ${dataDir}`);
    }
  }
  
  // 请求头
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'sec-ch-ua-platform': '"Windows"',
    'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    'x-csrf-token': '31056c96fe8a0413bc9d0397f308b7adf8a1e11aee8966001d220f3c5ced5fbd71a79d982f1920075c878d72753fdac57b22bf2917b2f92b38a47c02c5819f3e645fd5e00684d97893a91c3360fa6532',
    'x-client-uuid': 'dfd4fd19-9e58-4549-a970-940495c632c5',
    'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
    'x-twitter-client-language': 'zh-cn',
    'sec-ch-ua-mobile': '?0',
    'x-twitter-active-user': 'yes',
    'x-client-transaction-id': 'aJptvDZXYWSDyk1jSoUseAxh3p6p1xvJN96ASK0NO+H4VOQfzxFEuZZ2q3+b/tgtCTwhFmsM331t7jlSGf5ZJ8hDj1Mzaw',
    'x-twitter-auth-type': 'OAuth2Session',
    'content-type': 'application/json',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
    'referer': `https://x.com/${username}`,
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'priority': 'u=1, i',
    'Cookie': 'kdt=mQkD8KTMIJoI3XqBCEQYaQiwT6aF7XBeEDgxKj6u; night_mode=0; amp_669cbf=a71e99d4-fb09-4932-850b-60d990de15bf.YTcxZTk5ZDQtZmIwOS00OTMyLTg1MGItNjBkOTkwZGUxNWJm..1i705f1f9.1i705gbsp.s.2.u; auth_token=8389e38c3707d26e06bb94dd68e12629adc3f473; guest_id=v1%3A173892170788592691; ct0=31056c96fe8a0413bc9d0397f308b7adf8a1e11aee8966001d220f3c5ced5fbd71a79d982f1920075c878d72753fdac57b22bf2917b2f92b38a47c02c5819f3e645fd5e00684d97893a91c3360fa6532; guest_id_ads=v1%3A173892170788592691; guest_id_marketing=v1%3A173892170788592691; twid=u%3D1392861982529753094; first_ref=https%3A%2F%2Fx.com%2FEd_x0101%2Fstatus%2F1888506928260649063; amp_56bf9d=a71e99d4-fb09-4932-850b-60d990de15bf...1iktjrie9.1iktjriec.3g.nk.r4; _monitor_extras={"deviceId":"EJYN9SIBCsHOX2FF5sfwOt","eventId":32,"sequenceNumber":32}; personalization_id="v1_MwlB32Eg8Wz7h9rm3EVzHg=="; external_referer=8e8t2xd8A2w%3D|0|GlWr2u5wzZipnVja1ZbglPkPMjOgQE2KgmAMWWfTCXhp0%2FHSfkOhmd2TJyvExtBNwLZU6CoWvBe32OMU1olhowe8nuP9Vuo9T44u1MtEoy0%3D; lang=zh-cn; amp_69ec37=a71e99d4-fb09-4932-850b-60d990de15bf...1iltjp5cd.1iltmd8vf.j.2f.32'
  };

  try {
    console.log(`开始获取用户 ${username} 的关注列表...`);
    // console.log(`使用HTTPS代理获取用户 ${username} 的关注列表 (代理: ${PROXY_HOST}:${PROXY_PORT})`);
    
    // 获取用户ID
    const userIdData = await getUserId(username, headers);
    if (!userIdData.userId) {
      throw new Error(`无法获取用户 ${username} 的ID`);
    }
    
    // 计算要获取的页数（每页实际为20个，但按50个计算加1以减少页数）
    if (pages <= 0) {
      // 自动计算需要的页数 (按照每页50人计算并加1)
      pages = Math.ceil(userIdData.friendsCount / 50) + 1;
      console.log(`根据关注人数 ${userIdData.friendsCount} 自动计算页数: ${pages}`);
    }
    
    // 执行获取关注列表
    console.log(`开始获取 ${username} (ID: ${userIdData.userId}) 的关注列表, 最多获取${pages}页 (目标关注数: ${userIdData.friendsCount}人)...`);
    
    const allFollowing = [];
    let cursor = '';
    let currentPage = 1;
    let emptyPages = 0;
    const maxEmptyPages = 2;
    
    // 获取多页数据
    while (currentPage <= pages && emptyPages < maxEmptyPages) {
      const url = "https://x.com/i/api/graphql/PgxzDG3JdZLoesQh41mcRw/Following";
      
      // 构建请求参数
      const variables = {
        userId: userIdData.userId,
        count: 20,
        includePromotedContent: false
      };
      
      if (cursor) {
        variables.cursor = cursor;
      }
      
      const features = {
        profile_label_improvements_pcf_label_in_post_enabled: false,
        rweb_tipjar_consumption_enabled: true,
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        creator_subscriptions_tweet_preview_api_enabled: true,
        responsive_web_graphql_timeline_navigation_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        premium_content_api_read_enabled: false,
        communities_web_enable_tweet_community_results_fetch: true,
        c9s_tweet_anatomy_moderator_badge_enabled: true,
        responsive_web_grok_analyze_button_fetch_trends_enabled: false,
        responsive_web_grok_analyze_post_followups_enabled: false,
        responsive_web_grok_share_attachment_enabled: false,
        articles_preview_enabled: true,
        responsive_web_edit_tweet_api_enabled: true,
        graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
        view_counts_everywhere_api_enabled: true,
        longform_notetweets_consumption_enabled: true,
        responsive_web_twitter_article_tweet_consumption_enabled: true,
        tweet_awards_web_tipping_enabled: false,
        creator_subscriptions_quote_tweet_preview_enabled: false,
        freedom_of_speech_not_reach_fetch_enabled: true,
        standardized_nudges_misinfo: true,
        tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
        rweb_video_timestamps_enabled: true,
        longform_notetweets_rich_text_read_enabled: true,
        longform_notetweets_inline_media_enabled: true,
        responsive_web_enhance_cards_enabled: false
      };
      
      // 构建请求URL
      const queryParams = new URLSearchParams({
        'variables': JSON.stringify(variables),
        'features': JSON.stringify(features)
      });
      
      // 请求配置
      const options = {
        method: 'GET',
        url: `${url}?${queryParams.toString()}`,
        headers: headers,
        // httpsAgent: agent,
        proxy: false,
        validateStatus: status => status < 500 // 允许非500错误状态码通过，以便我们可以检查响应
      };
      
      console.log(`获取第 ${currentPage}/${pages} 页关注列表...`);
      const response = await axiosWithRetry(options);
      
      // 检查是否收到了HTML而不是JSON响应
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('text/html') || 
          (typeof response.data === 'string' && response.data.trim().toLowerCase().startsWith('<!doctype'))) {
        // 保存HTML响应以供调试
        const htmlPath = path.join(dataDir, `${username}_html_error.html`);
        fs.writeFileSync(htmlPath, typeof response.data === 'string' ? response.data : JSON.stringify(response.data));
        console.error(`收到HTML响应而非JSON，已保存到: ${htmlPath}`);
        throw new Error(`X.com返回了HTML页面而不是API数据，可能是身份验证问题或IP被暂时限制`);
      }
      
      // 保存原始响应数据用于调试
      if (currentPage === 1) {
        // 仅保存第一页，避免文件过大
        const debugPath = path.join(dataDir, `${username}_debug_response.json`);
        fs.writeFileSync(debugPath, JSON.stringify(response.data, null, 2));
        console.log(`已保存API响应数据到: ${debugPath}`);
      }
      
      if (response.data &&
          response.data.data &&
          response.data.data.user &&
          response.data.data.user.result &&
          response.data.data.user.result.timeline &&
          response.data.data.user.result.timeline.timeline) {
        
        const timeline = response.data.data.user.result.timeline.timeline;
        console.log('成功获取到时间线数据');
        
        // 从指令中提取用户和游标
        if (timeline.instructions && Array.isArray(timeline.instructions)) {
          console.log(`发现 ${timeline.instructions.length} 条指令`);
          
          // 提取用户数据
          const usersInThisPage = [];
          
          // 查找添加条目指令
          const addEntriesInstruction = timeline.instructions.find(
            instr => instr.type === 'TimelineAddEntries'
          );
          
          if (addEntriesInstruction && addEntriesInstruction.entries) {
            console.log(`发现 ${addEntriesInstruction.entries.length} 个条目`);
            
            // 处理条目
            for (const entry of addEntriesInstruction.entries) {
              // 处理用户条目 - 首先尝试常规的用户项目结构
              if (entry.content && 
                  entry.content.itemContent && 
                  entry.content.itemContent.user_results && 
                  entry.content.itemContent.user_results.result) {
                  
                const userData = entry.content.itemContent.user_results.result;
                const legacy = userData.legacy || {};
                
                const user = {
                  id: userData.id_str || userData.rest_id,
                  name: legacy.name || userData.name,
                  username: legacy.screen_name || userData.screen_name,
                  description: legacy.description,
                  avatar: legacy.profile_image_url_https,
                  verified: legacy.verified || false,
                  metrics: {
                    followers: legacy.followers_count || 0,
                    following: legacy.friends_count || 0,
                    tweets: legacy.statuses_count || 0
                  }
                };
                
                usersInThisPage.push(user);
                console.log(`找到用户: ${user.username}`);
              } 
              // 尝试替代路径
              else if (entry.content && 
                       entry.content.entryType === 'TimelineTimelineItem' && 
                       entry.content.itemContent && 
                       entry.content.itemContent.itemType === 'TimelineUser') {
                
                try {
                  const userData = entry.content.itemContent.user_results.result;
                  const legacy = userData.legacy || {};
                  
                  const user = {
                    id: userData.id_str || userData.rest_id,
                    name: legacy.name || userData.name,
                    username: legacy.screen_name || userData.screen_name,
                    description: legacy.description,
                    avatar: legacy.profile_image_url_https,
                    verified: legacy.verified || false,
                    metrics: {
                      followers: legacy.followers_count || 0,
                      following: legacy.friends_count || 0,
                      tweets: legacy.statuses_count || 0
                    }
                  };
                  
                  usersInThisPage.push(user);
                  console.log(`通过备用路径找到用户: ${user.username}`);
                } catch (e) {
                  // 记录第一个条目的结构以帮助调试
                  if (usersInThisPage.length === 0 && currentPage === 1) {
                    const debugPath = path.join(dataDir, `${username}_debug_entry.json`);
                    fs.writeFileSync(debugPath, JSON.stringify(entry, null, 2));
                    console.log(`已保存条目结构到: ${debugPath}`);
                  }
                  console.log(`处理用户条目时出错: ${e.message}`);
                }
              }
              
              // 处理游标条目
              if (entry.content && 
                  entry.content.entryType === 'TimelineTimelineCursor' && 
                  entry.content.cursorType === 'Bottom') {
                
                cursor = entry.content.value;
                console.log(`找到下一页游标: ${cursor}`);
              }
            }
          } else {
            console.log('没有找到添加条目指令或条目为空');
          }
          
          // 处理游标
          const replaceInstruction = timeline.instructions.find(
            instr => instr.type === 'TimelineReplaceEntry'
          );
          
          if (replaceInstruction && 
              replaceInstruction.entry && 
              replaceInstruction.entry.content &&
              replaceInstruction.entry.content.operation &&
              replaceInstruction.entry.content.operation.cursor) {
              
            cursor = replaceInstruction.entry.content.operation.cursor.value;
            console.log(`找到替换指令中的游标: ${cursor}`);
          }
          
          // 添加到总关注列表
          if (usersInThisPage.length > 0) {
            console.log(`第 ${currentPage} 页获取到 ${usersInThisPage.length} 个关注`);
            allFollowing.push(...usersInThisPage);
            emptyPages = 0; // 重置空页面计数
          } else {
            console.log(`第 ${currentPage} 页没有获取到关注`);
            emptyPages++;
            
            // 如果连续空页面过多，提前退出
            if (emptyPages >= maxEmptyPages) {
              console.log(`连续 ${emptyPages} 页没有数据，停止获取`);
              break;
            }
          }
        } else {
          console.log(`响应中没有找到指令数组`);
          emptyPages++;
        }
      } else {
        console.error('无效的Twitter API响应结构');
        emptyPages++;
      }
      
      currentPage++;
      
      // 如果已经没有下一页游标，退出循环
      if (!cursor) {
        console.log('没有更多页面，已获取完全部关注');
        break;
      }
      
      // 每次请求之间延迟，避免触发限制
      if (currentPage <= pages) {
        console.log('等待1秒后获取下一页...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`成功获取用户 ${username} 的关注列表，共 ${allFollowing.length} 个账号`);
    return {
      success: true,
      username: username,
      userId: userIdData.userId,
      total: allFollowing.length,
      accounts: allFollowing
    };
  } catch (error) {
    console.error(`获取用户 ${username} 的关注列表失败:`, error.message);
    
    // 增强错误日志
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应头:', JSON.stringify(error.response.headers));
      
      const contentType = error.response.headers['content-type'] || '';
      if (contentType.includes('text/html')) {
        const htmlPath = path.join(dataDir, `${username}_error_html.html`);
        fs.writeFileSync(htmlPath, error.response.data);
        console.error(`错误响应包含HTML内容，已保存到: ${htmlPath}`);
      } else {
        // 尝试安全地打印响应数据
        try {
          const responsePreview = typeof error.response.data === 'string' 
            ? error.response.data.substring(0, 500) 
            : JSON.stringify(error.response.data).substring(0, 500);
          console.error('响应数据预览:', responsePreview + '...');
        } catch (e) {
          console.error('无法打印响应数据:', e.message);
        }
      }
    } else if (error.request) {
      console.error('请求已发送但未收到响应');
      console.error('请求详情:', JSON.stringify(error.request, null, 2).substring(0, 200) + '...');
    } else {
      console.error('请求配置错误:', error.config || '无配置信息');
    }
    
    return {
      success: false,
      username: username,
      error: error.message,
      errorDetails: {
        time: new Date().toISOString(),
        statusCode: error.response?.status,
        contentType: error.response?.headers?.['content-type'],
        message: error.message
      }
    };
  }
}

// 主函数
async function main() {
  try {
    // 从命令行获取用户名和页数参数
    const username = process.argv[2] || 'dotyyds1234';
    
    // 尝试解析页数参数
    let pages = 0; // 默认为0，表示自动计算
    
    if (process.argv.length > 3) {
      // 检查参数是否包含 --pages= 格式
      const pagesArg = process.argv[3];
      if (pagesArg.startsWith('--pages=')) {
        pages = parseInt(pagesArg.split('=')[1]) || 0;
      } else {
        // 直接作为数字参数
        pages = parseInt(pagesArg) || 0;
      }
    }
    
    console.log(`准备获取用户 ${username} 的关注列表，页数: ${pages === 0 ? '自动计算' : pages}`);
    
    // 创建数据目录
    const dataDir = path.join(__dirname, '..', 'followdata');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`创建数据目录: ${dataDir}`);
    }
    
    // 获取关注列表
    const followingData = await getFollowingList(username, pages, dataDir);
    
    // 保存数据到文件
    const filePath = path.join(dataDir, `${username}_following.json`);
    fs.writeFileSync(filePath, JSON.stringify(followingData, null, 2));
    console.log(`成功保存用户 ${username} 的关注列表到: ${filePath}`);
    
    // 如果成功获取数据，输出简短统计信息
    if (followingData.success) {
      console.log(`用户 ${username} 关注统计:`);
      console.log(`- 总关注数: ${followingData.total}`);
      console.log(`- 已获取数: ${followingData.accounts.length}`);
    }
    
    console.log('操作完成');
  } catch (error) {
    console.error('程序执行失败:', error.message);
  }
}

// 执行主函数
main();

// 导出getFollowingList函数，供其他模块使用
export { getFollowingList }; 