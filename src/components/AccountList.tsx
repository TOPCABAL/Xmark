import React, { useState, useEffect, useRef } from 'react';
import { Card, Avatar, Button, Tooltip, Input, Empty, message, Tag } from 'antd';
import { CheckCircleFilled, UserOutlined, SearchOutlined, TeamOutlined, TwitterOutlined, TagOutlined } from '@ant-design/icons';
import { AccountProps } from '../services/twitterService';

// 组件属性接口
interface AccountListProps {
  accounts: AccountProps[];
  currentIndex: number;
  onSelectAccount: (index: number) => void;
  onToggleFollow?: (accountId: string, newFollowState: boolean) => void;
}

// 分组类型
type GroupFilter = 'all';

const AccountList: React.FC<AccountListProps> = ({ 
  accounts, 
  currentIndex, 
  onSelectAccount,
  onToggleFollow
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [filteredAccounts, setFilteredAccounts] = useState<AccountProps[]>(accounts);
  const [localAccounts, setLocalAccounts] = useState<AccountProps[]>(accounts);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 当传入的账号列表发生变化时，更新本地账号列表
  useEffect(() => {
    setLocalAccounts(accounts);
  }, [accounts]);

  // 当搜索词或分组过滤器发生变化时，过滤账号
  useEffect(() => {
    const filtered = localAccounts.filter(account => {
      // 搜索过滤
      const matchesSearch = 
        searchTerm === '' || 
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        account.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (account.description && account.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    });
    
    setFilteredAccounts(filtered);
    
    // 重置滚动位置
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [searchTerm, localAccounts]);

  // 获取原始账号的索引
  const getOriginalIndex = (account: AccountProps) => {
    return accounts.findIndex(a => a.id === account.id);
  };

  // 处理关注/取消关注
  const handleToggleFollow = (e: React.MouseEvent, account: AccountProps) => {
    e.stopPropagation(); // 阻止冒泡，避免触发卡片的点击事件

    const newFollowState = !account.following;
    
    // 如果提供了外部处理函数，则调用它
    if (onToggleFollow) {
      onToggleFollow(account.id, newFollowState);
    } else {
      // 否则在本地状态中更新
      const newAccounts = localAccounts.map(item => 
        item.id === account.id 
          ? { ...item, following: newFollowState } 
          : item
      );
      
      setLocalAccounts(newAccounts);
      
      // 显示消息提示
      message.success(`${newFollowState ? '已关注' : '已取消关注'} ${account.name}`);
    }
  };

  // 计算是否需要填充底部空间
  const needsExtraPadding = filteredAccounts.length < 5;
  // 根据过滤结果数量动态计算填充高度
  const extraPaddingHeight = needsExtraPadding 
    ? `${Math.max(500 - filteredAccounts.length * 100, 100)}px` 
    : '0px';

  // 格式化关注者数量
  const formatNumber = (num?: number) => {
    if (num === undefined) return '';
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    return (num / 1000000).toFixed(1) + 'M';
  };

  return (
    <div className="flex flex-col h-full border-r border-gray-200" style={{ height: '100vh', maxHeight: '100vh' }}>
      <div className="sticky top-0 bg-white z-10 p-3 pb-2 space-y-2 border-b border-gray-100">
        <h2 className="text-xl font-bold mt-0 mb-2">关注列表</h2>
        
        {/* 搜索输入框 */}
        <Input
          placeholder="搜索账号"
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          allowClear
          className="rounded-full bg-gray-100 border-none hover:bg-gray-200 focus:bg-white"
        />
      </div>
      
      {/* 确保这个容器可以滚动 */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 custom-scrollbar"
        style={{
          minHeight: '300px',
          height: 'calc(100vh - 170px)',
          overflowY: 'scroll',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '20px',
          position: 'relative' // 为绝对定位的子元素提供参考
        }}
      >
        <div className="p-4 pt-2 space-y-2">
          {filteredAccounts.length > 0 ? (
            filteredAccounts.map((account) => {
              const originalIndex = getOriginalIndex(account);
              return (
                <Card
                  key={account.id}
                  className={`cursor-pointer transition-all hover:bg-gray-50 ${
                    currentIndex === originalIndex ? "bg-blue-50" : ""
                  }`}
                  bodyStyle={{ padding: '12px' }}
                  onClick={() => onSelectAccount(originalIndex)}
                >
                  <div className="flex items-start">
                    <div className="mr-3">
                      {account.avatar ? (
                        <Avatar size={48} src={account.avatar} />
                      ) : (
                        <Avatar size={48} icon={<UserOutlined />} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-900 truncate mr-1">
                          {account.name}
                        </span>
                        {account.verified && (
                          <Tooltip title="已认证账号">
                            <CheckCircleFilled className="text-blue-400" />
                          </Tooltip>
                        )}
                        {account.isAnnotated && (
                          <Tooltip title="已标注">
                            <Tag color="green" className="ml-1 flex items-center" style={{ padding: '0 4px', margin: 0 }}>
                              <TagOutlined style={{ fontSize: '10px' }} />
                            </Tag>
                          </Tooltip>
                        )}
                      </div>
                      <div className="text-gray-500 text-sm truncate">
                        {account.username}
                      </div>
                      
                      {/* 用户描述 */}
                      {account.description && (
                        <div className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {account.description}
                        </div>
                      )}
                      
                      {/* 用户指标 */}
                      {account.metrics && (
                        <div className="mt-1 flex text-xs text-gray-500 space-x-3">
                          <span className="flex items-center">
                            <TeamOutlined className="mr-1" /> 
                            {formatNumber(account.metrics.followers)}
                          </span>
                          <span className="flex items-center">
                            <TwitterOutlined className="mr-1" /> 
                            {formatNumber(account.metrics.tweets)}
                          </span>
                        </div>
                      )}
                      
                      {account.category && (
                        <div className="mt-1">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                            {account.category}
                          </span>
                        </div>
                      )}
                      
                      {/* 显示多标签 */}
                      {account.categories && account.categories.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {account.categories.map(tag => (
                            <span key={tag} className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {account.following !== undefined && (
                      <div className="ml-2" onClick={e => handleToggleFollow(e, account)}>
                        <Button
                          size="small"
                          type={account.following ? "default" : "primary"}
                          className={account.following ? "border-gray-300 hover:border-red-400 hover:text-red-500" : ""}
                          style={{ 
                            borderRadius: '16px',
                            fontWeight: 500,
                            minWidth: '68px'
                          }}
                        >
                          {account.following ? "已关注" : "关注"}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          ) : (
            <Empty 
              description="没有找到匹配的账号" 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
              className="my-8 py-12"
            />
          )}
          
          {/* 添加额外空间确保滚动区域足够大 */}
          {needsExtraPadding && (
            <div style={{ minHeight: extraPaddingHeight }}></div>
          )}
        </div>
        
        {/* 添加一个固定在底部的伪元素，确保可以滚动 */}
        <div style={{ 
          position: 'absolute', 
          bottom: '0', 
          height: '1px', 
          width: '100%',
          opacity: 0
        }}></div>
      </div>
    </div>
  );
};

export default AccountList; 