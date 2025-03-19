import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 代理设置
// const PROXY_HOST = '127.0.0.1';
// const PROXY_PORT = 7890;

// 创建HTTPS代理代理
// const agent = new HttpsProxyAgent(`http://${PROXY_HOST}:${PROXY_PORT}`);

/**
 * 获取Twitter用户描述信息
 * @param {string} username - Twitter用户名
 * @returns {Promise<Object>} 用户数据
 */
async function getUserData(username = 'dotyyds1234') {
  // 验证用户名
  if (!username) {
    throw new Error('用户名不能为空');
  }
  
  // 清理用户名 (移除@符号和空格)
  username = username.replace(/^@/, '').trim();
  
  // 请求配置
  const options = {
    method: 'GET',
    url: `https://x.com/i/api/graphql/32pL5BWe9WKeSK1MoPvFQQ/UserByScreenName?variables=%7B%22screen_name%22%3A%22${username}%22%7D&features=%7B%22hidden_profile_subscriptions_enabled%22%3Atrue%2C%22profile_label_improvements_pcf_label_in_post_enabled%22%3Atrue%2C%22rweb_tipjar_consumption_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22subscriptions_verification_info_is_identity_verified_enabled%22%3Atrue%2C%22subscriptions_verification_info_verified_since_enabled%22%3Atrue%2C%22highlights_tweets_tab_ui_enabled%22%3Atrue%2C%22responsive_web_twitter_article_notes_tab_enabled%22%3Atrue%2C%22subscriptions_feature_can_gift_premium%22%3Atrue%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%7D&fieldToggles=%7B%22withAuxiliaryUserLabels%22%3Afalse%7D`,
    headers: {
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
    },
    // 移除代理设置
    // httpsAgent: agent,
    // proxy: false // 使用httpsAgent替代proxy配置
  };

  try {
    // console.log(`使用HTTPS代理获取用户 ${username} 的数据: ${PROXY_HOST}:${PROXY_PORT}`);
    console.log(`直接获取用户 ${username} 的数据（不使用代理）`);
    const response = await axios(options);
    
    // 不再保存文件，只返回数据
    console.log(`成功获取用户 ${username} 的数据`);
    return response.data;
  } catch (error) {
    console.error(`获取用户 ${username} 的数据失败:`, error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    throw error;
  }
}

// 主函数
async function main() {
  try {
    // 从命令行获取用户名，没有则使用默认值
    const username = process.argv[2] || 'dotyyds1234';
    
    // 创建用户数据目录
    const userDataDir = path.join(__dirname, '..', 'src', 'data', username);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
      console.log(`创建用户数据目录: ${userDataDir}`);
    }
    
    // 获取用户数据
    const userData = await getUserData(username);
    
    // 保存用户数据到文件
    const filePath = path.join(userDataDir, 'profile.json');
    fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
    console.log(`成功保存用户 ${username} 的数据到: ${filePath}`);
    
    console.log('操作完成');
  } catch (error) {
    console.error('程序执行失败:', error.message);
  }
}

// 执行主函数
main();

// 导出getUserData函数，供其他模块使用
export { getUserData };