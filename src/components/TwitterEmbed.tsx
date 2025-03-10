import React, { useEffect, useState, useRef } from 'react';
import './TwitterEmbed.css';

interface TwitterEmbedProps {
  screenName?: string; // 可选的Twitter用户名参数
}

const TwitterEmbed: React.FC<TwitterEmbedProps> = ({ screenName = 'dotyyds1234' }) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchHtmlContent = async () => {
      try {
        setLoading(true);
        
        // 使用screenName动态获取用户特定的HTML文件
        // 首先尝试加载用户特定的HTML文件
        let response;
        
        try {
          // 先尝试加载用户特定的文件
          response = await fetch(`/${screenName}_user_data.html`);
          if (!response.ok) {
            throw new Error('用户特定文件不存在');
          }
        } catch (userSpecificError) {
          // 如果用户特定文件不存在，回退到通用文件
          console.log(`未找到用户 ${screenName} 的特定文件，使用通用文件`);
          response = await fetch('/user_data.html');
          if (!response.ok) {
            throw new Error('通用文件也不存在');
          }
        }
        
        const html = await response.text();
        setHtmlContent(html);
        setLoading(false);
      } catch (error) {
        console.error('加载HTML文件出错:', error);
        setLoading(false);
      }
    };

    fetchHtmlContent();
  }, [screenName]); // 当screenName变化时重新加载

  // 当HTML内容加载后，将其设置到容器中
  useEffect(() => {
    if (htmlContent && containerRef.current) {
      // 从HTML中提取<body>标签内容
      const bodyContent = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || htmlContent;
      containerRef.current.innerHTML = bodyContent;
      
      // 添加用户名标记
      const userInfoTitle = containerRef.current.querySelector('.user-info h1');
      if (userInfoTitle) {
        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'current-username';
        usernameSpan.textContent = `(当前显示: ${screenName})`;
        usernameSpan.style.fontSize = '14px';
        usernameSpan.style.fontWeight = 'normal';
        usernameSpan.style.color = '#657786';
        usernameSpan.style.marginLeft = '10px';
        userInfoTitle.appendChild(usernameSpan);
      }
    }
  }, [htmlContent, screenName]);

  return (
    <div className="twitter-embed-container">
      {loading ? (
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>加载 {screenName} 的数据中...</p>
        </div>
      ) : (
        <div ref={containerRef} className="twitter-content-container"></div>
      )}
    </div>
  );
};

export default TwitterEmbed; 