import { useState, useEffect, useMemo } from 'react';
import { Layout, Row, Col, Input, Button, Typography, Divider, Tag, message, Spin, Tabs, InputNumber, Select } from 'antd';
import { 
  PlusOutlined, 
  UploadOutlined, 
  SaveOutlined, 
  DatabaseOutlined, 
  TagOutlined,
  ExportOutlined,
  TwitterOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { CookieConsent } from './components/CookieConsent';
import AccountList from './components/AccountList';
import TwitterImport from './components/TwitterImport';
import ExportModal from './components/ExportModal';
import { AccountProps, loadLocalFollowingList, mergeWithAnnotatedAccounts, fetchUserFollowing, testServerConnection } from './services/twitterService';
import { getAnnotatedAccounts, saveAnnotatedAccount, AnnotatedAccount } from './services/localStorageService';
import TwitterSelector from "./components/TwitterSelector";
import TwitterEmbed from './components/TwitterEmbed';
// 导入数据库服务
import { fetchAccountsFromDB, fetchCategoriesFromDB, saveAnnotationToDB, exportDataFromDB, fetchDBStats, AccountFilterOptions, addCategoryToDB } from './services/dbService';

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
  const [categories, setCategories] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all"); // 活动标签：all, annotated, pending
  const [twitterLoading, setTwitterLoading] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [fetchingFollowing, setFetchingFollowing] = useState(false);
  const [pagesCount, setPagesCount] = useState(0); // 页数设置，默认0页表示自动计算
  const [availableCategories, setAvailableCategories] = useState<string[]>([]); // 可用的分类列表
  const [newCategoryInput, setNewCategoryInput] = useState(''); // 新增：添加分类输入框的值
  
  // 当前选中的Twitter用户名
  const [currentScreenName, setCurrentScreenName] = useState<string>('');

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

  // 初始化数据
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        
        // 1. 测试服务器连接
        const serverStatus = await testServerConnection();
        if (!serverStatus.success) {
          message.error(`无法连接到服务器: ${serverStatus.message}`);
          console.error('服务器连接测试失败:', serverStatus.message);
          setLoading(false);
          return;
        }
        
        console.log('成功连接到服务器:', serverStatus);
        
        // 2. 测试API连接 - 获取分类列表
        try {
          console.log('正在验证API连接...');
          const categoriesFromDB = await fetchCategoriesFromDB();
          console.log(`API连接成功，获取到 ${categoriesFromDB.length} 个分类`);
        } catch (apiError) {
          console.error('API连接测试失败:', apiError);
          message.warning('API连接测试失败，某些功能可能无法正常工作');
        }
        
        // 3. 从数据库加载账号数据
        const accountsFromDB = await fetchAccountsFromDB({
          limit: 1000, // 设置较大的限制，获取更多数据
          sortBy: 'import_date', 
          sortOrder: 'DESC'
        });
        
        // 设置获取的数据
        setApiAccounts(accountsFromDB);
        setDisplayAccounts(accountsFromDB);
        
        // 提取已标注的账号
        const annotatedFromDB = accountsFromDB.filter(account => account.isAnnotated) as unknown as AnnotatedAccount[];
        setAnnotatedAccounts(annotatedFromDB);
        
        // 4. 加载统计数据
        try {
          const stats = await fetchDBStats();
          message.success(`成功加载 ${stats.totalAccounts} 个账号，其中 ${stats.annotatedAccounts} 个已标注，共 ${stats.totalCategories} 个分类`);
        } catch (error) {
          console.warn('获取统计数据失败', error);
          message.success(`成功加载 ${accountsFromDB.length} 个账号`);
        }
        
        // 5. 加载分类列表
        const categoriesFromDB = await fetchCategoriesFromDB();
        setAvailableCategories(categoriesFromDB.map(cat => cat.name));
      } catch (error) {
        console.error('加载数据失败:', error);
        message.error('加载数据失败，请确保后端服务已启动');
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
      setCategories([]);
      setNotes("");
      return;
    }
    
    const current = displayAccounts[currentIndex];
    // 兼容旧版和新版数据格式
    const currentCategories = current.categories || (current.category ? [current.category] : []);
    setCategories(currentCategories);
    setNotes(current.notes || "");
  }, [currentIndex, displayAccounts]);

  // 处理选择账号
  const handleSelectAccount = (index: number) => {
    setCurrentIndex(index);
    
    if (index >= 0 && index < displayAccounts.length) {
      const account = displayAccounts[index];
      // 兼容旧版和新版数据格式
      const accountCategories = account.categories || (account.category ? [account.category] : []);
      setCategories(accountCategories);
      setNotes(account.notes || "");
      
      // 设置当前选中用户名
      setCurrentScreenName(account.username);
    }
  };

  // 处理Twitter嵌入组件加载完成事件
  const handleTwitterLoaded = () => {
    setTwitterLoading(false);
  };

  // 添加useEffect来处理Twitter加载状态
  useEffect(() => {
    // 每当currentIndex变化时，重置Twitter加载状态
    setTwitterLoading(true);
    
    // 模拟加载延迟，1秒后设置为加载完成
    const timer = setTimeout(() => {
      setTwitterLoading(false);
    }, 1000);
    
    // 清理函数
    return () => clearTimeout(timer);
  }, [currentIndex]);

  // 处理获取用户关注列表
  const handleFetchFollowing = async () => {
    if (!usernameInput.trim()) {
      message.error('请输入有效的用户名');
      return;
    }

    try {
      setFetchingFollowing(true);
      message.loading({ 
        content: `正在获取 ${usernameInput} 的关注列表，${pagesCount === 0 ? '自动计算页数' : `将获取 ${pagesCount} 页数据`}...`, 
        key: 'fetchFollowing', 
        duration: 0 
      });
      
      console.log(`===== 开始获取关注列表 =====`);
      console.log(`用户名: ${usernameInput}, 页数: ${pagesCount === 0 ? '自动计算' : pagesCount}`);
      
      // 先测试服务器连接
      console.log(`测试服务器连接...`);
      const testResult = await testServerConnection();
      
      if (!testResult.success) {
        console.error(`服务器连接测试失败: ${testResult.message}`);
        message.error({ 
          content: `无法连接到服务器: ${testResult.message}`, 
          key: 'fetchFollowing', 
          duration: 5 
        });
        setFetchingFollowing(false);
        return;
      }
      
      console.log(`服务器连接测试成功，服务器时间: ${testResult.serverTime}`);
      console.log(`开始获取关注列表数据...`);
      
      // 调用API获取用户关注列表，传入页数参数
      const accounts = await fetchUserFollowing(usernameInput, pagesCount);
      console.log(`成功获取关注列表，共 ${accounts.length} 个账号`);
      
      // 处理获取的关注列表
      handleImportData(accounts);
      
      message.success({ 
        content: `成功导入 ${usernameInput} 的关注列表，共 ${accounts.length} 个账号`, 
        key: 'fetchFollowing',
        duration: 3 
      });
      
      // 清空输入框
      setUsernameInput('');
    } catch (error) {
      console.error('获取关注列表失败:', error);
      message.error({ 
        content: `获取关注列表失败: ${error instanceof Error ? error.message : '未知错误'}`, 
        key: 'fetchFollowing', 
        duration: 5 
      });
    } finally {
      setFetchingFollowing(false);
      console.log(`===== 结束获取关注列表 =====`);
    }
  };

  // 处理添加分类
  const handleAddCategory = (newCategory: string) => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory)) {
      message.warning('该分类已存在');
      return;
    }
    setCategories([...categories, newCategory]);
    setAvailableCategories(prev => {
      if (!prev.includes(newCategory)) {
        return [...prev, newCategory];
      }
      return prev;
    });
  };

  // 添加新分类到数据库
  const addNewCategory = async (categoryName: string) => {
    if (!categoryName.trim()) {
      message.warning('分类名称不能为空');
      return;
    }
    
    try {
      message.loading({ content: `正在添加分类 ${categoryName}...`, key: 'addCategory' });
      console.log(`[添加分类] 开始添加分类: ${categoryName}`);
      
      // 添加到数据库
      const success = await addCategoryToDB(categoryName);
      
      if (success) {
        message.success({ content: `成功添加分类 ${categoryName}`, key: 'addCategory' });
        console.log(`[添加分类] 成功添加分类到数据库: ${categoryName}`);
        
        // 更新可用分类列表
        try {
          console.log(`[添加分类] 正在刷新分类列表...`);
          const categoriesFromDB = await fetchCategoriesFromDB();
          setAvailableCategories(categoriesFromDB.map(cat => cat.name));
          console.log(`[添加分类] 分类列表已更新，共 ${categoriesFromDB.length} 个分类`);
          
          // 添加到当前选中的分类
          handleAddCategory(categoryName);
        } catch (refreshError) {
          console.error('[添加分类] 刷新分类列表失败:', refreshError);
          message.warning('分类已添加，但刷新列表失败，请手动刷新页面');
        }
      }
    } catch (error) {
      console.error('[添加分类] 添加分类失败:', error);
      console.error('[添加分类] 错误详情:', JSON.stringify(error));
      message.error({ 
        content: `添加分类失败: ${error instanceof Error ? error.message : '未知错误'}`, 
        key: 'addCategory',
        duration: 5
      });
    }
  };

  // 处理删除分类
  const handleRemoveCategory = (categoryToRemove: string) => {
    setCategories(categories.filter(cat => cat !== categoryToRemove));
  };

  // 处理保存标注
  const handleAnnotateCurrentAccount = async () => {
    if (currentIndex < 0 || currentIndex >= displayAccounts.length) {
      message.warning('请先选择一个账号');
      return;
    }

    const currentAccount = displayAccounts[currentIndex];
    
    try {
      // 保存到数据库
      await saveAnnotationToDB(
        currentAccount.username,
        categories,
        notes
      );
      
      // 更新本地状态
      const updatedAccount: AnnotatedAccount = {
        ...currentAccount,
        category: categories[0] || '', // 保持向后兼容
        categories: categories,
        notes,
        isAnnotated: true,
        annotatedAt: Date.now()  // 使用数字时间戳
      };
      
      // 更新显示列表中的账号
      const newDisplayAccounts = [...displayAccounts];
      newDisplayAccounts[currentIndex] = updatedAccount;
      setDisplayAccounts(newDisplayAccounts);
      
      // 更新已标注账号列表
      const newAnnotatedAccounts = [...annotatedAccounts];
      const existingIndex = newAnnotatedAccounts.findIndex(
        acc => acc.id === currentAccount.id
      );
      
      if (existingIndex >= 0) {
        newAnnotatedAccounts[existingIndex] = updatedAccount;
      } else {
        newAnnotatedAccounts.push(updatedAccount);
      }
      setAnnotatedAccounts(newAnnotatedAccounts);
      
      message.success('标注保存成功');
    } catch (error) {
      console.error('保存标注失败:', error);
      message.error('保存标注失败，请重试');
    }
  };

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
        <div className="w-full max-w-xl px-4">
          {/* 导入导出按钮行 - 使用inline-block强制显示在一行 */}
          <div className="mb-2" style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <Button 
              type="primary" 
              icon={<UploadOutlined />} 
              size="small"
              onClick={() => setImportModalVisible(true)}
              style={{ marginRight: '8px' }}
            >
              导入数据
            </Button>
            <Button 
              type="primary" 
              icon={<ExportOutlined />} 
              size="small"
              onClick={() => setExportModalVisible(true)}
              style={{ marginRight: '8px' }}
            >
              导出数据
            </Button>
            
            <span style={{ fontSize: '12px', marginRight: '4px' }}>确认页数:</span>
            <InputNumber 
              min={0} 
              max={10} 
              value={pagesCount}
              onChange={(value) => setPagesCount(value as number)} 
              size="small"
              style={{ width: '50px', margin: '0 4px' }} 
            />
            <span style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap' }}>{pagesCount === 0 ? '0代表自动计算页数' : `约 ${pagesCount * 50} 账号`}</span>
          </div>
          
          {/* 搜索框单独一行 */}
          <div className="mb-1">
            <Input
              placeholder="输入Twitter用户名以获取关注列表"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              onPressEnter={handleFetchFollowing}
              suffix={
                <Button
                  type="link"
                  size="small"
                  icon={<SearchOutlined />}
                  loading={fetchingFollowing}
                  onClick={handleFetchFollowing}
                />
              }
            />
          </div>
          
          {/* 标签页导航 */}
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            size="small"
            className="w-full"
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
        </div>
        <TwitterImport 
          visible={importModalVisible}
          onCancel={() => setImportModalVisible(false)}
          onImport={handleImportData}
        />
      </div>
    );
  }

  const currentAccount = displayAccounts[currentIndex];

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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <CookieConsent />
      
      <Layout.Content style={{ padding: '0', display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        {/* 左侧侧边栏 - 账号列表 */}
        <div style={{ width: '30%', borderRight: '1px solid #f0f0f0', overflowY: 'auto', height: '100%' }}>
          <div className="flex flex-col h-full">
            <div className="p-2 border-b border-gray-200">
              {/* 导入导出按钮行 - 使用inline-block强制显示在一行 */}
              <div className="mb-2" style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                <Button 
                  type="primary" 
                  icon={<UploadOutlined />} 
                  size="small"
                  onClick={() => setImportModalVisible(true)}
                  style={{ marginRight: '8px' }}
                >
                  导入数据
                </Button>
                <Button 
                  type="primary" 
                  icon={<ExportOutlined />} 
                  size="small"
                  onClick={() => setExportModalVisible(true)}
                  style={{ marginRight: '8px' }}
                >
                  导出数据
                </Button>
                
                <span style={{ fontSize: '12px', marginRight: '4px' }}>确认页数:</span>
                <InputNumber 
                  min={0} 
                  max={50} 
                  value={pagesCount}
                  onChange={(value) => setPagesCount(value as number)} 
                  size="small"
                  style={{ width: '50px', margin: '0 4px' }} 
                />
                <span style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap' }}>{pagesCount === 0 ? '0代表自动计算页数' : `约 ${pagesCount * 50} 账号`}</span>
              </div>
              
              {/* 搜索框单独一行 */}
              <div className="mb-1">
                <Input
                  placeholder="输入Twitter用户名以获取关注列表"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  onPressEnter={handleFetchFollowing}
                  suffix={
                    <Button
                      type="link"
                      size="small"
                      icon={<SearchOutlined />}
                      loading={fetchingFollowing}
                      onClick={handleFetchFollowing}
                    />
                  }
                />
              </div>
              
              {/* 标签页导航 */}
              <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                size="small"
                className="w-full"
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
            </div>
            
            <div className="flex-1 overflow-hidden">
              <AccountList 
                accounts={displayAccounts} 
                currentIndex={currentIndex} 
                onSelectAccount={handleSelectAccount} 
                onToggleFollow={handleToggleFollow}
              />
            </div>
          </div>
        </div>
        
        {/* 中间内容区 - 推特页面 */}
        <div style={{ width: '40%', overflowY: 'hidden', height: '100%', position: 'relative', borderLeft: 'none', borderRight: 'none' }}>
          {twitterLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Spin />
              <p style={{ marginTop: '10px' }}>加载Twitter页面中...</p>
            </div>
          ) : currentScreenName ? (
            // 显示Twitter用户资料页，包含共同关注者功能
            <TwitterEmbed screenName={currentScreenName} />
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              <TwitterOutlined style={{ fontSize: '48px', marginBottom: '20px', color: '#1DA1F2' }} />
              <Title level={4}>请从左侧列表选择一个账号</Title>
              <p>选择账号后，这里将显示其Twitter资料</p>
            </div>
          )}
        </div>
        
        {/* 右侧侧边栏 - 标注区域 */}
        <div style={{ width: '30%', padding: '15px', borderLeft: '1px solid #f0f0f0', height: '100%', overflowY: 'auto' }}>
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
              <div className="flex items-center mb-2">
                <TagOutlined className="mr-2" />
                <span className="text-sm font-medium">分类</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {availableCategories.map(cat => (
                  <Tag
                    key={cat}
                    className={`mb-1 cursor-pointer ${categories.includes(cat) ? 'ant-tag-blue' : ''}`}
                    onClick={() => {
                      if (categories.includes(cat)) {
                        handleRemoveCategory(cat);
                      } else {
                        handleAddCategory(cat);
                      }
                    }}
                    style={{ fontSize: '16px', padding: '4px 8px' }}
                  >
                    {cat}
                  </Tag>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="输入新分类"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onPressEnter={() => {
                    if (newCategoryInput.trim()) {
                      addNewCategory(newCategoryInput.trim());
                      setNewCategoryInput('');
                    }
                  }}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    if (newCategoryInput.trim()) {
                      addNewCategory(newCategoryInput.trim());
                      setNewCategoryInput('');
                    }
                  }}
                >
                  添加
                </Button>
              </div>
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">已选分类:</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <Tag
                      key={cat}
                      closable
                      color="blue"
                      onClose={() => handleRemoveCategory(cat)}
                      className="mb-1"
                      style={{ fontSize: '16px', padding: '4px 8px' }}
                    >
                      {cat}
                    </Tag>
                  ))}
                  {categories.length === 0 && (
                    <span className="text-gray-400 text-sm">暂无选择的分类</span>
                  )}
                </div>
              </div>
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
            
            {currentAccount && currentAccount.isAnnotated && (
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
        </div>
      </Layout.Content>

      {/* Twitter数据导入对话框 */}
      <TwitterImport 
        visible={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onImport={handleImportData}
      />
      
      {/* 数据导出对话框 */}
      <ExportModal 
        visible={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        accounts={displayAccounts}
      />
    </Layout>
  );
}

export default App;

