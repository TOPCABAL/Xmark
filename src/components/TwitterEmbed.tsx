import React, { useEffect, useState, useRef } from 'react';
import './TwitterEmbed.css';
import axios from 'axios';

interface TwitterEmbedProps {
  screenName?: string; // 可选的Twitter用户名参数
}

// API服务器URL - 可以根据环境变量或配置文件设置
const API_BASE_URL = 'http://localhost:3001';

const TwitterEmbed: React.FC<TwitterEmbedProps> = ({ screenName = 'dotyyds1234' }) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTwitterProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 确保用户名是干净的（不包含@符号）
        const cleanUsername = screenName.replace('@', '');
        console.log(`正在从API获取用户: ${cleanUsername} 的资料`);
        
        // 调用独立的API服务获取用户资料HTML
        const response = await axios.get(`${API_BASE_URL}/api/twitter-profile/${cleanUsername}`);
        
        if (response.data.success) {
          setHtmlContent(response.data.html);
        } else {
          throw new Error(response.data.message || '获取用户资料失败');
        }
      } catch (error) {
        console.error('加载Twitter资料出错:', error);
        setError(typeof error === 'object' && error !== null && 'message' in error 
          ? (error as Error).message 
          : '未找到用户数据。请确保用户数据文件已导入到正确的文件夹。');
      } finally {
        setLoading(false);
      }
    };

    if (screenName) {
      fetchTwitterProfile();
    }
  }, [screenName]); // 当screenName变化时重新加载

  // 当HTML内容加载后，将其设置到容器中
  useEffect(() => {
    if (htmlContent && containerRef.current) {
      // 从HTML中提取<body>标签内容
      const bodyContent = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || htmlContent;
      containerRef.current.innerHTML = bodyContent;
      
      // 添加CSS处理
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        .container {
          width: 100% !important;
          max-width: 100% !important;
        }
      `;
      containerRef.current.appendChild(styleElement);
      
      // 添加事件监听器到链接
      const links = containerRef.current.querySelectorAll('a');
      links.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          window.open(link.href, '_blank');
        });
      });
    }
  }, [htmlContent]);

  return (
    <div className="twitter-embed-container">
      {loading ? (
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>加载 {screenName} 的数据中...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p className="error-message">{error}</p>
          <p className="error-hint">
            请确保对应用户的数据文件已正确导入。<br/>
            文件结构应为：<br/>
            src/data/{screenName.replace('@', '')}/profile.json<br/>
            src/data/{screenName.replace('@', '')}/tweets.json
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="twitter-content-container"></div>
      )}
    </div>
  );
};

export default TwitterEmbed; 