import React, { useState, useEffect } from 'react';
import { handleCookiesConsent } from '../services/tweetService';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 检查是否已经同意cookies
    const hasConsent = localStorage.getItem('cookies_consent');
    if (!hasConsent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    handleCookiesConsent();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 z-50">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex-1 mr-4 mb-4 md:mb-0">
          <p className="text-sm">
            网页内嵌入了第三方内容，需要处理cookies。
            我们使用cookies来增强您的浏览体验并提供个性化内容。
            继续使用本网站即表示您同意我们的cookies政策。
          </p>
        </div>
        <div className="flex space-x-4">
          <button
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm"
            onClick={() => setIsVisible(false)}
          >
            稍后
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
            onClick={handleAccept}
          >
            接受
          </button>
        </div>
      </div>
    </div>
  );
}; 