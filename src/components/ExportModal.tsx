import React, { useState, useEffect } from 'react';
import { Modal, Radio, Input, Button, Space, message, Typography, Select, Spin } from 'antd';
import { DownloadOutlined, FileExcelOutlined, CodeOutlined } from '@ant-design/icons';
import { AccountProps } from '../services/twitterService';
import { exportAndDownload } from '../services/exportService';
import { exportDataFromDB, fetchCategoriesFromDB } from '../services/dbService';

const { Text } = Typography;
const { Option } = Select;

interface ExportModalProps {
  visible: boolean;
  onCancel: () => void;
  accounts: AccountProps[];
}

const ExportModal: React.FC<ExportModalProps> = ({ visible, onCancel, accounts }) => {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exportScope, setExportScope] = useState<'all' | 'annotated'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<{name: string, count: number}[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 加载分类列表
  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);
  
  const loadCategories = async () => {
    try {
      setLoading(true);
      const fetchedCategories = await fetchCategoriesFromDB();
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('获取分类列表失败:', error);
      message.error('获取分类列表失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理导出操作
  const handleExport = async () => {
    try {
      setLoading(true);
      
      // 使用数据库API导出数据
      const result = await exportDataFromDB(
        exportFormat, 
        {
          category: selectedCategory || undefined,
          isAnnotated: exportScope === 'annotated' ? true : undefined
        }
      );
      
      if (result.success) {
        // 创建下载链接
        const downloadLink = document.createElement('a');
        downloadLink.href = `http://localhost:3001${result.downloadUrl}`;
        downloadLink.target = '_blank';
        downloadLink.click();
        
        message.success(`成功导出 ${result.count} 个账号数据`);
        onCancel(); // 关闭对话框
      } else {
        message.error('导出失败');
      }
    } catch (error) {
      console.error('导出数据失败:', error);
      message.error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 可导出的账号数量统计
  const totalAccounts = accounts.length;
  const annotatedAccounts = accounts.filter(account => account.isAnnotated).length;
  
  return (
    <Modal
      title="导出Twitter账号数据"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={500}
    >
      <Spin spinning={loading}>
        {/* 导出格式选择 */}
        <div className="mb-4">
          <Text strong>导出格式：</Text>
          <Radio.Group 
            value={exportFormat} 
            onChange={e => setExportFormat(e.target.value)}
            className="ml-2"
          >
            <Radio.Button value="json">
              <CodeOutlined /> JSON
            </Radio.Button>
            <Radio.Button value="csv">
              <FileExcelOutlined /> CSV
            </Radio.Button>
          </Radio.Group>
        </div>
        
        {/* 导出范围选择 */}
        <div className="mb-4">
          <Text strong>导出范围：</Text>
          <Radio.Group 
            value={exportScope} 
            onChange={e => setExportScope(e.target.value)}
            className="ml-2"
          >
            <Radio.Button value="all">全部账号</Radio.Button>
            <Radio.Button value="annotated">已标注账号</Radio.Button>
          </Radio.Group>
        </div>
        
        {/* 分类筛选 */}
        <div className="mb-4">
          <Text strong>分类筛选：</Text>
          <div className="mt-2">
            <Select
              placeholder="选择分类筛选(可选)"
              style={{ width: '100%' }}
              allowClear
              value={selectedCategory}
              onChange={(value) => setSelectedCategory(value)}
            >
              {categories.map(category => (
                <Option key={category.name} value={category.name}>
                  {category.name} ({category.count})
                </Option>
              ))}
            </Select>
            <div className="text-xs text-gray-500 mt-1">
              不选择分类则导出全部数据
            </div>
          </div>
        </div>
        
        {/* 底部按钮 */}
        <div className="mt-6 flex justify-end">
          <Space>
            <Button onClick={onCancel}>取消</Button>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={handleExport}
              loading={loading}
            >
              导出数据
            </Button>
          </Space>
        </div>
      </Spin>
    </Modal>
  );
};

export default ExportModal; 