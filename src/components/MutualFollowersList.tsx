import React, { useState, useEffect, useRef } from 'react';
import { List, Avatar, Spin, Empty, Typography, Badge } from 'antd';
import { fetchMutualFollowers } from '../services/twitterService';

const { Text, Title } = Typography;

interface MutualFollowersListProps {
  username: string;
  visible: boolean;
  onClose: () => void;
  position: { top: number; left: number };
}

const MutualFollowersList: React.FC<MutualFollowersListProps> = ({
  username,
  visible,
  onClose,
  position
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // 调整位置以确保在视口内
  useEffect(() => {
    if (visible && popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let newLeft = position.left;
      let newTop = position.top;
      
      // 确保不超出右侧边界
      if (rect.right > viewportWidth) {
        newLeft = Math.max(0, viewportWidth - rect.width);
      }
      
      // 确保不超出底部边界
      if (rect.bottom > viewportHeight) {
        newTop = Math.max(0, position.top - rect.height - 10); // 在点击元素上方显示
      }
      
      setAdjustedPosition({ top: newTop, left: newLeft });
    } else {
      setAdjustedPosition(position);
    }
  }, [position, visible]);

  // 处理浮窗内部点击，阻止冒泡
  const handlePopupClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 加载共同关注者数据
  useEffect(() => {
    if (visible && username) {
      const fetchData = async () => {
        try {
          setLoading(true);
          setError(null);
          const result = await fetchMutualFollowers(username);
          console.log('共同关注者数据:', result);
          console.log('真实总数量:', result.data?.realTotal, '实际加载数量:', result.data?.total);
          setData(result);
        } catch (err) {
          setError(err instanceof Error ? err.message : '获取共同关注者失败');
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [visible, username]);

  if (!visible) return null;

  return (
    <div
      ref={popupRef}
      className="mutual-followers-popup"
      onClick={handlePopupClick}
      style={{
        position: 'fixed', // 改为fixed定位，避免滚动影响
        zIndex: 1000,
        top: adjustedPosition.top,
        left: adjustedPosition.left,
        width: '320px',
        maxHeight: '400px',
        backgroundColor: 'white',
        border: '1px solid #f0f0f0',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #f0f0f0', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <Title level={5} style={{ margin: 0 }}>共同关注列表</Title>
        <Badge count={data?.data?.realTotal || data?.data?.total || 0} overflowCount={999} />
      </div>

      <div style={{ overflow: 'auto', maxHeight: '350px', padding: '0 0' }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Spin />
            <p style={{ marginTop: '10px' }}>加载共同关注者...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
            <p>{error}</p>
          </div>
        ) : data?.data?.accounts?.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={data.data.accounts}
            renderItem={(item: any) => (
              <List.Item style={{ padding: '8px 16px', borderBottom: '1px solid #f5f5f5' }}>
                <List.Item.Meta
                  avatar={<Avatar src={item.avatar} />}
                  title={
                    <a 
                      href={`https://twitter.com/${item.username}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#1DA1F2', fontWeight: 500 }}
                    >
                      {item.name || item.username}
                      {item.isBlueVerified && <span style={{ color: '#1DA1F2', marginLeft: '4px' }}>✓</span>}
                    </a>
                  }
                  description={
                    <div>
                      <Text type="secondary">@{item.username.replace('@', '')}</Text>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {item.metrics && (
                          <>
                            <span>{item.metrics.followers} 关注者</span>
                            <span style={{ margin: '0 8px' }}>•</span>
                            <span>{item.metrics.following} 正在关注</span>
                          </>
                        )}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="没有找到共同关注者" style={{ padding: '20px 0' }} />
        )}
      </div>
    </div>
  );
};

export default MutualFollowersList; 