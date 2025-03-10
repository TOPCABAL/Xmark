import express from 'express';
import { getTweets } from './getNewTweets.js';

// 创建API路由处理程序
const router = express.Router();

// GET /api/twitter/fetch?username=xxx - 获取Twitter用户数据
router.get('/fetch', async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少username参数' 
      });
    }
    
    console.log(`收到获取推特数据请求: ${username}`);
    
    // 调用获取函数
    const data = await getTweets(username);
    
    // 返回成功响应
    return res.json({
      success: true,
      message: `成功获取用户 ${username} 的数据`,
      data: { username }
    });
  } catch (error) {
    console.error('处理Twitter API请求出错:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || '获取Twitter数据失败'
    });
  }
});

// 导出路由处理程序
export default router;

// 独立启动服务器（用于开发测试）
if (process.argv[1].includes('TwitterAPI.js')) {
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  // 添加中间件
  app.use(express.json());
  
  // 使用API路由
  app.use('/api/twitter', router);
  
  // 静态文件服务
  app.use(express.static('public'));
  
  // 启动服务器
  app.listen(PORT, () => {
    console.log(`Twitter API服务器运行在端口: ${PORT}`);
  });
} 