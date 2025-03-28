import React, { useEffect, useState, useRef } from 'react';
import './TwitterEmbed.css';
import axios from 'axios';
import { Spin, Button, message } from 'antd';
import { UsergroupAddOutlined, UserDeleteOutlined } from '@ant-design/icons';
import MutualFollowersList from './MutualFollowersList';
import { fetchMutualFollowers } from '../services/twitterService';

interface TwitterEmbedProps {
  screenName?: string; // 可选的Twitter用户名参数
}

// API服务器URL - 可以根据环境变量或配置文件设置
const API_BASE_URL = 'http://localhost:3001';

const TwitterEmbed: React.FC<TwitterEmbedProps> = ({ screenName = 'dotyyds1234' }) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 共同关注状态
  const [mutualCount, setMutualCount] = useState<number>(0);
  const [loadingMutual, setLoadingMutual] = useState<boolean>(false);
  const [mutualPopupVisible, setMutualPopupVisible] = useState<boolean>(false);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const [unfollowing, setUnfollowing] = useState<boolean>(false);

  // 调整iframe高度以填充容器
  const adjustHeight = () => {
    if (iframeRef.current && containerRef.current) {
      const containerHeight = containerRef.current.clientHeight;
      iframeRef.current.style.height = `${containerHeight}px`;
    }
  };

  // 监听窗口大小变化
  useEffect(() => {
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, []);
  
  // 获取共同关注者数量
  useEffect(() => {
    const getMutualFollowersCount = async () => {
      if (!screenName) return;
      
      try {
        setLoadingMutual(true);
        const result = await fetchMutualFollowers(screenName);
        if (result && result.data && result.data.accounts) {
          setMutualCount(result.data.total || result.data.accounts.length);
        }
      } catch (error) {
        console.error("获取共同关注数据失败:", error);
        setMutualCount(0);
      } finally {
        setLoadingMutual(false);
      }
    };
    
    getMutualFollowersCount();
  }, [screenName]);
  
  // 处理切换共同关注浮窗
  const handleToggleMutualPopup = () => {
    console.log("按钮被点击，当前浮窗状态:", mutualPopupVisible);
    
    // 如果浮窗已经显示，则关闭
    if (mutualPopupVisible) {
      console.log("正在关闭浮窗");
      setMutualPopupVisible(false);
    } else {
      // 如果浮窗未显示，则打开并设置位置
      console.log("正在打开浮窗");
      if (buttonContainerRef.current) {
        const rect = buttonContainerRef.current.getBoundingClientRect();
        setPopupPosition({
          top: rect.bottom + 5,
          left: rect.left
        });
        setMutualPopupVisible(true);
      }
    }
  };
  
  // 点击外部区域关闭浮窗 - 简化这部分逻辑，避免冲突
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 检查点击是否在浮窗和按钮外部
      if (
        mutualPopupVisible && 
        buttonContainerRef.current && 
        !buttonContainerRef.current.contains(event.target as Node)
      ) {
        // 这里不检查是否点击在浮窗内，让浮窗组件自己处理这个逻辑
        console.log("点击在按钮外部，关闭浮窗");
        setMutualPopupVisible(false);
      }
    };

    if (mutualPopupVisible) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [mutualPopupVisible]);

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
  }, [screenName]);

  // 当HTML内容加载后
  useEffect(() => {
    if (htmlContent && iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (iframeDoc) {
        // 写入完整的HTML内容，包含所有样式
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        
        // 添加额外的样式，调整内容宽度和确保认证标志显示
        iframeDoc.write(`
          <style>
            body {
              max-width: 700px !important;
              margin: 0 auto !important;
              overflow-x: hidden !important;
              padding: 15px 20px !important;
            }
            
            /* 确保所有内容可见 */
            .profile-stats {
              display: flex !important;
              flex-wrap: wrap !important;
              margin-top: 15px !important;
              width: 100% !important;
              justify-content: flex-start !important;
            }
            
            .profile-stat {
              margin-right: 20px !important;
              margin-bottom: 10px !important;
              white-space: nowrap !important;
              min-width: 60px !important;
            }
            
            /* 确保只在中央个人资料页面显示蓝V */
            .verified-badge {
              display: inline-flex !important;
              margin-left: 4px !important;
              vertical-align: middle !important;
              width: 18px !important;
              height: 18px !important;
              background-color: #1DA1F2 !important;
              border-radius: 50% !important;
              align-items: center !important;
              justify-content: center !important;
              color: white !important;
              font-size: 12px !important;
              font-weight: bold !important;
              line-height: 1 !important;
            }
            
            /* 优化名字和认证标志容器 */
            .profile-name-container {
              display: flex !important;
              align-items: center !important;
              flex-wrap: nowrap !important;
              margin-bottom: 4px !important;
            }
            
            .profile-name {
              margin-right: 4px !important;
            }
            
            /* 确保文本不溢出容器 */
            p, div, span, h1, h2, h3, h4, h5, h6 {
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
            }
            
            /* 确保图片响应式适应宽度 */
            img, video {
              max-width: 100% !important;
              height: auto !important;
            }
            
            /* 确保统计数据正确显示 */
            .profile-stat-value {
              font-weight: 700 !important;
              font-size: 15px !important;
            }
            
            .profile-stat-label {
              color: #536471 !important;
              font-size: 14px !important;
            }
            
            @media (max-width: 800px) {
              body {
                max-width: 95% !important;
              }
              
              .profile-stats {
                justify-content: space-between !important;
              }
              
              .profile-stat {
                flex: 0 0 auto !important;
                margin-right: 10px !important;
              }
            }
          </style>
        `);
        
        iframeDoc.close();
        
        // 添加事件监听器处理iframe内部链接
        iframeDoc.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'A') {
            e.preventDefault();
            const href = (target as HTMLAnchorElement).href;
            if (href) {
              window.open(href, '_blank');
            }
          }
        });
        
        // 调整高度
        adjustHeight();
      }
    }
  }, [htmlContent]);

  // 处理取消关注
  const handleUnfollow = async () => {
    try {
      setUnfollowing(true);
      console.log(`[取消关注] 开始取消关注用户: ${screenName}`);
      
      // 直接使用用户名调用API
      const response = await axios.post(`${API_BASE_URL}/api/unfollow`, { username: screenName });
      
      if (response.data.success) {
        message.success('成功取消关注');
        console.log('[取消关注] 成功:', response.data);
      } else {
        throw new Error(response.data.message || '取消关注失败');
      }
    } catch (error: unknown) {
      console.error('[取消关注] 失败:', error);
      message.error(`取消关注失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setUnfollowing(false);
    }
  };

  return (
    <div ref={containerRef} className="twitter-embed-container">
      {/* 共同关注按钮和取消关注按钮 */}
      {!loading && !error && screenName && (
        <div className="profile-actions">
          {mutualCount > 0 && (
            <div 
              ref={buttonContainerRef}
              className="mutual-followers-button-container"
              style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                zIndex: 100
              }}
            >
              <Button
                type="primary"
                icon={<UsergroupAddOutlined />}
                loading={loadingMutual}
                onClick={handleToggleMutualPopup}
                className={mutualPopupVisible ? 'mutual-button-active' : ''}
              >
                {loadingMutual ? '加载中' : `${mutualCount} 共同关注`}
              </Button>
            </div>
          )}
          
          {/* 取消关注按钮 */}
          <div 
            className="unfollow-button-container"
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 100
            }}
          >
            <Button
              danger
              type="primary"
              icon={<UserDeleteOutlined />}
              loading={unfollowing}
              onClick={handleUnfollow}
            >
              取消关注
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <Spin tip="加载中..." size="large" />
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
        <iframe 
          ref={iframeRef}
          className="twitter-iframe"
          title={`${screenName}的Twitter资料`}
          sandbox="allow-same-origin allow-scripts"
          scrolling="yes"
        />
      )}
      
      {/* 共同关注浮窗 - 简化浮窗的条件渲染逻辑 */}
      {mutualPopupVisible && screenName && (
        <MutualFollowersList
          username={screenName}
          visible={true} // 改为固定值，因为我们已经在外层条件控制了渲染
          onClose={() => {
            console.log("浮窗组件请求关闭");
            setMutualPopupVisible(false);
          }}
          position={popupPosition}
        />
      )}
    </div>
  );
};

export default TwitterEmbed; 