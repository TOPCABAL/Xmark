# XMark - Twitter关注标注系统

一个用于导入、标注和管理Twitter关注列表的Web应用，支持分类、备注和标签管理。

## 功能特点

- **Twitter数据导入**：支持导入Twitter网页版API返回的复杂JSON数据
- **双层数据设计**：区分API原始数据和本地标注数据，确保数据安全
- **智能数据提取**：能够从嵌套的Twitter API响应中自动提取用户信息
- **数据持久化**：使用LocalStorage存储标注数据，确保浏览器关闭后不丢失
- **分类管理**：支持预设和自定义分类，便于整理关注账号
- **视图筛选**：支持"全部"/"已标注"/"待标注"多种视图切换
- **交互反馈**：直观的UI设计，操作反馈及时有效
- **优化的数据操作UI**：直接在导航栏显示数据操作按钮，无需下拉菜单，提高操作效率

## 项目架构

### 技术栈

- **前端框架**: React 18
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI组件库**: Ant Design
- **构建工具**: Vite
- **包管理**: npm
- **HTTP客户端**: Axios

### 目录结构

```
xmark-app/
├── src/                      # 源代码目录
│   ├── components/           # UI组件
│   │   ├── AccountList.tsx   # 账号列表组件
│   │   ├── AnnotationControls.tsx  # 标注控制组件
│   │   ├── AnnotationPanel.tsx     # 标注面板组件
│   │   ├── TwitterEmbed.tsx        # Twitter嵌入组件
│   │   ├── TwitterImport.tsx       # Twitter数据导入组件
│   │   ├── TwitterSelector.tsx     # Twitter账号选择器
│   │   ├── ExportModal.tsx         # 数据导出模态框
│   │   └── ...                     # 其他组件
│   ├── services/             # 服务层
│   │   ├── twitterService.ts       # Twitter数据处理服务
│   │   ├── localStorageService.ts  # 本地存储服务
│   │   ├── exportService.ts        # 数据导出服务
│   │   ├── googleDriveService.ts   # Google Drive同步服务
│   │   └── ...                     # 其他服务
│   ├── hooks/                # 自定义React钩子
│   │   ├── useAnnotation.ts        # 标注逻辑钩子
│   │   └── useTweetAnnotations.ts  # Tweet标注钩子
│   ├── types/                # TypeScript类型定义
│   │   └── index.ts                # 主要类型定义
│   ├── styles/               # 样式文件
│   ├── utils/                # 工具函数
│   ├── data/                 # 静态数据
│   ├── App.tsx               # 应用主组件
│   └── main.tsx              # 应用入口点
├── public/                   # 静态资源
├── scripts/                  # 构建和工具脚本
└── ... 其他配置文件
```

### 核心数据流

1. **数据导入流程**:
   - 用户从Twitter API复制JSON数据
   - 通过`TwitterImport`组件将数据传入`twitterService`
   - `twitterService`解析并标准化数据
   - 数据被存储在本地状态和`localStorage`中

2. **标注流程**:
   - 用户从`AccountList`选择一个Twitter账号
   - 所选账号在`TwitterEmbed`中展示
   - 用户通过`AnnotationPanel`添加分类和备注
   - 标注数据通过`useAnnotation`钩子更新
   - 更新后的数据通过`localStorageService`持久化存储

3. **数据导出流程**:
   - 用户通过`ExportModal`选择导出格式
   - `exportService`格式化数据
   - 数据被下载为文件或同步到云服务

### 主要组件关系

- **App.tsx**: 应用根组件，管理全局状态和路由
- **AccountList**: 显示Twitter账号列表，支持过滤和排序
- **TwitterEmbed**: 嵌入式Twitter账号查看器
- **AnnotationPanel**: 提供标注界面，包含分类和备注功能
- **GoogleDriveSync**: 提供与Google Drive同步的功能
- **TwitterImport**: 处理Twitter数据的导入

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 使用指南

### 导入Twitter关注列表

1. **获取Twitter API数据**
   - 登录Twitter网页版，打开开发者工具(F12)
   - 访问关注列表页面
   - 在Network标签页筛选XHR请求
   - 查找包含Following或Followers的请求
   - 在Response标签页查看并复制完整JSON响应

2. **导入数据**
   - 点击应用左上角的"导入数据"按钮
   - 选择"粘贴JSON"选项卡
   - 将复制的JSON数据粘贴到文本框中
   - 点击"解析并导入"按钮

### 账号标注

1. **选择账号**
   - 在左侧列表中点击要标注的账号

2. **添加分类**
   - 在右侧面板选择预设分类，或输入自定义分类
   - 点击"添加"按钮应用分类

3. **添加备注**
   - 在"添加备注"文本框中输入相关信息
   - 点击"保存备注"按钮保存

4. **保存标注**
   - 点击右上角"保存标注"按钮将信息永久保存到本地数据库

### 查看不同视图

- **全部**：显示所有导入的账号（包括已标注和未标注）
- **已标注**：只显示已经添加了分类或备注的账号
- **待标注**：只显示尚未标注的账号

## 数据结构

系统使用两层数据设计：

1. **API数据层**：存储从Twitter导入的原始账号数据
   - 包含基本信息如ID、名称、用户名、头像等
   - 每次导入新数据时更新

2. **本地标注层**：存储用户添加的标注信息
   - 包含分类、备注、标注时间等
   - 使用LocalStorage持久化存储
   - 导入新数据时自动与已标注数据合并

## 常见问题

### Q: 导入数据失败怎么办？

A: 请确保：
- 复制的是完整的JSON响应（通常以`{`开头，以`}`结尾）
- 复制的是Response内容，而不是Headers或Request
- JSON数据中包含用户信息

### Q: 标注信息会丢失吗？

A: 标注信息存储在浏览器的LocalStorage中，除非您：
- 清除浏览器数据
- 使用隐私模式浏览
标注数据将会一直保留，即使导入新数据也不会覆盖已有标注。

### Q: 如何批量标注账号？

A: 目前系统支持单个账号标注。批量标注功能将在未来版本中添加。

## 技术栈

- React 19
- TypeScript
- Ant Design
- Tailwind CSS
- Vite

用react+tailwindcss+typescript实现推特账号标注
包括备注和分组，左侧为列表 分为已标注和未标注列表，中间为推特账号主页浏览窗口，右侧为标注选择 分类和备注

要用 React 构建一个三列式的网页，可以使用 CSS Flexbox 或 CSS Grid 来实现布局。以下是基于 React + Tailwind CSS 的示例代码，符合你的需求：

📌 主要实现功能
左列（账号列表）：展示推特的关注列表（头像、用户名、ID、分组、备注）。
中列（嵌入网页）：嵌入当前选中的推特主页。
右列（操作面板）：提供分组和备注输入框，并包含 左右切换按钮。


关注列表功能设计：
数据层：
本地存储数据：记录已标注的账号列表 持久存储
导入api数据：通过解析需要标注的某账号的关注列表将数据标注并保存到本地存储数据中 记入已分组数据集 以handle为唯一标准

## 更新日志

### 2024-03-08
- **UI改进**: 将"数据操作"下拉菜单改为直接显示在导航栏的独立按钮，使导入/导出数据操作更加便捷
- **数据格式优化**: 更新导出数据中的Twitter链接格式，包含格式化用户名和直接链接
- **示例数据更新**: 将示例数据格式与Twitter关注列表API格式保持一致，提高开发和测试效率