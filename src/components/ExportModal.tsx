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
        // 使用相对URL
        downloadLink.href = `${result.downloadUrl}`;
        downloadLink.download = result.filename;
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

  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      {/* 表单部分 */}
    </Modal>
  );
};

export default ExportModal;