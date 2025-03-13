import React, { useState } from 'react';
import { Input, Button, message, Spin } from 'antd';
import TwitterEmbed from './TwitterEmbed';

// 声明环境变量类型
declare const process: {
  env: {
    NODE_ENV: 'development' | 'production' | 'test';
  }
};

interface TwitterSelectorProps {
  initialUsername?: string;
}

const TwitterSelector: React.FC<TwitterSelectorProps> = ({ initialUsername = 'dotyyds1234' }) => {
  const [username, setUsername] = useState(initialUsername);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  // 处理用户点击获取数据的事件
  const handleFetchUserData = async () => {
    // 处理空输入
    if (!inputValue.trim()) {
      message.error('请输入Twitter用户名以获取关注列表');
      return;
    }

    // 去除@符号和空格
    const cleanUsername = inputValue.replace(/^@/, '').trim();
    setLoading(true);

    try {
      // 调用后端API获取用户数据
      const response = await fetch(`/api/twitter/fetch?username=${cleanUsername}`);
      
      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }
      
      // 获取响应数据
      const data = await response.json();
      
      if (data.success) {
        message.success(`成功获取用户 ${cleanUsername} 的数据`);
        setUsername(cleanUsername);
      } else {
        throw new Error(data.message || '获取数据失败');
      }
    } catch (error) {
      console.error('获取用户数据失败:', error);
      message.error(`获取Twitter数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  // 在本地开发环境中使用模拟的成功响应
  const handleDevModeFetch = () => {
    // 处理空输入
    if (!inputValue.trim()) {
      message.error('请输入Twitter用户名以获取关注列表');
      return;
    }

    // 去除@符号和空格
    const cleanUsername = inputValue.replace(/^@/, '').trim();
    setLoading(true);

    // 模拟加载
    setTimeout(() => {
      message.success(`已切换到用户: ${cleanUsername}`);
      setUsername(cleanUsername);
      setLoading(false);
    }, 1000);
  };

  // 根据环境选择处理函数
  const handleFetch = process.env.NODE_ENV === 'development' ? handleDevModeFetch : handleFetchUserData;

  return (
    <div className="twitter-selector">
      <div className="selector-controls" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <Input
          placeholder="输入Twitter用户名 (不需要@符号)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          style={{ flex: 1 }}
          onPressEnter={handleFetch}
        />
        <Button 
          type="primary"
          onClick={handleFetch}
          loading={loading}
        >
          获取数据
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p>正在获取 {inputValue} 的Twitter数据...</p>
        </div>
      ) : (
        <TwitterEmbed screenName={username} />
      )}
    </div>
  );
};

export default TwitterSelector; 