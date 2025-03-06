import React, { useState } from 'react';
import { Layout, Row, Col, Card, Avatar, Input, Button, Typography, Divider, Tag } from 'antd';
import { TwitterTimelineEmbed } from 'react-twitter-embed';
import { CookieConsent } from './components/CookieConsent';

const { TextArea } = Input;
const { Title } = Typography;

// 示例数据
const accounts = [
  {
    id: "tweet1",
    name: "Big Bottle",
    username: "@bigbottle44",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
    category: "技术学习",
  },
  {
    id: "tweet2",
    name: "酷酷的编程猫",
    username: "@coolcoder99",
    avatar: "https://randomuser.me/api/portraits/women/2.jpg",
    category: "编程",
  },
  {
    id: "tweet3",
    name: "科技熊猫",
    username: "@techpanda",
    avatar: "https://randomuser.me/api/portraits/men/3.jpg",
    category: "AI讨论",
  },
];

function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");

  const currentAccount = accounts[currentIndex];

  const handleNext = () => {
    if (currentIndex < accounts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // 添加分组选项
  const categoryOptions = ["技术学习", "编程", "AI讨论", "投资", "娱乐", "其他"];

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Row gutter={0} style={{ height: '100%' }}>
        {/* 左侧 - 账号列表 - 增加明确的滚动样式 */}
        <Col span={6} style={{ height: '100%', overflowY: 'auto', borderRight: '1px solid #f0f0f0' }}>
          <div className="p-4">
            <Title level={3} className="mb-4 sticky top-0 bg-white z-10 pb-2">账号列表</Title>
            {accounts.map((account, index) => (
              <Card 
                key={account.id}
                className={`mb-3 cursor-pointer hover:shadow-md transition-all ${currentIndex === index ? "bg-blue-100" : ""}`}
                onClick={() => setCurrentIndex(index)}
                style={{ borderRadius: '8px' }}
              >
                <div className="flex items-center gap-3">
                  <Avatar size={48} src={account.avatar} />
                  <div style={{ width: 'calc(100% - 60px)' }}>
                    <p className="font-semibold">{account.name}</p>
                    <p className="text-gray-500">{account.username}</p>
                    {account.category && (
                      <Tag color="blue" style={{ marginTop: '4px' }}>{account.category}</Tag>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Col>

        {/* 中间 - 推特主页嵌入 - 增加宽度和减少间距 */}
        <Col span={10} style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #f0f0f0' }}>
          <div className="p-4 pb-0">
            <Title level={3} className="mb-2">{currentAccount.name} 的推特主页</Title>
          </div>
          
          <div style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column' }}>
            {/* 推特组件容器 - 增加高度 */}
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
            
            <div className="py-2 text-center">
              <a 
                href={`https://twitter.com/${currentAccount.username.replace("@", "")}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button type="primary" ghost>在新窗口中打开</Button>
              </a>
            </div>
          </div>
        </Col>

        {/* 右侧 - 备注 & 分组 - 增加宽度和点击区域 */}
        <Col span={8} style={{ height: '100%', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <Title level={3} className="mb-4">分组 & 备注</Title>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="mb-2">
              <label className="block mb-2 text-gray-700">选择分组:</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {categoryOptions.map(cat => (
                  <Tag
                    key={cat}
                    className="cursor-pointer py-1 px-3"
                    style={{ 
                      fontSize: '14px',
                      backgroundColor: category === cat ? '#1890ff' : '#f0f0f0',
                      color: category === cat ? 'white' : 'black'
                    }}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </Tag>
                ))}
              </div>
            </div>
            
            <Input
              placeholder="输入自定义分组"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mb-4"
              size="large"
              style={{ height: '50px', fontSize: '16px' }}
            />
            
            <label className="block mb-2 text-gray-700">添加备注:</label>
            <TextArea
              placeholder="备注内容"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mb-4"
              style={{ flex: 1, minHeight: '200px', fontSize: '16px', padding: '12px' }}
              rows={8}
            />
            
            <div className="mt-auto flex space-x-4 justify-center">
              <Button 
                onClick={handlePrev} 
                disabled={currentIndex === 0}
                size="large"
                style={{ minWidth: '120px', height: '45px' }}
              >
                ⬅️ 上一个
              </Button>
              <Button 
                type="primary" 
                onClick={handleNext} 
                disabled={currentIndex === accounts.length - 1}
                size="large"
                style={{ minWidth: '120px', height: '45px' }}
              >
                下一个 ➡️
              </Button>
            </div>
          </div>
        </Col>
      </Row>
    </Layout>
  );
}

export default App;
