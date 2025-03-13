import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 配置代理
const PROXY_HOST = '127.0.0.1';
const PROXY_PORT = 7890;
const agent = new HttpsProxyAgent(`http://${PROXY_HOST}:${PROXY_PORT}`);

// 构建获取推文的API请求配置
const buildOptions = (userId) => ({
  method: 'GET',
  url: `https://x.com/i/api/graphql/Y9WM4Id6UcGFE8Z-hbnixw/UserTweets?variables=%7B%22userId%22%3A%22${userId}%22%2C%22count%22%3A20%2C%22includePromotedContent%22%3Atrue%2C%22withQuickPromoteEligibilityTweetFields%22%3Atrue%2C%22withVoice%22%3Atrue%2C%22withV2Timeline%22%3Atrue%7D&features=%7B%22profile_label_improvements_pcf_label_in_post_enabled%22%3Atrue%2C%22rweb_tipjar_consumption_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22premium_content_api_read_enabled%22%3Afalse%2C%22communities_web_enable_tweet_community_results_fetch%22%3Atrue%2C%22c9s_tweet_anatomy_moderator_badge_enabled%22%3Atrue%2C%22responsive_web_grok_analyze_button_fetch_trends_enabled%22%3Afalse%2C%22responsive_web_grok_analyze_post_followups_enabled%22%3Atrue%2C%22responsive_web_jetfuel_frame%22%3Afalse%2C%22responsive_web_grok_share_attachment_enabled%22%3Atrue%2C%22articles_preview_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C%22view_counts_everywhere_api_enabled%22%3Atrue%2C%22longform_notetweets_consumption_enabled%22%3Atrue%2C%22responsive_web_twitter_article_tweet_consumption_enabled%22%3Atrue%2C%22tweet_awards_web_tipping_enabled%22%3Afalse%2C%22responsive_web_grok_analysis_button_from_backend%22%3Afalse%2C%22creator_subscriptions_quote_tweet_preview_enabled%22%3Afalse%2C%22freedom_of_speech_not_reach_fetch_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Atrue%2C%22rweb_video_timestamps_enabled%22%3Atrue%2C%22longform_notetweets_rich_text_read_enabled%22%3Atrue%2C%22longform_notetweets_inline_media_enabled%22%3Atrue%2C%22responsive_web_grok_image_annotation_enabled%22%3Atrue%2C%22responsive_web_enhance_cards_enabled%22%3Afalse%7D&fieldToggles=%7B%22withArticlePlainText%22%3Afalse%7D`,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'sec-ch-ua-platform': '"Windows"',
    'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    'x-csrf-token': '31056c96fe8a0413bc9d0397f308b7adf8a1e11aee8966001d220f3c5ced5fbd71a79d982f1920075c878d72753fdac57b22bf2917b2f92b38a47c02c5819f3e645fd5e00684d97893a91c3360fa6532',
    'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
    'x-twitter-client-language': 'zh-cn',
    'sec-ch-ua-mobile': '?0',
    'x-twitter-active-user': 'yes',
    'content-type': 'application/json',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
    'Cookie': 'kdt=mQkD8KTMIJoI3XqBCEQYaQiwT6aF7XBeEDgxKj6u; night_mode=0; amp_669cbf=a71e99d4-fb09-4932-850b-60d990de15bf.YTcxZTk5ZDQtZmIwOS00OTMyLTg1MGItNjBkOTkwZGUxNWJm..1i705f1f9.1i705gbsp.s.2.u; auth_token=8389e38c3707d26e06bb94dd68e12629adc3f473; guest_id=v1%3A173892170788592691; ct0=31056c96fe8a0413bc9d0397f308b7adf8a1e11aee8966001d220f3c5ced5fbd71a79d982f1920075c878d72753fdac57b22bf2917b2f92b38a47c02c5819f3e645fd5e00684d97893a91c3360fa6532; guest_id_ads=v1%3A173892170788592691; guest_id_marketing=v1%3A173892170788592691; twid=u%3D1392861982529753094; first_ref=https%3A%2F%2Fx.com%2FEd_x0101%2Fstatus%2F1888506928260649063; amp_56bf9d=a71e99d4-fb09-4932-850b-60d990de15bf...1iktjrie9.1iktjriec.3g.nk.r4; _monitor_extras={"deviceId":"EJYN9SIBCsHOX2FF5sfwOt","eventId":32,"sequenceNumber":32}; personalization_id="v1_MwlB32Eg8Wz7h9rm3EVzHg=="; external_referer=8e8t2xd8A2w%3D|0|GlWr2u5wzZipnVja1ZbglPkPMjOgQE2KgmAMWWfTCXhp0%2FHSfkOhmd2TJyvExtBNwLZU6CoWvBe32OMU1olhowe8nuP9Vuo9T44u1MtEoy0%3D; lang=zh-cn; amp_69ec37=a71e99d4-fb09-4932-850b-60d990de15bf...1iltjp5cd.1iltmd8vf.j.2f.32'
  },
  // 添加HTTPS代理支持
  httpsAgent: agent,
  proxy: false, // 使用httpsAgent替代proxy配置
  // 改为默认的JSON响应类型，让axios自动处理解压缩
  responseType: 'json',
  // 超时设置
  timeout: 30000 // 30秒
});

/**
 * 通过用户ID获取推文数据
 * @param {string} userId - Twitter用户ID
 * @param {string} [outputDir] - 输出目录，如果提供则保存到该目录
 * @returns {Promise<Object>} 推文数据
 */
async function getUserTweets(userId, outputDir = null) {
  if (!userId) {
    throw new Error('用户ID不能为空');
  }

  try {
    console.log(`使用HTTPS代理获取用户ID为 ${userId} 的推文: ${PROXY_HOST}:${PROXY_PORT}`);
    const options = buildOptions(userId);
    const response = await axios(options);
    
    console.log(`收到响应: 状态码 ${response.status}, 内容类型: ${response.headers['content-type']}`);
    
    // 直接使用响应数据，不需要手动解压
    const jsonData = response.data;
    
    // 保存响应数据到文件
    let filePath;
    if (outputDir) {
      // 如果提供了输出目录，保存到该目录
      filePath = path.join(outputDir, 'tweets.json');
    } else {
      // 否则保存到默认位置
      filePath = path.join(__dirname, `OriginTweets_${userId}.json`);
    }
    
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
    
    console.log(`成功获取用户 ${userId} 的推文并保存到: ${filePath}`);
    return jsonData;
  } catch (error) {
    console.error(`获取用户 ${userId} 的推文失败:`, error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
    } else if (error.request) {
      console.error('请求已发送但未收到响应');
    } else {
      console.error('请求配置错误:', error.message);
    }
    throw error;
  }
}

// 主函数
async function main() {
  try {
    // 从命令行获取用户ID，默认为Elon Musk的ID
    const userId = process.argv[2] || '44196397';
    
    // 检查是否提供了输出目录
    let outputDir = null;
    if (process.argv[3]) {
      // 如果提供了第三个参数，将其作为输出目录
      outputDir = process.argv[3];
      
      // 确保目录存在
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`创建输出目录: ${outputDir}`);
      }
    } else {
      // 如果没有提供输出目录，创建默认目录
      outputDir = path.join(__dirname, 'src', 'data', userId);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`创建默认输出目录: ${outputDir}`);
      }
    }
    
    console.log(`开始获取用户ID为 ${userId} 的推文`);
    await getUserTweets(userId, outputDir);
    
    console.log('操作完成');
  } catch (error) {
    console.error('程序执行失败:', error.message);
    process.exit(1);
  }
}

// 执行主函数
main();