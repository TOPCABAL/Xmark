import React, { useState } from 'react';
import { Modal, Input, Button, Upload, message, Tabs, Alert, Spin, Typography, Form } from 'antd';
import { UploadOutlined, CodeOutlined, InfoCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { 
  importTwitterFollowingFromJson, 
  AccountProps, 
  createTwitterUser,
  extractTwitterUserData
} from '../services/twitterService';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Text, Paragraph } = Typography;

interface TwitterImportProps {
  visible: boolean;
  onCancel: () => void;
  onImport: (accounts: AccountProps[]) => void;
  onImportSuccess?: (accounts: AccountProps[]) => void;
}

const TwitterImport: React.FC<TwitterImportProps> = ({ visible, onCancel, onImport, onImportSuccess }) => {
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedUsers, setParsedUsers] = useState<number | null>(null);
  const [singleUsername, setSingleUsername] = useState('');
  const [singleJsonText, setSingleJsonText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 重置状态
  const resetState = () => {
    setError(null);
    setParsedUsers(null);
    setLoading(false);
    setSingleUsername('');
    setSingleJsonText('');
    setIsProcessing(false);
  };

  // 处理导入错误
  const handleImportError = (error: any) => {
    console.error('导入错误:', error);
    let errorMessage = '解析JSON时出错';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    setError(errorMessage);
    message.error('导入失败: ' + errorMessage);
    setLoading(false);
  };

  // 处理粘贴的JSON文本
  const handleImportFromText = async () => {
    if (!jsonText.trim()) {
      message.error('请输入有效的JSON数据');
      return;
    }

    setLoading(true);
    resetState();
    
    try {
      // 检查JSON文本长度
      if (jsonText.length < 50) {
        setError('JSON数据太短，可能不完整。请确保复制了完整的响应数据。');
        message.error('JSON数据太短，请确保复制了完整的响应');
        setLoading(false);
        return;
      }
      
      // 先尝试解析JSON
      let jsonData;
      try {
        jsonData = JSON.parse(jsonText);
      } catch (e) {
        setError('JSON格式无效，请检查数据格式。请确保复制的是完整的JSON响应。');
        message.error('JSON格式无效，请确保粘贴完整的JSON数据');
        setLoading(false);
        return;
      }
      
      // 解析账号数据
      try {
        const accounts = await importTwitterFollowingFromJson(jsonData);
        if (accounts.length === 0) {
          setError('无法从JSON中提取账号数据，请确认是否为Twitter API响应格式');
          message.warning('未能从JSON中提取有效账号数据');
          setLoading(false);
          return;
        }
        
        setParsedUsers(accounts.length);
        message.success(`成功解析 ${accounts.length} 个账号数据`);
        
        // 延迟关闭，让用户看到成功消息
        setTimeout(() => {
          onImport(accounts);
          onCancel();
          resetState();
        }, 1500);
      } catch (error) {
        handleImportError(error);
      }
    } catch (error) {
      handleImportError(error);
    }
  };

  // 处理上传的JSON文件
  const handleFileUpload = (info: any) => {
    if (info.file.status === 'uploading') {
      setLoading(true);
      resetState();
      return;
    }
    
    if (info.file.status === 'done') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileContent = e.target?.result as string;
          
          // 检查文件内容长度
          if (fileContent.length < 50) {
            setError('文件内容太短，不像有效的JSON数据。请确保文件包含完整的Twitter API响应。');
            message.error('文件内容太短，可能不是完整的JSON数据');
            setLoading(false);
            return;
          }
          
          let jsonData;
          try {
            jsonData = JSON.parse(fileContent);
          } catch (e) {
            setError('文件内容不是有效的JSON格式。请确保文件包含完整的Twitter API响应。');
            message.error('文件内容不是有效的JSON格式');
            setLoading(false);
            return;
          }
          
          try {
            const accounts = await importTwitterFollowingFromJson(jsonData);
            if (accounts.length === 0) {
              setError('无法从文件中提取账号数据，请确认是否为Twitter API响应格式');
              message.warning('未能从文件中提取有效账号数据');
              setLoading(false);
              return;
            }
            
            setParsedUsers(accounts.length);
            message.success(`成功解析 ${accounts.length} 个账号数据`);
            
            // 延迟关闭，让用户看到成功消息
            setTimeout(() => {
              onImport(accounts);
              onCancel();
              resetState();
            }, 1500);
          } catch (error) {
            handleImportError(error);
          }
        } catch (error) {
          handleImportError(error);
        }
      };
      reader.onerror = () => {
        setError('读取文件失败，请检查文件是否损坏或格式不正确');
        message.error('读取文件失败');
        setLoading(false);
      };
      reader.readAsText(info.file.originFileObj);
    }
    
    if (info.file.status === 'error') {
      setError('文件上传失败，请检查文件大小或格式是否正确');
      message.error('文件上传失败');
      setLoading(false);
    }
  };

  // 上传前验证文件
  const beforeUpload = (file: File) => {
    const isJSON = file.type === 'application/json' || file.name.endsWith('.json');
    if (!isJSON) {
      message.error('只能上传JSON文件!');
    }
    
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('文件必须小于2MB!');
    }
    
    return isJSON && isLt2M;
  };

  // 渲染状态提示
  const renderStatusMessage = () => {
    if (loading) {
      return <Spin tip="正在解析数据..." />;
    }
    
    if (error) {
      return (
        <Alert 
          message="导入失败" 
          description={
            <div>
              <Paragraph>{error}</Paragraph>
              <Paragraph>
                <Text strong>可能的原因:</Text>
                <ul>
                  <li>响应数据不完整，请确保复制了完整的JSON响应</li>
                  <li>响应格式不是标准的Twitter API格式</li>
                  <li>响应中找不到用户数据结构</li>
                </ul>
              </Paragraph>
              <Paragraph>
                <Text type="warning">
                  <ExclamationCircleOutlined /> 提示: 请确认复制的是响应内容(Response)，而不是请求内容(Request)
                </Text>
              </Paragraph>
            </div>
          } 
          type="error" 
          showIcon 
        />
      );
    }
    
    if (parsedUsers) {
      return <Alert message="导入成功" description={`成功解析 ${parsedUsers} 个账号数据`} type="success" showIcon />;
    }
    
    return null;
  };

  // 更新创建单个用户的函数
  const handleCreateSingleUser = async (username: string, jsonData: string) => {
    try {
      setIsProcessing(true);
      
      if (!username.trim()) {
        message.error('请输入用户名');
        setIsProcessing(false);
        return;
      }
      
      // 解析JSON数据并提取
      try {
        // 使用新的提取函数
        const { userData, tweetsData } = extractTwitterUserData(jsonData);
        
        if (!userData && !tweetsData) {
          message.error('无法识别的JSON数据格式');
          setIsProcessing(false);
          return;
        }
        
        // 调用API创建用户
        const result = await createTwitterUser(username, userData, tweetsData);
        
        if (result.success) {
          message.success(`成功${userData ? '导入用户资料' : ''}${tweetsData ? '导入用户推文' : ''}`);
          
          // 如果HTML生成成功
          if (result.htmlGenerated) {
            message.success('HTML生成成功，可以在中间栏查看用户资料');
            
            // 可选：触发刷新用户列表
            if (onImportSuccess) {
              onImportSuccess([{
                id: username,
                username: username,
                name: userData?.data?.user?.result?.legacy?.name || username,
                avatar: userData?.data?.user?.result?.legacy?.profile_image_url_https || '',
                following: true
              }]);
            }
            
            // 关闭导入窗口
            onCancel();
          }
        } else {
          message.error(`导入失败: ${result.message}`);
        }
      } catch (error) {
        console.error('解析JSON失败:', error);
        message.error(`JSON解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
        setIsProcessing(false);
        return;
      }
    } catch (error) {
      console.error('创建用户失败:', error);
      message.error(`创建用户失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      title="导入Twitter关注列表"
      open={visible}
      onCancel={() => {
        resetState();
        onCancel();
      }}
      footer={null}
      width={700}
    >
      <div className="mb-4">
        <Alert 
          message="如何获取Twitter关注列表数据" 
          description={
            <div>
              <p>1. 登录Twitter网页版，打开开发者工具(F12)</p>
              <p>2. 访问关注列表页面</p>
              <p>3. 在Network标签页筛选XHR请求</p>
              <p>4. 查找包含Following或Followers的请求</p>
              <p>5. 选择一个请求，在Response标签页查看响应内容</p>
              <p>6. <Text strong>复制完整的JSON响应数据</Text> (通常以 {"{"} 开头，以 {"}"} 结尾)</p>
            </div>
          }
          type="info" 
          showIcon 
          icon={<InfoCircleOutlined />}
        />
      </div>

      <Tabs defaultActiveKey="paste">
        <TabPane tab="粘贴JSON" key="paste" icon={<CodeOutlined />}>
          <p className="mb-2">将Twitter API返回的JSON数据粘贴到下面的文本框中：</p>
          <TextArea 
            rows={10} 
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='粘贴完整的JSON数据，必须包含完整的响应 (以 { 开头，以 } 结尾)'
            className="mb-4 font-mono text-xs"
            disabled={loading}
          />
          
          {/* 状态消息 */}
          {renderStatusMessage()}
          
          <div className="flex justify-end mt-4">
            <Button 
              onClick={() => {
                resetState();
                onCancel();
              }} 
              className="mr-2"
              disabled={loading}
            >
              取消
            </Button>
            <Button 
              type="primary" 
              onClick={handleImportFromText} 
              loading={loading}
              disabled={!jsonText.trim() || jsonText.trim().length < 20}
            >
              解析并导入
            </Button>
          </div>
        </TabPane>
        
        <TabPane tab="上传文件" key="upload" icon={<UploadOutlined />}>
          <p className="mb-4">上传包含Twitter API响应数据的JSON文件：</p>
          <div className="flex justify-center mb-4">
            <Upload
              name="jsonFile"
              accept=".json"
              customRequest={({ onSuccess }: any) => setTimeout(() => onSuccess("ok"), 0)}
              beforeUpload={beforeUpload}
              onChange={handleFileUpload}
              showUploadList={false}
              disabled={loading}
            >
              <Button icon={<UploadOutlined />} size="large" loading={loading} disabled={loading}>
                选择JSON文件
              </Button>
            </Upload>
          </div>
          
          {/* 状态消息 */}
          {renderStatusMessage()}
          
          <div className="mt-8 text-gray-500">
            <p className="font-semibold">支持的JSON格式：</p>
            <ul className="list-disc pl-5">
              <li>Twitter网页版API响应格式 (包含大量嵌套数据)</li>
              <li>Twitter API v2响应: {"{ \"data\": [ ... ] }"}</li>
              <li>Twitter API v1响应: {"{ \"users\": [ ... ] }"}</li>
              <li>纯用户数组: {"[ ... ]"}</li>
            </ul>
            <p className="mt-4">
              <strong>注意:</strong> 导入处理耗时取决于数据复杂度和大小，请耐心等待。
            </p>
          </div>
        </TabPane>
        
        <TabPane tab="导入单个用户" key="import-single">
          <Form layout="vertical">
            <Form.Item label="用户名 (不包含@符号)">
              <Input 
                placeholder="例如: dotyyds1234" 
                value={singleUsername} 
                onChange={e => setSingleUsername(e.target.value)}
              />
            </Form.Item>
            <Form.Item label="JSON数据 (用户资料或推文)">
              <Input.TextArea
                placeholder="粘贴JSON数据..."
                rows={10}
                value={singleJsonText}
                onChange={e => setSingleJsonText(e.target.value)}
              />
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                onClick={() => handleCreateSingleUser(singleUsername, singleJsonText)}
                loading={isProcessing}
                disabled={!singleUsername || !singleJsonText}
              >
                导入数据
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default TwitterImport; 