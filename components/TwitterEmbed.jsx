import React, { useEffect, useState, useRef } from 'react';
import './TwitterEmbed.css';

const TwitterEmbed = () => {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchHtmlContent = async () => {
      try {
        setLoading(true);
        // 从public目录加载HTML文件
        const response = await fetch('/user_data.html');
        const html = await response.text();
        setHtmlContent(html);
        setLoading(false);
      } catch (error) {
        console.error('加载HTML文件出错:', error);
        setLoading(false);
      }
    };

    fetchHtmlContent();
  }, []);

  // 当HTML内容加载后，将其设置到容器中
  useEffect(() => {
    if (htmlContent && containerRef.current) {
      // 从HTML中提取<body>标签内容
      const bodyContent = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || htmlContent;
      containerRef.current.innerHTML = bodyContent;
    }
  }, [htmlContent]);

  return (
    <div className="twitter-embed-container">
      {loading ? (
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      ) : (
        <div ref={containerRef} className="twitter-content-container"></div>
      )}
    </div>
  );
};

export default TwitterEmbed; 