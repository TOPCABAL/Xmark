import React, { useState } from 'react';
import { Modal, Radio, Input, Button, Space, DatePicker, message, Typography } from 'antd';
import { DownloadOutlined, FileExcelOutlined, CodeOutlined } from '@ant-design/icons';
import { AccountProps } from '../services/twitterService';
import { exportAndDownload } from '../services/exportService';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface ExportModalProps {
  visible: boolean;
  onCancel: () => void;
  accounts: AccountProps[];
}

const ExportModal: React.FC<ExportModalProps> = ({ visible, onCancel, accounts }) => {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [fileName, setFileName] = useState('');
  const [exportScope, setExportScope] = useState<'all' | 'annotated'>('all');
  
  // 处理导出操作
  const handleExport = () => {
    if (accounts.length === 0) {
      message.warning('没有可导出的账号数据');
      return;
    }
    
    // 根据导出范围过滤账号
    let dataToExport = accounts;
    if (exportScope === 'annotated') {
      dataToExport = accounts.filter(account => account.isAnnotated);
      if (dataToExport.length === 0) {
        message.warning('没有已标注的账号数据');
        return;
      }
    }
    
    // 生成文件名（如果用户没有提供）
    const defaultFileName = fileName.trim() || 
      `twitter_${exportScope === 'all' ? 'all' : 'annotated'}_${new Date().toISOString().slice(0, 10)}`;
    
    try {
      // 导出并下载文件
      exportAndDownload(dataToExport, exportFormat, `${defaultFileName}.${exportFormat}`);
      
      // 显示成功提示
      message.success(`成功导出 ${dataToExport.length} 个账号数据`);
      
      // 关闭对话框
      onCancel();
    } catch (error) {
      console.error("导出失败:", error);
      message.error('导出失败，请稍后重试');
    }
  };
  
  // 可导出的账号数量统计
  const totalAccounts = accounts.length;
  const annotatedAccounts = accounts.filter(account => account.isAnnotated).length;
  
  return (
    <Modal
      title="导出标注数据"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={500}
    >
      <div className="space-y-6">
        {/* 导出统计 */}
        <div className="bg-gray-50 p-3 rounded">
          <div>总账号数: <Text strong>{totalAccounts}</Text> 个</div>
          <div>已标注账号: <Text strong>{annotatedAccounts}</Text> 个</div>
        </div>
        
        {/* 导出范围 */}
        <div>
          <div className="mb-1 font-semibold">导出范围:</div>
          <Radio.Group 
            value={exportScope} 
            onChange={e => setExportScope(e.target.value)}
          >
            <Space direction="vertical">
              <Radio value="all">全部账号 ({totalAccounts}个)</Radio>
              <Radio value="annotated">仅已标注账号 ({annotatedAccounts}个)</Radio>
            </Space>
          </Radio.Group>
        </div>
        
        {/* 文件格式 */}
        <div>
          <div className="mb-1 font-semibold">文件格式:</div>
          <Radio.Group 
            value={exportFormat} 
            onChange={e => setExportFormat(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="json">
              <CodeOutlined /> JSON格式
            </Radio.Button>
            <Radio.Button value="csv">
              <FileExcelOutlined /> CSV格式
            </Radio.Button>
          </Radio.Group>
        </div>
        
        {/* 文件名 */}
        <div>
          <div className="mb-1 font-semibold">文件名:</div>
          <Input
            placeholder={`twitter_${exportScope === 'all' ? 'all' : 'annotated'}_${new Date().toISOString().slice(0, 10)}`}
            value={fileName}
            onChange={e => setFileName(e.target.value)}
            suffix={`.${exportFormat}`}
          />
          <div className="text-xs text-gray-500 mt-1">
            如不填写，将使用默认文件名
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex justify-end pt-2">
          <Button onClick={onCancel} className="mr-2">
            取消
          </Button>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={handleExport}
          >
            导出数据
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportModal; 