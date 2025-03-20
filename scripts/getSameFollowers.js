import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 在ESM模块中获取__dirname
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

// 日志函数
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  if (level === 'error') {
    console.error(`[${timestamp}] [ERROR] ${message}`);
  } else {
    console.log(`[${timestamp}] [INFO] ${message}`);
  }
}

/**
 * 获取Twitter用户ID
 * @param {string} username - Twitter用户名
 * @returns {Promise<string>} 用户ID
 */
async function getUserId(username) {
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
  
  // 请求配置
  const options = {
    method: 'GET',
    url: `${url}?${queryParams.toString()}`,
    headers: headers,
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
      console.log(`成功获取用户ID: ${userId}`);
      return userId;
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
    }
    throw error;
  }
}

/**
 * 获取用户真实的共同关注数量
 * @param {string} userId - 用户ID
 * @returns {Promise<number>} - 共同关注数量
 */
async function getMutualFollowerCount(userId) {
  // 构建URL，使用模板字符串替代Python的f-string
  const url = `https://pro.x.com/i/api/1.1/friends/following/list.json?user_id=${userId}&count=3&with_total_count=true`;
  
  // 请求头
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
    'Accept-Encoding': 'gzip',
    'sec-ch-ua-platform': '"Windows"',
    'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAAFQODgEAAAAAVHTp76lzh3rFzcHbmHVvQxYYpTw%3DckAlMINMjmCwxUcaXbAN4XqJVdgMJaHqNOFgPMK0zN1qLqLQCF',
    'x-csrf-token': '360f7e4c9c5692734d81fc830ddc0872cbb2ae19e8d24d826f197bbcde8f6a6bb340195dd64521161bf5e90e6e0efedb614585701ecb4f5e97eff597029562d5cf85c89e7c9a801483d2ad959fbf59fe',
    'sec-ch-ua': '"Chromium";v="130", "Microsoft Edge";v="130", "Not?A_Brand";v="99"',
    'x-twitter-client-language': 'zh-cn',
    'sec-ch-ua-mobile': '?0',
    'x-twitter-active-user': 'yes',
    'x-twitter-auth-type': 'OAuth2Session',
    'content-type': 'application/json',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'priority': 'u=1, i',
    'Cookie': '_monitor_extras={\"deviceId\":\"tx5f4AddIhAiP7ZKJXTL95\",\"eventId\":2,\"sequenceNumber\":2}; lang=en; guest_id=v1%3A173423373458271509; guest_id_marketing=v1%3A173423373458271509; guest_id_ads=v1%3A173423373458271509; kdt=6CQQu8MZEWKHmkUtg18FieBz9iZtFIfh2P8xDw4k; auth_token=44f3eb7825cf9acd31958dacda2bb2ff6cc2c70e; ct0=360f7e4c9c5692734d81fc830ddc0872cbb2ae19e8d24d826f197bbcde8f6a6bb340195dd64521161bf5e90e6e0efedb614585701ecb4f5e97eff597029562d5cf85c89e7c9a801483d2ad959fbf59fe; twid=u%3D1641735350577168384; personalization_id=\"v1_UJnoALZB1ugiCWExU5qhdg==\"; night_mode=0; _twitter_sess=BAh7CSIKZmxhc2hJQzonQWN0aW9uQ29udHJvbGxlcjo6Rmxhc2g6OkZsYXNoHsABjoKQHVzZWR7ADoPY3JlYXRlZF9hdGwrCIodo9WUAToMY3NyZl9pZCIlMjIxMmM2YzVmMTdhMjJkYjc5OTgyNTRlZGU5NDQ4MTI6B2lkIiVlYzM3YjgyOGE4NTAxMWJlMzAwZDJiOGUzMmI0ODQ4MA%3D%3D--015d9d58ef3cae5e39af46e3cdeaacbcd44ed243; first_ref=https%3A%2F%2Fpro.xxyy.io%2F; amp_56bf9d=28d8c263-3142-4002-b315-87d7d4a9dc05...1ikn8ecoi.1ikn9piln.3u.1rg.1ve; ok_global={\"_expire\":{}}; ok_default={\"_expire\":{}}; ok_okg={\"_expire\":{},\"currentMedia\":\"lg\"}; external_referer=padhuUp37zj8BsK%2BMhryGM91JgorFWmA|0|8e8t2xd8A2w%3D; amp_69ec37=28d8c263-3142-4002-b315-87d7d4a9dc05...1ilhiepkl.1ilhjou96.f.49.4o'
  };

  try {
    // 定义获取关注者的函数
    async function fetchFollowers() {
      // 请求配置
      const options = {
        method: 'GET',
        url: url,
        headers: headers,
        // httpsAgent: agent,
        proxy: false, // 使用httpsAgent替代proxy配置
        validateStatus: status => status < 500 // 允许非500错误状态码通过，以便我们可以检查响应
      };
      
      console.log(`正在获取用户 ${userId} 的共同关注数量...`);
      const response = await axiosWithRetry(options);
      
      if (response.status !== 200) {
        log(`获取共同关注失败，状态码: ${response.status}`, "error");
        log(`响应内容: ${response.data.toString().substring(0, 500)}`, "error");
        return 0;
      }
      
      // 检查HTML响应
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('text/html') || 
          (typeof response.data === 'string' && response.data.trim().toLowerCase().startsWith('<!doctype'))) {
        log('收到HTML响应而非JSON', "error");
        throw new Error('Twitter API返回了HTML页面而不是API数据，可能是身份验证失败');
      }
      
      const data = response.data;
      return data.total_count || 0;
    }
    
    // 使用重试机制获取共同关注数量
    return await fetchFollowers();
  } catch (error) {
    log(`获取共同关注数量时出错: ${error.message}`, "error");
    return 0;
  }
}

/**
 * 获取用户的共同关注者列表
 * @param {string} userId - 用户ID
 * @param {string} username - 用户名，用于保存文件
 * @param {number} count - 获取数量
 * @param {number} realTotal - 实际的共同关注者总数
 * @returns {Promise<Object>} - 共同关注者列表数据
 */
async function getSameFollowers(userId, username, count, realTotal) {
  // 确保数据目录存在
  const dataDir = path.join(__dirname, '..', 'src', 'data', username);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`创建数据目录: ${dataDir}`);
  }

  // 构建GraphQL查询参数
  const variables = {
    userId: userId,
    count: count,
    includePromotedContent: false
  };

  // 特性参数
  const features = {
    rweb_video_screen_enabled: false,
    profile_label_improvements_pcf_label_in_post_enabled: true,
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
    responsive_web_grok_analyze_post_followups_enabled: true,
    responsive_web_jetfuel_frame: false,
    responsive_web_grok_share_attachment_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    responsive_web_grok_analysis_button_from_backend: false,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    rweb_video_timestamps_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_grok_image_annotation_enabled: false,
    responsive_web_enhance_cards_enabled: false
  };

  // 构建URL和参数
  const url = `https://x.com/i/api/graphql/fBXCnpBOd1IBIHClx05JtQ/FollowersYouKnow`;
  const queryParams = new URLSearchParams({
    'variables': JSON.stringify(variables),
    'features': JSON.stringify(features)
  });

  // 请求头
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'sec-ch-ua-platform': '"macOS"',
    'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    'x-csrf-token': 'ef029dba39c6d1441a39ac8576288b8ca64f8412bde78d51f3f57288d02ebac1b645e8fa12c03cde8d5eca6b3dc12aed74890cff47c4b3f425b865cc5b08848bef4bb8e6e6b5c4398e0847b7776a82c0',
    'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
    'x-twitter-client-language': 'zh-cn',
    'sec-ch-ua-mobile': '?0',
    'x-twitter-active-user': 'yes',
    'x-client-transaction-id': 'SKucvDRHqZsjnNkVi7Jx8lm97P1n/iHTWa97+Vtb3hH4Ye0wx1X2LbOusuX5EPNwG7dOzks62SsE9tm/JNrWwmzjIY3KSw',
    'x-twitter-auth-type': 'OAuth2Session',
    'content-type': 'application/json',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
    'referer': 'https://x.com/btc_798/followers_you_follow',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'priority': 'u=1, i',
    'Cookie': 'ok_okg={"_expire":{},"currentMedia":"xl"}; ok_global={"_expire":{}}; ok_default={"_expire":{}}; _ga=GA1.2.296205465.1715928334; kdt=E2jiFRkO7qX4oZPggnagmClGyvmrwwShTYD90M9F; night_mode=0; _monitor_extras={"deviceId":"pvyGSlrpeG-FZrLU7XM_J1","eventId":4,"sequenceNumber":4}; personalization_id="v1_na8DE0PzkDw2ZXZb/pzmew=="; first_ref=https%3A%2F%2Fx.com%2FOnefly_eth%2Fstatus%2F1881025178811171130; intercom-device-id-jgtierkz=f6d46c50-eae2-4f37-b32f-4702df09b8dd; amp_56bf9d=35407170-6e66-497b-8a50-56055d8bb747...1ikrqoh3f.1ikrqpjps.22.6g.8i; lang=zh-cn; ok_global={"_expire":{}}; ok_default={"_expire":{}}; ok_okg={"_expire":{},"currentMedia":"xl"}; __cf_bm=goi0HOjiBw.gx27fPFNYMKBJfM43vLq.ANGVGIjLTZU-1742039283-1.0.1.1-vxV1mb8ZXewFVAqDnPSpIrug5fxDQ8bwuG6TCPfjwjNFzcjOovLKDHzg4XjIgnI.rZ9v0rLnyKgM7RJjhu5XGkjkAYDxcu_MgR0CIFbGBiQ; dnt=1; auth_multi="1392861982529753094:ee366c06640a2654fb2c2c9cc75ff9f618f60066"; auth_token=918d1d2af942ae4225f379d6e1152614c19951b1; guest_id_ads=v1%3A174203959719715648; guest_id_marketing=v1%3A174203959719715648; guest_id=v1%3A174203959719715648; twid=u%3D1479620132616163331; ct0=ef029dba39c6d1441a39ac8576288b8ca64f8412bde78d51f3f57288d02ebac1b645e8fa12c03cde8d5eca6b3dc12aed74890cff47c4b3f425b865cc5b08848bef4bb8e6e6b5c4398e0847b7776a82c0; amp_69ec37=35407170-6e66-497b-8a50-56055d8bb747...1imcpbrs5.1imcqdmk1.b.b.m'
  };

  try {
    // 请求配置
    const options = {
      method: 'GET',
      url: `${url}?${queryParams.toString()}`,
      headers: headers,
      // httpsAgent: agent,
      proxy: false,
      validateStatus: status => status < 500
    };

    console.log(`正在获取用户 ${userId} 的共同关注者列表...`);
    const response = await axiosWithRetry(options);

    if (response.status !== 200) {
      log(`获取共同关注者列表失败，状态码: ${response.status}`, "error");
      log(`响应内容: ${response.data.toString().substring(0, 500)}`, "error");
      throw new Error(`获取共同关注者列表失败，状态码: ${response.status}`);
    }

    // 检查HTML响应
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html') || 
        (typeof response.data === 'string' && response.data.trim().toLowerCase().startsWith('<!doctype'))) {
      log('收到HTML响应而非JSON', "error");
      throw new Error('Twitter API返回了HTML页面而不是API数据，可能是身份验证失败');
    }

    console.log(`成功获取共同关注者数据`);
    
    // 提取用户列表
    const sameFollowersList = [];
    if (response.data && 
        response.data.data && 
        response.data.data.user && 
        response.data.data.user.result && 
        response.data.data.user.result.timeline && 
        response.data.data.user.result.timeline.timeline && 
        response.data.data.user.result.timeline.timeline.instructions) {
      
      const instructions = response.data.data.user.result.timeline.timeline.instructions;
      
      // 寻找添加条目指令
      const addEntriesInstruction = instructions.find(instr => instr.type === 'TimelineAddEntries');
      
      if (addEntriesInstruction && addEntriesInstruction.entries) {
        console.log(`发现 ${addEntriesInstruction.entries.length} 个条目`);
        
        // 处理用户条目
        for (const entry of addEntriesInstruction.entries) {
          // 跳过游标条目
          if (entry.entryId.startsWith('cursor-')) continue;
          
          // 处理用户条目
          if (entry.content && 
              entry.content.entryType === 'TimelineTimelineItem' && 
              entry.content.itemContent && 
              entry.content.itemContent.itemType === 'TimelineUser' &&
              entry.content.itemContent.user_results &&
              entry.content.itemContent.user_results.result) {
            
            const userData = entry.content.itemContent.user_results.result;
            const legacy = userData.legacy || {};
            
            const user = {
              id: userData.rest_id,
              name: legacy.name,
              username: legacy.screen_name,
              description: legacy.description,
              avatar: legacy.profile_image_url_https,
              isBlueVerified: userData.is_blue_verified || false,
              metrics: {
                followers: legacy.followers_count || 0,
                following: legacy.friends_count || 0,
                tweets: legacy.statuses_count || 0
              },
              is_followed_by: legacy.followed_by || false,
              is_following: legacy.following || false
            };
            
            sameFollowersList.push(user);
          }
        }
      }
    }
    
    // 构建结果对象
    const result = {
      success: true,
      userId: userId,
      total: sameFollowersList.length,
      realTotal: realTotal, // API返回的真实共同关注者总数
      timestamp: new Date().toISOString(),
      accounts: sameFollowersList
    };
    
    // 保存到文件
    const filePath = path.join(dataDir, 'samefollower.json');
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log(`成功保存共同关注者列表到: ${filePath}`);
    
    return result;
  } catch (error) {
    log(`获取共同关注者列表时出错: ${error.message}`, "error");
    
    // 返回错误结果
    return {
      success: false,
      userId: userId,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 获取并保存用户的共同关注者
 * @param {string} username - 用户名 
 */
async function getSameFollowersForUser(username) {
  try {
    // 步骤1: 获取用户ID
    console.log(`开始处理用户 ${username} 的共同关注者数据`);
    const userId = await getUserId(username);
    
    // 步骤2: 获取共同关注者数量
    console.log(`获取用户 ${username} (ID: ${userId}) 的共同关注数量`);
    const followerCount = await getMutualFollowerCount(userId);
    console.log(`用户 ${username} 的共同关注数量为: ${followerCount}`);
    
    // 步骤3: 获取共同关注者列表
    // 设置适当的count，确保能获取全部关注者，但不超过合理范围
    const count = Math.min(Math.max(followerCount, 20), 100); // 最小20，最大100
    console.log(`设置获取数量为: ${count}`);
    
    // 步骤4: 获取共同关注者列表并保存
    // 传递followerCount作为realTotal参数，这是API返回的真实total_count值
    const sameFollowers = await getSameFollowers(userId, username, count, followerCount);
    
    if (sameFollowers.success) {
      console.log(`成功获取并保存 ${username} 的共同关注者列表，共 ${sameFollowers.total} 个账号`);
    } else {
      console.error(`获取 ${username} 的共同关注者列表失败: ${sameFollowers.error}`);
    }
    
    return sameFollowers;
  } catch (error) {
    console.error(`处理用户 ${username} 的共同关注者时出错:`, error.message);
    throw error;
  }
}

// 测试函数
async function main() {
  try {
    // 从命令行获取用户名参数
    const username = process.argv[2] || 'mia_okx';
    
    console.log(`准备获取用户 ${username} 的共同关注者信息`);
    
    // 获取并保存共同关注者
    await getSameFollowersForUser(username);
    
    console.log('操作完成');
  } catch (error) {
    console.error('程序执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行main函数
if (process.argv[1] === import.meta.url.substring(7)) {
  main();
}

// 导出函数
export { getMutualFollowerCount, getSameFollowers, getSameFollowersForUser };