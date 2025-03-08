import React, { useState, useEffect } from 'react';
import { Modal, Button, Alert, Steps, Spin, message, Typography, Divider } from 'antd';
import { 
  CloudUploadOutlined, 
  CloudDownloadOutlined, 
  GoogleOutlined, 
  CheckCircleOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { AccountProps } from '../services/twitterService';
import { AnnotatedAccount } from '../services/localStorageService';
import { 
  initGoogleDriveApi, 
  isGoogleSignedIn, 
  signInToGoogle, 
  signOutFromGoogle,
  uploadToGoogleDrive,
  downloadFromGoogleDrive
} from '../services/googleDriveService';

const { Text } = Typography;
const { Step } = Steps;

interface GoogleDriveSyncProps {
  visible: boolean;
  onCancel: () => void;
  accounts: AccountProps[];
  onImport: (accounts: AccountProps[]) => void;
  onMerge: (accounts: AccountProps[]) => void;
}

const GoogleDriveSync: React.FC<GoogleDriveSyncProps> = ({ 
  visible, 
  onCancel, 
  accounts,
  onImport,
  onMerge
}) => {
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'upload' | 'download' | ''>('');
  const [currentStep, setCurrentStep] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  
  // 初始化Google Drive API
  useEffect(() => {
    if (visible && !initialized) {
      const init = async () => {
        setLoading(true);
        try {
          // 尝试加载Google Drive API脚本
          if (!window.gapi) {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.async = true;
            script.defer = true;
            script.onload = async () => {
              const success = await initGoogleDriveApi();
              setInitialized(success);
              setIsSignedIn(isGoogleSignedIn());
              setLoading(false);
            };
            script.onerror = () => {
              setError('加载Google Drive API失败');
              setLoading(false);
            };
            document.body.appendChild(script);
          } else {
            // 如果脚本已加载，直接初始化
            const success = await initGoogleDriveApi();
            setInitialized(success);
            setIsSignedIn(isGoogleSignedIn());
            setLoading(false);
          }
        } catch (error) {
          console.error('初始化Google Drive错误:', error);
          setError('初始化Google Drive失败');
          setLoading(false);
        }
      };
      
      init();
    }
  }, [visible, initialized]);
  
  // 处理Google登录
  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const success = await signInToGoogle();
      setIsSignedIn(success);
      if (!success) {
        setError('Google账号登录失败');
      }
    } catch (error) {
      console.error('Google登录错误:', error);
      setError('Google账号登录失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理Google退出登录
  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutFromGoogle();
      setIsSignedIn(false);
    } catch (error) {
      console.error('Google退出登录错误:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 处理上传数据到Google Drive
  const handleUpload = async () => {
    if (accounts.length === 0) {
      message.warning('没有可上传的账号数据');
      return;
    }
    
    setLoading(true);
    setMode('upload');
    setCurrentStep(1);
    setError(null);
    
    try {
      // 上传数据
      const fileId = await uploadToGoogleDrive(accounts);
      
      if (fileId) {
        setCurrentStep(2);
        message.success('成功将 ' + accounts.length + ' 个账号数据上传到Google Drive');
        
        // 保存最后同步时间
        const now = new Date().toLocaleString();
        localStorage.setItem('last_google_sync', now);
        setLastSyncTime(now);
      } else {
        setError('上传数据失败');
      }
    } catch (error) {
      console.error('上传数据错误:', error);
      setError('上传数据时发生错误');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理从Google Drive下载数据
  const handleDownload = async () => {
    setLoading(true);
    setMode('download');
    setCurrentStep(1);
    setError(null);
    
    try {
      // 下载数据
      const downloadedAccounts = await downloadFromGoogleDrive();
      
      if (downloadedAccounts && downloadedAccounts.length > 0) {
        setCurrentStep(2);
        
        // 询问用户是否替换现有数据或合并数据
        Modal.confirm({
          title: '下载成功',
          content: `成功从Google Drive下载 ${downloadedAccounts.length} 个账号数据。请选择如何处理:`,
          okText: '替换本地数据',
          cancelText: '合并到本地数据',
          onOk() {
            onImport(downloadedAccounts);
            message.success(`已用 ${downloadedAccounts.length} 个下载的账号数据替换本地数据`);
            
            // 保存最后同步时间
            const now = new Date().toLocaleString();
            localStorage.setItem('last_google_sync', now);
            setLastSyncTime(now);
            
            onCancel();
          },
          onCancel() {
            onMerge(downloadedAccounts);
            message.success(`已将 ${downloadedAccounts.length} 个下载的账号数据合并到本地数据`);
            
            // 保存最后同步时间
            const now = new Date().toLocaleString();
            localStorage.setItem('last_google_sync', now);
            setLastSyncTime(now);
            
            onCancel();
          }
        });
      } else {
        setError('从Google Drive下载数据失败或数据为空');
      }
    } catch (error) {
      console.error('下载数据错误:', error);
      setError('下载数据时发生错误');
    } finally {
      setLoading(false);
    }
  };
  
  // 加载最后同步时间
  useEffect(() => {
    if (visible) {
      const lastSync = localStorage.getItem('last_google_sync');
      setLastSyncTime(lastSync);
    }
  }, [visible]);
  
  // 渲染步骤
  const renderSteps = () => {
    const steps = [
      { title: '准备', description: '连接Google Drive' },
      { title: mode === 'upload' ? '上传中' : '下载中', description: mode === 'upload' ? '正在上传数据' : '正在下载数据' },
      { title: '完成', description: mode === 'upload' ? '数据已上传' : '数据已下载' }
    ];
    
    return (
      <Steps current={currentStep} className="mb-6">
        {steps.map(step => (
          <Step key={step.title} title={step.title} description={step.description} />
        ))}
      </Steps>
    );
  };
  
  return (
    <Modal
      title="Google Drive 同步"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <div className="space-y-6">
        {/* Google Drive 连接状态 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <GoogleOutlined className="text-2xl mr-2 text-blue-500" />
            <div>
              <Text strong>Google Drive</Text>
              <div>
                {isSignedIn ? (
                  <Text type="success">已连接</Text>
                ) : (
                  <Text type="warning">未连接</Text>
                )}
              </div>
            </div>
          </div>
          
          <div>
            {isSignedIn ? (
              <Button 
                icon={<LogoutOutlined />} 
                onClick={handleSignOut} 
                disabled={loading}
              >
                退出登录
              </Button>
            ) : (
              <Button 
                type="primary" 
                icon={<GoogleOutlined />} 
                onClick={handleSignIn} 
                loading={loading && !mode}
                disabled={!initialized || loading}
              >
                连接 Google Drive
              </Button>
            )}
          </div>
        </div>
        
        {/* 最后同步时间 */}
        {lastSyncTime && (
          <div className="text-gray-500 text-sm">
            上次同步: {lastSyncTime}
          </div>
        )}
        
        {/* 错误提示 */}
        {error && (
          <Alert
            message="同步错误"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}
        
        {/* 同步模式选择 */}
        {isSignedIn && !mode && (
          <>
            <Divider />
            <div className="grid grid-cols-2 gap-4">
              <Button 
                type="primary" 
                icon={<CloudUploadOutlined />} 
                size="large" 
                onClick={handleUpload}
                disabled={loading || accounts.length === 0}
                className="h-24 flex flex-col items-center justify-center"
              >
                <div className="text-lg">上传到云端</div>
                <div className="text-xs mt-1">将本地标注数据上传到Google Drive</div>
              </Button>
              
              <Button 
                icon={<CloudDownloadOutlined />} 
                size="large" 
                onClick={handleDownload}
                disabled={loading}
                className="h-24 flex flex-col items-center justify-center"
              >
                <div className="text-lg">从云端下载</div>
                <div className="text-xs mt-1">从Google Drive下载标注数据</div>
              </Button>
            </div>
          </>
        )}
        
        {/* 步骤展示 */}
        {mode && (
          <>
            <Divider />
            {renderSteps()}
            
            {loading && (
              <div className="flex flex-col items-center justify-center py-4">
                <Spin size="large" />
                <div className="mt-4 text-gray-500">
                  {mode === 'upload' ? '正在上传数据...' : '正在下载数据...'}
                </div>
              </div>
            )}
            
            {currentStep === 2 && !loading && (
              <div className="flex flex-col items-center justify-center py-4">
                <CheckCircleOutlined className="text-4xl text-green-500" />
                <div className="mt-4 text-lg font-semibold">
                  {mode === 'upload' ? '数据上传成功' : '数据下载成功'}
                </div>
                <div className="mt-2 text-gray-500">
                  {mode === 'upload' 
                    ? `已将 ${accounts.length} 个账号数据上传到Google Drive` 
                    : '已从Google Drive下载数据'}
                </div>
              </div>
            )}
          </>
        )}
        
        {/* 操作按钮 */}
        <div className="flex justify-end mt-4">
          <Button 
            onClick={() => {
              setMode('');
              setCurrentStep(0);
              setError(null);
              onCancel();
            }} 
            disabled={loading}
          >
            {currentStep === 2 ? '完成' : '取消'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default GoogleDriveSync; 