import React, { useEffect, useState, useRef } from 'react';
import './TwitterEmbed.css';

interface TwitterEmbedProps {
  screenName?: string; // 可选的Twitter用户名参数
}

const TwitterEmbed: React.FC<TwitterEmbedProps> = ({ screenName }) => {
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // 使用iframe加载HTML内容
    const handleIframeLoad = () => {
      setLoading(false);
    };

    // 添加iframe加载事件
    if (iframeRef.current) {
      iframeRef.current.onload = handleIframeLoad;
    }

    return () => {
      // 清理事件监听器
      if (iframeRef.current) {
        iframeRef.current.onload = null;
      }
    };
  }, []);

  return (
    <div className="twitter-embed-container">
      {loading && (
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src="/user_data.html"
        className={`twitter-iframe ${loading ? 'loading' : 'loaded'}`}
        title="Twitter Profile"
        frameBorder="0"
        scrolling="yes"
        width="100%"
        height="100%"
      ></iframe>
    </div>
  );
};

export default TwitterEmbed; 