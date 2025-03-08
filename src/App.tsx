import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Row, Col, Card, Avatar, Input, Button, Typography, Divider, Tag, message, Spin, Tabs } from 'antd';
import { TwitterTimelineEmbed } from 'react-twitter-embed';
import { PlusOutlined, UploadOutlined, SaveOutlined, DatabaseOutlined, TagOutlined } from '@ant-design/icons';
import { CookieConsent } from './components/CookieConsent';
import AccountList from './components/AccountList';
import TwitterImport from './components/TwitterImport';
import { AccountProps, loadLocalFollowingList, mergeWithAnnotatedAccounts } from './services/twitterService';
import { getAnnotatedAccounts, saveAnnotatedAccount, AnnotatedAccount } from './services/localStorageService';

const { TextArea } = Input;
const { Title } = Typography;
const { TabPane } = Tabs;

// 初始空数组，将在组件挂载时从JSON文件加载
const initialAccounts: AccountProps[] = [];

function App() {
  // 数据状态
  const [apiAccounts, setApiAccounts] = useState<AccountProps[]>(initialAccounts); // API获取的原始数据
  const [annotatedAccounts, setAnnotatedAccounts] = useState<AnnotatedAccount[]>([]); // 本地已标注数据
  const [displayAccounts, setDisplayAccounts] = useState<AccountProps[]>(initialAccounts); // 当前显示的混合数据
  
  // UI状态
  const [currentIndex, setCurrentIndex] = useState(0);
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all"); // 活动标签：all, annotated, pending

  // 处理导入的Twitter数据
  const handleImportData = (importedAccounts: AccountProps[]) => {
    // 设置为API数据
    setApiAccounts(importedAccounts);
    
    // 与已标注数据合并
    const merged = mergeWithAnnotatedAccounts(importedAccounts, annotatedAccounts);
    setDisplayAccounts(merged);
    setCurrentIndex(0);
    
    // 更新活动标签为"全部"，以显示所有导入的账号
    setActiveTab("all");
    
    message.success(`成功导入 ${importedAccounts.length} 个账号，其中 ${
      importedAccounts.filter(acc => acc.isAnnotated).length
    } 个已标注`);
  };

  // 计算待标注账号数量
  const pendingAccountsCount = useMemo(() => {
    if (!apiAccounts.length || !annotatedAccounts.length) return apiAccounts.length;
    
    // 过滤掉已经标注的账号
    return apiAccounts.filter(apiAccount => {
      // 检查ID是否在已标注列表中
      const isAnnotatedById = annotatedAccounts.some(
        annotatedAccount => annotatedAccount.id === apiAccount.id
      );
      
      // 检查用户名是否在已标注列表中
      const isAnnotatedByUsername = annotatedAccounts.some(
        annotatedAccount => 
          annotatedAccount.username.replace('@', '').toLowerCase() === 
          apiAccount.username.replace('@', '').toLowerCase()
      );
      
      // 如果既不在ID列表中也不在用户名列表中，则是待标注账号
      return !isAnnotatedById && !isAnnotatedByUsername;
    }).length;
  }, [apiAccounts, annotatedAccounts]);

  // 组件挂载时加载数据
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        
        // 1. 加载本地已标注数据
        const localAnnotated = getAnnotatedAccounts();
        setAnnotatedAccounts(localAnnotated);
        
        // 2. 加载API数据
        const apiData = await loadLocalFollowingList();
        setApiAccounts(apiData);
        
        // 3. 合并数据
        const mergedData = mergeWithAnnotatedAccounts(apiData, localAnnotated);
        setDisplayAccounts(mergedData);
        
        message.success(`成功加载 ${apiData.length} 个关注账号，其中 ${localAnnotated.length} 个已标注`);
      } catch (error) {
        console.error('加载数据失败:', error);
        message.error('加载数据失败，请检查数据格式');
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

  // 当切换标签时，更新显示的账号列表
  useEffect(() => {
    if (activeTab === "all") {
      // 显示全部账号(API和已标注的合并)
      setDisplayAccounts(mergeWithAnnotatedAccounts(apiAccounts, annotatedAccounts));
    } else if (activeTab === "annotated") {
      // 只显示已标注账号
      setDisplayAccounts(annotatedAccounts);
    } else if (activeTab === "pending") {
      // 只显示未标注账号
      const pendingAccounts = apiAccounts.filter(account => {
        // 查找该账号是否已被标注
        const isAnnotatedById = annotatedAccounts.some(
          annotated => annotated.id === account.id
        );
        
        const isAnnotatedByUsername = annotatedAccounts.some(
          annotated => 
            annotated.username.replace('@', '').toLowerCase() === 
            account.username.replace('@', '').toLowerCase()
        );
        
        return !isAnnotatedById && !isAnnotatedByUsername;
      });
      setDisplayAccounts(pendingAccounts);
    }
    
    // 重置当前选中的索引
    setCurrentIndex(0);
  }, [activeTab, apiAccounts, annotatedAccounts]);

  // 每次当前账号改变时，更新分类和备注信息
  useEffect(() => {
    if (displayAccounts.length === 0 || currentIndex >= displayAccounts.length) {
      setCategory("");
      setNotes("");
      return;
    }
    
    const current = displayAccounts[currentIndex];
    setCategory(current.category || "");
    setNotes(current.notes || "");
  }, [currentIndex, displayAccounts]);

  // 如果没有数据或正在加载，显示加载中状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spin size="large" tip="加载账号数据..." />
      </div>
    );
  }

  // 如果没有数据且加载完成，显示空状态
  if (displayAccounts.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="mb-4 text-lg">未找到账号数据</p>
        <Button 
          type="primary" 
          icon={<UploadOutlined />}
          onClick={() => setImportModalVisible(true)}
        >
          导入Twitter数据
        </Button>
        <TwitterImport 
          visible={importModalVisible}
          onCancel={() => setImportModalVisible(false)}
          onImport={handleImportData}
        />
      </div>
    );
  }

  const currentAccount = displayAccounts[currentIndex];

  // 处理标注当前账号
  const handleAnnotateCurrentAccount = () => {
    if (!currentAccount) return;
    
    // 创建标注数据
    const annotatedAccount = saveAnnotatedAccount(
      currentAccount, 
      notes
    );
    
    // 更新本地状态
    setAnnotatedAccounts(prevAnnotated => {
      const index = prevAnnotated.findIndex(a => a.id === annotatedAccount.id);
      if (index >= 0) {
        // 更新现有账号
        const updated = [...prevAnnotated];
        updated[index] = annotatedAccount;
        return updated;
      } else {
        // 添加新账号
        return [...prevAnnotated, annotatedAccount];
      }
    });
    
    // 更新当前显示的账号列表
    setDisplayAccounts(prevDisplay => {
      const updated = [...prevDisplay];
      updated[currentIndex] = {
        ...updated[currentIndex],
        category,
        notes,
        isAnnotated: true,
        annotatedAt: Date.now()
      };
      return updated;
    });
    
    message.success(`已标注账号: ${currentAccount.name}`);
  };

  const handleNext = () => {
    if (currentIndex < displayAccounts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // 处理关注状态切换
  const handleToggleFollow = (accountId: string, newFollowState: boolean) => {
    // 更新账号列表中的关注状态
    const updatedAccounts = displayAccounts.map(account => 
      account.id === accountId 
        ? { ...account, following: newFollowState } 
        : account
    );
    
    setDisplayAccounts(updatedAccounts);
    
    // 如果是已标注账号，也更新标注数据
    if (annotatedAccounts.some(a => a.id === accountId)) {
      const updatedAnnotated = annotatedAccounts.map(account => 
        account.id === accountId 
          ? { ...account, following: newFollowState } 
          : account
      );
      setAnnotatedAccounts(updatedAnnotated);
      // 保存到本地存储
      saveAnnotatedAccount({
        ...updatedAnnotated.find(a => a.id === accountId)!,
        following: newFollowState
      });
    }
    
    // 显示消息提示
    const accountName = displayAccounts.find(acc => acc.id === accountId)?.name;
    message.success(`${newFollowState ? '已关注' : '已取消关注'} ${accountName}`);
  };

  // 更新当前账号的分类
  const handleUpdateCategory = (newCategory: string) => {
    if (!currentAccount) return;
    
    // 更新显示账号的分类
    setCategory(newCategory);
    
    // 更新显示列表
    const updatedAccounts = displayAccounts.map((account, idx) => 
      idx === currentIndex
        ? { ...account, category: newCategory }
        : account
    );
    setDisplayAccounts(updatedAccounts);
  };

  // 分组选项
  const categoryOptions = ["技术学习", "编程", "AI讨论", "投资", "娱乐", "其他"];

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Row gutter={0} style={{ height: '100%' }}>
        {/* 左侧 - 账号列表 */}
        <Col span={6} style={{ height: '100%' }}>
          <div className="flex flex-col h-full">
            <div className="p-2 flex items-center justify-between border-b border-gray-200">
              <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                size="small"
                className="flex-1"
              >
                <TabPane
                  tab={
                    <span>
                      <DatabaseOutlined />
                      全部
                    </span>
                  }
                  key="all"
                />
                <TabPane
                  tab={
                    <span>
                      <TagOutlined />
                      已标注 ({annotatedAccounts.length})
                    </span>
                  }
                  key="annotated"
                />
                <TabPane
                  tab={
                    <span>
                      <DatabaseOutlined />
                      待标注 ({pendingAccountsCount})
                    </span>
                  }
                  key="pending"
                />
              </Tabs>
              <Button 
                type="primary" 
                icon={<UploadOutlined />} 
                size="small"
                onClick={() => setImportModalVisible(true)}
              >
                导入数据
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AccountList 
                accounts={displayAccounts} 
                currentIndex={currentIndex} 
                onSelectAccount={setCurrentIndex} 
                onToggleFollow={handleToggleFollow}
              />
            </div>
          </div>
        </Col>

        {/* 中间 - 推特主页嵌入 */}
        <Col span={10} style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #f0f0f0' }}>
          <div className="p-4 pb-0">
            <Title level={3} className="mb-2">
              {currentAccount.name} 的推特主页
              {currentAccount.isAnnotated && (
                <Tag color="green" className="ml-2">已标注</Tag>
              )}
            </Title>
          </div>
          
          <div style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column' }}>
            {/* 推特组件容器 */}
            <div style={{ flex: 1, minHeight: '650px' }}>
              <TwitterTimelineEmbed
                sourceType="profile"
                screenName={currentAccount.username.replace("@", "")}
                options={{ height: 720 }}
                noHeader
                noFooter
                transparent
              />
            </div>
            
            {/* 导航按钮 */}
            <div className="flex justify-between p-4">
              <Button onClick={handlePrev} disabled={currentIndex === 0}>
                上一个账号
              </Button>
              <Button onClick={handleNext} disabled={currentIndex === displayAccounts.length - 1}>
                下一个账号
              </Button>
            </div>
          </div>
        </Col>
        
        {/* 右侧 - 分类与备注 */}
        <Col span={8} style={{ height: '100%', overflowY: 'auto' }}>
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <Title level={3} className="m-0">分组 & 备注</Title>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={handleAnnotateCurrentAccount}
              >
                保存标注
              </Button>
            </div>
            
            <div className="mb-4">
              <div className="mb-2 font-semibold">选择分组:</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {categoryOptions.map(cat => (
                  <Tag 
                    key={cat}
                    color={category === cat ? "blue" : "default"}
                    className="cursor-pointer px-3 py-1"
                    onClick={() => handleUpdateCategory(cat)}
                  >
                    {cat}
                  </Tag>
                ))}
              </div>
              <Input 
                placeholder="输入自定义分组" 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                suffix={
                  <Button 
                    type="link" 
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      if (category.trim()) {
                        handleUpdateCategory(category.trim());
                        message.success(`已更新分组为 "${category.trim()}"`);
                      }
                    }}
                  >
                    添加
                  </Button>
                }
              />
            </div>
            
            <Divider />
            
            <div className="mb-4">
              <div className="mb-2 font-semibold">添加备注:</div>
              <TextArea 
                rows={6}
                placeholder="在这里输入关于该账号的备注内容..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="text-right mt-2">
                <Button 
                  type="primary"
                  onClick={handleAnnotateCurrentAccount}
                >
                  保存备注
                </Button>
              </div>
            </div>
            
            {currentAccount.isAnnotated && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p className="text-gray-500 text-sm">
                  此账号已标注 · 
                  {currentAccount.annotatedAt && (
                    <span>
                      {new Date(currentAccount.annotatedAt).toLocaleString()}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* Twitter数据导入对话框 */}
      <TwitterImport 
        visible={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onImport={handleImportData}
      />
      
      <CookieConsent />
    </Layout>
  );
}

export default App;

