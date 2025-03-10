// Twitter数据服务
import axios from 'axios';

// 获取Twitter用户数据
export const fetchTwitterUserData = async (username) => {
  try {
    // 在实际应用中，这里应该从API获取数据
    // 但目前我们直接使用解析脚本生成的本地数据
    
    // 可以根据需要进行调整，使用实际的API请求
    // 暂时模拟从服务器获取解析后的数据
    const response = await axios.get(`/api/twitter/data/${username}`);
    return response.data;
  } catch (error) {
    console.error('获取Twitter用户数据失败:', error);
    throw error;
  }
};

// 使用本地数据模拟API (仅用于开发测试)
export const mockTwitterData = async (username) => {
  // 这里是模拟的数据
  // 实际开发中应该替换为真实API调用
  
  try {
    // 使用静态数据文件路径
    const userDataResponse = await fetch('/data/twitter/user_data.json');
    if (!userDataResponse.ok) {
      throw new Error('无法获取用户数据');
    }
    
    const userData = await userDataResponse.json();
    return userData;
  } catch (error) {
    console.error('模拟Twitter数据失败:', error);
    throw error;
  }
};

// 导出默认服务
export default {
  fetchTwitterUserData,
  mockTwitterData
}; 