// 定义AccountProps接口以避免导入问题
export interface AccountProps {
  id: string;
  name: string;
  username: string;
  avatar: string;
  verified?: boolean;
  following?: boolean;
  category?: string; // 保留单个标签支持
  categories?: string[]; // 新增多标签支持
  description?: string;
  metrics?: {
    followers: number;
    following: number;
    tweets: number;
  };
  isAnnotated?: boolean; // 是否已标注
  annotatedAt?: number;  // 标注时间
  notes?: string;        // 备注信息
}

// 将Twitter API响应转换为我们的AccountProps格式
function transformTwitterResponse(twitterData: any[]): AccountProps[] {
  return twitterData.map(user => {
    // 处理不同版本API的字段差异
    const username = user.screen_name || user.username;
    const avatar = user.profile_image_url_https || user.profile_image_url;
    
    // 提取公开指标数据（如果存在）
    let metrics = undefined;
    if (user.public_metrics) {
      metrics = {
        followers: user.public_metrics.followers_count,
        following: user.public_metrics.following_count,
        tweets: user.public_metrics.tweet_count
      };
    }
    
    // 不再为未分组账号随机分配分类
    // 只保留原始数据中已有的分类信息
    
    return {
      id: user.id_str || user.id,
      name: user.name,
      username: `@${username}`,
      avatar: avatar,
      verified: user.verified || false,
      following: true, // 从关注列表获取的用户默认已关注
      category: user.category, // 只保留原始数据的分类，不再自动分配
      categories: user.categories || [], // 支持多标签
      description: user.description,
      metrics,
      isAnnotated: false // 默认为未标注
    };
  });
}

// 从本地JSON文件加载关注列表（开发环境用）
export async function loadLocalFollowingList(): Promise<AccountProps[]> {
  try {
    // 使用动态导入加载JSON文件
    const response = await import('../data/response.json');
    
    // 检查数据是否有效
    if (!response || !response.data || !Array.isArray(response.data)) {
      console.error('本地JSON数据格式无效');
      return [];
    }
    
    return transformTwitterResponse(response.data);
  } catch (error) {
    console.error('加载本地关注列表失败:', error);
    return [];
  }
}

// 使用提供的API标头获取Twitter关注列表
export async function fetchTwitterFollowingList(
  headers: Record<string, string>,
  userId: string
): Promise<AccountProps[]> {
  try {
    // 替换为实际的Twitter API端点
    const endpoint = `https://api.twitter.com/2/users/${userId}/following`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    return transformTwitterResponse(data.data || []);
  } catch (error) {
    console.error('获取Twitter关注列表失败:', error);
    return [];
  }
}

// 提取复杂Twitter API响应中的用户数据
function extractUsersFromComplexTwitterResponse(jsonData: any): any[] {
  try {
    console.log("开始解析复杂Twitter响应...");
    
    // 调试用 - 输出JSON结构的顶层键
    if (jsonData && typeof jsonData === 'object') {
      console.log("JSON顶层键:", Object.keys(jsonData));
    }
    
    // 深度递归查找用户数据
    function deepSearch(obj: any, depth: number = 0, path: string = ""): any[] {
      // 防止过深递归
      if (depth > 10) return [];
      
      // 数组处理
      if (Array.isArray(obj)) {
        let results: any[] = [];
        for (let i = 0; i < obj.length; i++) {
          const itemResults = deepSearch(obj[i], depth + 1, `${path}[${i}]`);
          results = results.concat(itemResults);
        }
        return results;
      }
      
      // 对象处理
      if (obj && typeof obj === 'object') {
        let results: any[] = [];
        
        // 检查当前对象是否是用户对象
        if (isUserObject(obj)) {
          console.log(`在路径${path}找到用户对象`);
          return [obj];
        }
        
        // 检查是否包含用户结果数组
        if (obj.users_results && Array.isArray(obj.users_results)) {
          console.log(`在路径${path}.users_results找到用户结果数组`);
          const users = obj.users_results.map((ur: any) => ur.result).filter(Boolean);
          if (users.length > 0) return users;
        }
        
        // 检查是否包含users数组
        if (obj.users && Array.isArray(obj.users)) {
          console.log(`在路径${path}.users找到用户数组`);
          return obj.users;
        }

        // 检查是否包含globalObjects.users对象
        if (obj.globalObjects && obj.globalObjects.users) {
          console.log(`在路径${path}.globalObjects.users找到用户对象集合`);
          return Object.values(obj.globalObjects.users);
        }
        
        // 递归搜索所有属性
        for (const key in obj) {
          const newResults = deepSearch(obj[key], depth + 1, `${path}.${key}`);
          results = results.concat(newResults);
          if (results.length > 0) {
            return results; // 一旦找到就返回
          }
        }
        
        return results;
      }
      
      return []; // 基本类型返回空数组
    }
    
    // 检查对象是否是用户对象的辅助函数
    function isUserObject(obj: any): boolean {
      if (!obj || typeof obj !== 'object') return false;
      
      // 检查直接的用户对象格式
      if ((obj.id_str || obj.id) && obj.name && (obj.screen_name || obj.username)) {
        return true;
      }
      
      // 检查用户和legacy组合格式
      if (obj.legacy && (obj.rest_id || obj.id)) {
        if (obj.legacy.name && obj.legacy.screen_name) {
          return true;
        }
      }
      
      // 检查Twitter网页响应中的userResults格式
      if (obj.userResults && obj.userResults.result) {
        const result = obj.userResults.result;
        return isUserObject(result);
      }
      
      // 检查特定的Twitter内部API格式
      if (obj.__typename === "User" && obj.legacy) {
        return true;
      }
      
      return false;
    }
    
    // 特别处理Twitter网页版关注列表响应
    if (jsonData.data && jsonData.data.user && jsonData.data.user.result) {
      console.log("检测到Twitter网页版API响应结构");
      
      const result = jsonData.data.user.result;
      if (result.__typename === "User" && result.timeline && result.timeline.timeline) {
        const timeline = result.timeline.timeline;
        
        if (timeline.instructions && Array.isArray(timeline.instructions)) {
          console.log("找到timeline指令数组，长度:", timeline.instructions.length);
          
          // 用于存储提取的用户对象
          const users: any[] = [];
          
          // 遍历所有指令
          for (const instruction of timeline.instructions) {
            // 处理TimelineAddEntries指令类型
            if (instruction.type === "TimelineAddEntries" && instruction.entries) {
              console.log("处理TimelineAddEntries指令");
              
              for (const entry of instruction.entries) {
                if (!entry.content) continue;
                
                // 处理各种可能的content结构
                let entryContent = entry.content;
                
                // 处理itemContent格式
                if (entryContent.itemContent && entryContent.itemContent.user) {
                  users.push(entryContent.itemContent.user);
                  continue;
                }
                
                // 处理userResults格式
                if (entryContent.content && entryContent.content.userResults && entryContent.content.userResults.result) {
                  users.push(entryContent.content.userResults.result);
                  continue;
                }
                
                // 处理items数组格式
                if (entryContent.items && Array.isArray(entryContent.items)) {
                  for (const item of entryContent.items) {
                    if (item.item && item.item.itemContent && item.item.itemContent.user) {
                      users.push(item.item.itemContent.user);
                    } else if (item.item && item.item.content && item.item.content.userResults) {
                      users.push(item.item.content.userResults.result);
                    }
                  }
                  continue;
                }
              }
            }
            
            // 处理TimelineAddToModule指令类型
            if (instruction.type === "TimelineAddToModule" && 
                instruction.moduleItems && 
                Array.isArray(instruction.moduleItems)) {
              console.log("处理TimelineAddToModule指令");
              
              for (const moduleItem of instruction.moduleItems) {
                if (!moduleItem.item || !moduleItem.item.content) continue;
                
                // 处理userResults格式
                if (moduleItem.item.content.userResults && moduleItem.item.content.userResults.result) {
                  users.push(moduleItem.item.content.userResults.result);
                }
              }
            }
          }
          
          console.log(`从timeline指令中提取了 ${users.length} 个用户`);
          if (users.length > 0) {
            return users;
          }
        }
      }
    }
    
    // 如果上面的特殊处理没有结果，进行通用深度搜索
    // 先检查常见的嵌套路径
    const commonPaths = [
      ['data', 'user', 'result', 'timeline', 'timeline', 'instructions'],
      ['data', 'user', 'result', 'timeline_v2', 'timeline', 'instructions'],
      ['data', 'following', 'timeline', 'instructions'],
      ['data', 'followers', 'timeline', 'instructions']
    ];
    
    for (const path of commonPaths) {
      let current = jsonData;
      let valid = true;
      
      for (const key of path) {
        if (!current || !current[key]) {
          valid = false;
          break;
        }
        current = current[key];
      }
      
      if (valid && Array.isArray(current)) {
        console.log(`找到路径 ${path.join('.')} 的指令数组`);
        const foundUsers: any[] = [];
        
        // 遍历指令数组
        for (const instruction of current) {
          // 分析TimelineAddEntries
          if (instruction.type === "TimelineAddEntries" && instruction.entries) {
            for (const entry of instruction.entries) {
              const itemUsers = deepSearch(entry, 0, `entry`);
              if (itemUsers.length > 0) {
                foundUsers.push(...itemUsers);
              }
            }
          }
          // 分析TimelineAddToModule
          else if (instruction.type === "TimelineAddToModule" && instruction.moduleItems) {
            for (const moduleItem of instruction.moduleItems) {
              const itemUsers = deepSearch(moduleItem, 0, `moduleItem`);
              if (itemUsers.length > 0) {
                foundUsers.push(...itemUsers);
              }
            }
          }
        }
        
        if (foundUsers.length > 0) {
          console.log(`在路径 ${path.join('.')} 中找到 ${foundUsers.length} 个用户`);
          return foundUsers;
        }
      }
    }
    
    // 如果以上都没找到，尝试整体深度搜索
    const users = deepSearch(jsonData);
    
    if (users.length > 0) {
      console.log(`通过深度搜索找到 ${users.length} 个用户`);
      return users;
    }
    
    console.log("未能找到用户数据");
    return [];
  } catch (error) {
    console.error("提取用户数据时出错:", error);
    return [];
  }
}

// 将Twitter用户对象标准化
function normalizeTwitterUser(user: any): any {
  try {
    // 空值检查
    if (!user) {
      console.error("尝试标准化空用户对象");
      return {
        id: "unknown",
        name: "未知用户",
        username: "unknown",
        screen_name: "unknown",
        profile_image_url: "",
        verified: false
      };
    }
    
    console.log("标准化用户对象:", user.rest_id || user.id || "未知ID");
    
    // Twitter内部API - 用户结构带有legacy子对象
    if (user.legacy) {
      const baseId = user.rest_id || user.id;
      if (!baseId) {
        console.warn("找到legacy对象但没有ID:", user);
      }
      
      return {
        id: baseId,
        id_str: baseId,
        name: user.legacy.name,
        username: user.legacy.screen_name,
        screen_name: user.legacy.screen_name,
        verified: user.legacy.verified,
        profile_image_url: user.legacy.profile_image_url_https,
        profile_image_url_https: user.legacy.profile_image_url_https,
        description: user.legacy.description,
        public_metrics: {
          followers_count: user.legacy.followers_count,
          following_count: user.legacy.friends_count,
          tweet_count: user.legacy.statuses_count,
          listed_count: user.legacy.listed_count
        }
      };
    }
    
    // UserResults包装格式
    if (user.userResults && user.userResults.result) {
      console.log("处理userResults包装格式");
      return normalizeTwitterUser(user.userResults.result);
    }
    
    // 检查result嵌套结构
    if (user.result && typeof user.result === 'object') {
      console.log("处理嵌套result结构");
      return normalizeTwitterUser(user.result);
    }
    
    // 已经是标准格式 - 直接返回所需字段
    if (user.id || user.id_str) {
      const userId = user.id || user.id_str;
      const userName = user.name || user.full_name || "未知用户";
      const screenName = user.screen_name || user.username || "";
      
      // 提取头像URL - Twitter有多种可能的字段名
      let avatarUrl = user.profile_image_url_https || 
                      user.profile_image_url || 
                      user.avatar_url || 
                      user.profile_image || 
                      "";
      
      // 某些Twitter响应中头像URL可能嵌套在profile_image_shape里
      if (!avatarUrl && user.profile_image_shape && user.profile_image_shape.url) {
        avatarUrl = user.profile_image_shape.url;
      }
      
      // 构建公开指标对象
      const publicMetrics = {
        followers_count: user.followers_count || (user.public_metrics && user.public_metrics.followers_count) || 0,
        following_count: user.following_count || user.friends_count || (user.public_metrics && user.public_metrics.following_count) || 0,
        tweet_count: user.tweet_count || user.statuses_count || (user.public_metrics && user.public_metrics.tweet_count) || 0,
        listed_count: user.listed_count || (user.public_metrics && user.public_metrics.listed_count) || 0
      };
      
      return {
        id: userId,
        id_str: userId,
        name: userName,
        username: screenName,
        screen_name: screenName,
        verified: user.verified || user.is_verified || false,
        profile_image_url: avatarUrl,
        profile_image_url_https: avatarUrl,
        description: user.description || user.bio || "",
        public_metrics: publicMetrics
      };
    }
    
    // 处理可能的复合结构
    if (user.__typename === "User") {
      console.log("处理__typename=User格式");
      
      if (user.legacy) {
        return normalizeTwitterUser({ 
          ...user.legacy, 
          id: user.rest_id || user.id 
        });
      }
      
      // 整合可能存在的所有数据字段
      const userId = user.rest_id || user.id;
      let screenName = "";
      let userName = "";
      let description = "";
      let verified = false;
      let avatarUrl = "";
      let metrics = { followers_count: 0, following_count: 0, tweet_count: 0, listed_count: 0 };
      
      // 从不同可能的位置获取数据
      if (user.legacy) {
        screenName = user.legacy.screen_name;
        userName = user.legacy.name;
        verified = user.legacy.verified;
        description = user.legacy.description;
        avatarUrl = user.legacy.profile_image_url_https;
        metrics = {
          followers_count: user.legacy.followers_count || 0,
          following_count: user.legacy.friends_count || 0,
          tweet_count: user.legacy.statuses_count || 0,
          listed_count: user.legacy.listed_count || 0
        };
      }
      
      // 回退到直接的属性
      screenName = screenName || user.screen_name || user.username || "";
      userName = userName || user.name || "未知用户";
      description = description || user.description || "";
      verified = verified || user.verified || false;
      avatarUrl = avatarUrl || user.profile_image_url_https || user.profile_image_url || "";
      
      return {
        id: userId,
        id_str: userId,
        name: userName,
        username: screenName,
        screen_name: screenName,
        verified: verified,
        profile_image_url: avatarUrl,
        profile_image_url_https: avatarUrl,
        description: description,
        public_metrics: metrics
      };
    }
    
    // 如果所有格式都不匹配，尝试最宽松的格式提取
    console.warn("使用宽松格式提取:", user);
    return {
      id: user.id || user.id_str || user.rest_id || user.user_id || "unknown",
      id_str: user.id_str || user.id || user.rest_id || user.user_id || "unknown",
      name: user.name || user.displayName || user.display_name || "未知用户",
      username: user.username || user.screen_name || user.screenName || "",
      screen_name: user.screen_name || user.username || user.screenName || "",
      verified: user.verified || user.is_verified || false,
      profile_image_url: user.profile_image_url || user.avatarUrl || user.avatar || "",
      profile_image_url_https: user.profile_image_url_https || user.profile_image_url || user.avatarUrl || user.avatar || "",
      description: user.description || user.bio || "",
      public_metrics: {
        followers_count: user.followers_count || (user.public_metrics && user.public_metrics.followers_count) || 0,
        following_count: user.following_count || user.friends_count || (user.public_metrics && user.public_metrics.following_count) || 0,
        tweet_count: user.tweet_count || user.statuses_count || (user.public_metrics && user.public_metrics.tweet_count) || 0,
        listed_count: user.listed_count || (user.public_metrics && user.public_metrics.listed_count) || 0
      }
    };
  } catch (error) {
    console.error("标准化用户数据出错:", error);
    return {
      id: "error",
      name: "处理错误",
      username: "error",
      screen_name: "error",
      profile_image_url: "",
      verified: false,
      description: "在处理此用户数据时出错"
    };
  }
}

// 手动导入Twitter数据的函数（如果您已经有了JSON响应）
export async function importTwitterFollowingFromJson(jsonData: any): Promise<AccountProps[]> {
  try {
    console.log("开始导入Twitter JSON数据");
    
    // 如果是字符串，先解析为对象
    if (typeof jsonData === 'string') {
      try {
        console.log("JSON是字符串格式，尝试解析");
        jsonData = JSON.parse(jsonData);
      } catch (e) {
        console.error("JSON字符串解析失败:", e);
        throw new Error('无效的JSON字符串，请确保粘贴完整的JSON数据');
      }
    }
    
    if (!jsonData || typeof jsonData !== 'object') {
      console.error("JSON数据无效: 不是对象", jsonData);
      throw new Error('提供的JSON数据无效: 不是一个对象');
    }
    
    // 记录JSON结构的基本信息以便调试
    const keys = Object.keys(jsonData);
    console.log(`JSON数据顶层键: ${keys.join(', ')}`);
    
    if (keys.length === 0) {
      console.error("JSON数据为空对象");
      throw new Error('提供的JSON数据是空对象');
    }
    
    // 尝试提取用户数据
    let users = extractUsersFromComplexTwitterResponse(jsonData);
    
    if (!users || users.length === 0) {
      console.error("未能提取到用户数据");
      
      // 尝试查看是否有错误信息
      let errorMessage = '无法从JSON中提取账号数据，请确认是否为Twitter API响应格式';
      
      if (jsonData.errors && Array.isArray(jsonData.errors) && jsonData.errors.length > 0) {
        const apiErrors = jsonData.errors.map((err: any) => err.message || err.code || '未知错误').join('; ');
        errorMessage = `Twitter API返回错误: ${apiErrors}`;
      } else if (jsonData.error) {
        errorMessage = `Twitter API错误: ${jsonData.error}`;
      }
      
      throw new Error(errorMessage);
    }
    
    console.log(`提取到${users.length}个原始用户数据`);
    
    // 标准化用户数据
    console.log("开始标准化用户数据...");
    const normalizedUsers = users.map((user, index) => {
      try {
        return normalizeTwitterUser(user);
      } catch (error) {
        console.error(`标准化第${index}个用户时出错:`, error);
        return null;
      }
    }).filter(Boolean) as any[]; // 过滤掉null值
    
    console.log(`标准化后有${normalizedUsers.length}个有效用户`);
    
    if (normalizedUsers.length === 0) {
      throw new Error('提取到的用户数据格式无法识别，标准化失败');
    }
    
    // 转换为我们的格式
    console.log("转换为应用内部格式...");
    const accountProps = transformTwitterResponse(normalizedUsers);
    console.log(`成功导入${accountProps.length}个账号`);
    
    return accountProps;
  } catch (error) {
    console.error('处理Twitter JSON数据失败:', error);
    // 重新抛出错误，保留原始错误消息
    throw error;
  }
}

// 将API数据与本地已标注数据合并
export function mergeWithAnnotatedAccounts(apiAccounts: AccountProps[], annotatedAccounts: AccountProps[]): AccountProps[] {
  if (!annotatedAccounts || annotatedAccounts.length === 0) {
    return apiAccounts;
  }
  
  // 创建标注账号的ID映射
  const annotatedMap = new Map<string, AccountProps>();
  annotatedAccounts.forEach(account => {
    annotatedMap.set(account.id, account);
    
    // 也用用户名做索引，因为有时ID可能不匹配
    if (account.username) {
      const username = account.username.replace('@', '').toLowerCase();
      annotatedMap.set(username, account);
    }
  });
  
  // 合并数据
  return apiAccounts.map(apiAccount => {
    // 先尝试通过ID匹配
    let annotated = annotatedMap.get(apiAccount.id);
    
    // 如果没找到，尝试通过用户名匹配
    if (!annotated && apiAccount.username) {
      const username = apiAccount.username.replace('@', '').toLowerCase();
      annotated = annotatedMap.get(username);
    }
    
    if (annotated) {
      // 合并数据，优先使用标注数据的分类和备注
      return {
        ...apiAccount,
        category: annotated.category || apiAccount.category,
        categories: annotated.categories || apiAccount.categories,
        notes: annotated.notes,
        isAnnotated: true,
        annotatedAt: annotated.annotatedAt
      };
    }
    
    return apiAccount;
  });
}

// 添加一个导入Twitter用户数据的函数
export async function createTwitterUser(username: string, userData: any, tweetsData?: any) {
  try {
    // 移除用户名中的@符号
    const cleanUsername = username.replace('@', '');
    
    // 调用API端点
    const response = await fetch('http://localhost:3001/api/twitter-profile/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: cleanUsername,
        userData,
        tweetsData
      }),
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '创建用户数据失败');
    }
    
    return result;
  } catch (error) {
    console.error('创建Twitter用户数据失败:', error);
    throw error;
  }
}

// 添加或增强解析Twitter数据的功能
export function extractTwitterUserData(jsonData: any) {
  try {
    let userData = null;
    let tweetsData = null;
    
    // 尝试确定数据类型
    if (typeof jsonData === 'string') {
      try {
        jsonData = JSON.parse(jsonData);
      } catch (error) {
        console.error('JSON解析失败:', error);
        throw new Error('无效的JSON格式');
      }
    }
    
    // 检查是否有用户资料数据
    if (jsonData?.data?.user?.result?.legacy) {
      userData = jsonData;
    }
    
    // 检查是否有推文数据
    if (jsonData?.data?.user?.result?.timeline_v2) {
      tweetsData = jsonData;
    }
    
    // 如果无法确定数据类型
    if (!userData && !tweetsData) {
      // 可能是其他格式，尝试查找常见的用户资料字段
      if (jsonData?.legacy || jsonData?.screen_name || jsonData?.profile_image_url_https) {
        // 构建一个符合预期结构的用户数据对象
        userData = {
          data: {
            user: {
              result: {
                legacy: {
                  ...jsonData,
                  // 确保必要字段存在
                  name: jsonData.name || jsonData.screen_name || 'Unknown User',
                  screen_name: jsonData.screen_name || 'unknown',
                  profile_image_url_https: jsonData.profile_image_url_https || '',
                  description: jsonData.description || '',
                  followers_count: jsonData.followers_count || 0,
                  friends_count: jsonData.friends_count || 0,
                }
              }
            }
          }
        };
      }
    }
    
    return { userData, tweetsData };
  } catch (error) {
    console.error('提取Twitter数据失败:', error);
    throw error;
  }
}

/**
 * 测试与服务器的连接
 * @returns Promise<{success: boolean, message: string, serverTime?: string}>
 */
export async function testServerConnection(): Promise<{success: boolean, message: string, serverTime?: string}> {
  console.log(`开始测试服务器连接...`);
  
  try {
    // 添加随机参数避免缓存
    const randomParam = Math.random().toString(36).substring(7);
    // 使用正确的服务器状态端点
    const testUrl = `http://localhost:3001/api/status?r=${randomParam}`;
    console.log(`测试连接URL: ${testUrl}`);
    
    // 设置5秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    // 发送测试请求
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      mode: 'cors', // 显式设置CORS模式
      credentials: 'omit', // 不发送凭据
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
    
    console.log(`服务器连接测试响应状态: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`服务器连接测试成功:`, data);
      return {
        success: true,
        message: '服务器连接成功',
        serverTime: data.timestamp || new Date().toISOString()
      };
    } else {
      const errorText = await response.text();
      console.error(`服务器连接测试失败: HTTP ${response.status}, 响应内容:`, errorText);
      return {
        success: false,
        message: `服务器连接失败: HTTP ${response.status}, ${errorText ? errorText.substring(0, 100) : response.statusText}`
      };
    }
  } catch (error) {
    // 判断是否是超时错误
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error(`服务器连接测试超时`);
      return {
        success: false,
        message: '服务器连接超时，请检查服务器是否运行'
      };
    }
    
    console.error(`服务器连接测试出错:`, error);
    return {
      success: false,
      message: `服务器连接测试出错: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

// 从后端API获取指定用户的关注列表
export async function fetchUserFollowing(username: string, pages: number = 3): Promise<AccountProps[]> {
  try {
    console.log(`开始获取用户${username}的关注列表，页数：${pages}`);
    
    // 添加请求超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
    
    // 构建请求URL - 使用固定的后端服务器URL
    const baseUrl = 'http://localhost:3001'; // 使用服务器的端口
    const apiEndpoint = `/api/twitter/following`;
    const requestUrl = `${baseUrl}${apiEndpoint}?username=${encodeURIComponent(username.trim())}&pages=${pages}`;
    
    console.log(`请求完整URL: ${requestUrl}`);
    console.log(`请求参数: username=${username}, pages=${pages}`);
    
    const response = await fetch(requestUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      mode: 'cors', // 显式设置CORS模式
      credentials: 'omit', // 不发送凭据
    }).finally(() => clearTimeout(timeoutId));
    
    // 记录响应状态
    console.log(`获取关注列表响应状态: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      // 尝试读取错误响应
      let errorBody;
      try {
        errorBody = await response.text();
        console.error(`API请求失败: HTTP ${response.status}, 响应内容:`, errorBody);
      } catch (e) {
        console.error(`API请求失败: HTTP ${response.status}, 无法读取响应内容`);
      }
      
      throw new Error(`API请求失败: HTTP ${response.status}, ${errorBody ? '非JSON响应' : response.statusText}`);
    }
    
    // 获取JSON响应
    const data = await response.json();
    
    // 验证数据结构
    if (data.accounts && Array.isArray(data.accounts)) {
      console.log(`成功获取关注列表: ${data.accounts.length} 个账号`);
      
      // 将请求返回的数据转换为前端需要的格式
      const accounts: AccountProps[] = data.accounts.map((account: any) => ({
        id: account.id || account.rest_id || account.userId || `user-${Math.random().toString(36).substring(2, 10)}`,
        name: account.name || account.legacy?.name || account.result?.legacy?.name || 'Unknown User',
        username: account.username || account.legacy?.screen_name || account.result?.legacy?.screen_name || '@unknown',
        avatar: account.profile_image_url_https || account.profile_image_url || account.result?.legacy?.profile_image_url_https || account.result?.legacy?.profile_image_url || '',
        verified: account.verified || account.legacy?.verified || account.result?.legacy?.verified || false,
        following: true,
        category: account.category || account.legacy?.category || account.result?.legacy?.category || '',
        categories: account.categories || [],
        description: account.description || account.legacy?.description || account.result?.legacy?.description || '',
        metrics: account.public_metrics || account.legacy?.public_metrics || account.result?.legacy?.public_metrics || {
          followers_count: account.followers_count || account.legacy?.followers_count || account.result?.legacy?.followers_count || 0,
          following_count: account.following_count || account.legacy?.friends_count || account.result?.legacy?.friends_count || 0,
          tweets: account.tweet_count || account.legacy?.statuses_count || account.result?.legacy?.statuses_count || 0
        },
        isAnnotated: false,
        annotatedAt: 0,
        notes: ''
      }));
      
      return accounts;
    }
    
    // 如果没有accounts属性或不是数组，则抛出错误
    console.error('API返回的数据缺少accounts数组:', data);
    throw new Error('API返回的数据格式不正确，无法解析关注列表');

  } catch (error) {
    console.error('获取关注列表失败:', error instanceof Error ? error.message : '未知错误');
    // 重新抛出错误，保留原始错误消息
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`获取关注列表失败: ${error}`);
    }
  }
}

/**
 * 获取用户的共同关注者列表
 * @param username 用户名
 * @param refresh 是否强制刷新数据
 * @returns 共同关注者数据
 */
export async function fetchMutualFollowers(username: string, refresh = false): Promise<{
  success: boolean;
  username: string;
  data: {
    success: boolean;
    userId: string;
    total: number;
    accounts: AccountProps[];
    timestamp: string;
  }
}> {
  try {
    console.log(`获取用户 ${username} 的共同关注者数据, refresh=${refresh}`);
    const url = `http://localhost:3001/api/same-followers/${encodeURIComponent(username)}${refresh ? '?refresh=true' : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`获取共同关注者失败: HTTP ${response.status}\n${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取共同关注者失败:', error);
    throw error;
  }
} 