import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { URLSearchParams } from 'url';
import qs from 'qs';

// 配置代理
// const PROXY_HOST = '127.0.0.1';
// const PROXY_PORT = 7890;
// const agent = new HttpsProxyAgent(`http://${PROXY_HOST}:${PROXY_PORT}`);

/**
 * 带重试功能的axios请求
 * @param {Object} config - axios配置
 * @param {number} retries - 重试次数，默认3次
 * @param {number} delay - 重试延迟，默认1000ms
 * @returns {Promise} axios响应
 */
async function axiosWithRetry(config, retries = 3, delay = 1000) {
  try {
    return await axios.request(config);
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    console.log(`请求失败，${delay}ms后重试，剩余重试次数: ${retries}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return axiosWithRetry(config, retries - 1, delay * 1.5);
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
    const config = {
      method: 'get',
      url: `${url}?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}`,
      headers: headers,
      // httpsAgent: agent,
      proxy: false
    };
  
    try {
      console.log(`正在获取用户 ${username} 的ID...`);
      const response = await axiosWithRetry(config);
      
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

// 主函数
async function main() {
  try {
    // 检查是否提供了--username参数
    const isUsername = process.argv.includes('--username');
    const identifier = process.argv[2];

    if (!identifier) {
      console.error('请提供要取消关注的用户ID或用户名');
      process.exit(1);
    }

    await unfollow(identifier, isUsername);
    console.log('操作完成');
  } catch (error) {
    console.error('程序执行出错:', error.message);
    process.exit(1);
  }
}

// 处理取消关注逻辑
async function unfollow(identifier, isUsername) {
  try {
    // 获取用户ID
    const userId = isUsername ? await getUserId(identifier) : identifier;

    console.log(`准备取消关注用户ID: ${userId}`);
    // console.log(`使用代理: ${PROXY_HOST}:${PROXY_PORT}`);

    // 构建请求数据
    let data = qs.stringify({
      'include_profile_interstitial_type': '1',
      'include_blocking': '1',
      'include_blocked_by': '1',
      'include_followed_by': '1',
      'include_want_retweets': '1',
      'include_mute_edge': '1',
      'include_can_dm': '1',
      'include_can_media_tag': '1',
      'include_ext_is_blue_verified': '1',
      'include_ext_verified_type': '1',
      'include_ext_profile_image_shape': '1',
      'skip_status': '1',
      'user_id': userId
    });
    
    let config = {
      method: 'post',
      url: 'https://twitter.com/i/api/1.1/friendships/destroy.json',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Content-Type': 'application/x-www-form-urlencoded',
        'sec-ch-ua-platform': '"macOS"',
        'x-csrf-token': 'd125c8af9cbfea5dbb79547395659a7ad27a163d6ea65c909158f1a9fde77ef9a0ce6b683e78071cbcd3e78635c66ce636b056841a18da766bbf3262d2af56b78052ff4135462cb38f3ab94c93ba5f37',
        'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
        'x-client-uuid': '09810c2d-a05e-4b06-9357-c82bd8737444',
        'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        'x-twitter-client-language': 'en',
        'sec-ch-ua-mobile': '?0',
        'x-twitter-active-user': 'yes',
        'x-client-transaction-id': 'fr+nYXkQuPmd+RtbEWb23oQuu591argvSajz/8FP+6yopQXZCDiQ9pdP5wEFua97C11B+H3KcdhhBbe9I8p7VQ/NtWmrfQ',
        'x-twitter-auth-type': 'OAuth2Session',
        'origin': 'https://x.com',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'referer': 'https://x.com/base',
        'accept-language': 'zh-CN,zh;q=0.9',
        'priority': 'u=1, i',
        'Cookie': 'kdt=WXXkFyTWDuI7IVHBkUppJDAvz7KX3029vDOGYQSI; _monitor_extras={"deviceId":"UXvs2BP719YE9XugjdiY_Q","eventId":2,"sequenceNumber":2}; night_mode=2; dnt=1; guest_id=v1%3A172571846612249493; guest_id_marketing=v1%3A172571846612249493; guest_id_ads=v1%3A172571846612249493; g_state={"i_l":0}; first_ref=https%3A%2F%2Fx.com%2Fi%2Fflow%2Fsingle_sign_on; lang=en; gt=1900930645045768464; personalization_id="v1_qu7EXyfCpXC6YKSmWI+DtQ=="; auth_token=79c7b1fe689dd861b23ddbac74430bd34c9459ae; ct0=d125c8af9cbfea5dbb79547395659a7ad27a163d6ea65c909158f1a9fde77ef9a0ce6b683e78071cbcd3e78635c66ce636b056841a18da766bbf3262d2af56b78052ff4135462cb38f3ab94c93ba5f37; att=1-XS9wUGbWwH48rwrQjdRNhFN3lgaxrufhpBQzZ7F5; twid=u%3D1894813209720496128; __cf_bm=3QUJcTiqQB9x6B2mC7Iap_sVKm10kjlLeIsF9g_ZOwE-1742053970-1.0.1.1-aPwZ9lcxprQ.lt8MxSYr3eMfKPhVdpUIPG4Sx4DC8rgox6hF_VzphtBiwJEYFbIUqj7REKZgGYLNs1kaLLVLptaIiR4Qiz1xLpLw8MIWjWs; amp_56bf9d=7c2c5996-fc31-48a4-bdf5-7c2e10d95a7d...1imd5tlf1.1imd861af.t.t.1q'
      },
      data: data,
      // httpsAgent: agent,
      proxy: false
    };
    
    const response = await axiosWithRetry(config);
    
    if (response.status === 200) {
      console.log('成功取消关注！');
    } else {
      console.error('取消关注失败，状态码:', response.status);
    }
  } catch (error) {
    console.error('取消关注出错:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else if (error.request) {
      console.error('请求已发送但未收到响应');
    } else {
      console.error('请求配置错误:', error.message);
    }
    throw error;
  }
}

// 执行主函数
main();