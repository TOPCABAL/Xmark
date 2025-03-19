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
- **本地服务器支持**：内置Node.js后端服务器，用于获取Twitter关注列表数据

## 项目架构

本项目采用前后端分离架构，便于开发和部署。

### 前端架构

- **框架**: React 18
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI组件库**: Ant Design
- **构建工具**: Vite
- **HTTP客户端**: Fetch API

### 后端架构

- **运行环境**: Node.js
- **Web框架**: Express
- **数据处理**: 文件系统(fs)存储
- **网络请求**: Axios + HTTPS代理支持
- **跨域支持**: CORS中间件

### 技术栈

- **前端框架**: React 18
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI组件库**: Ant Design
- **构建工具**: Vite
- **包管理**: npm
- **后端框架**: Express
- **数据存储**: 文件系统 + LocalStorage

### 目录结构

```
xmark-app/
├── src/                      # 前端源代码目录
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
│   │   └── ...                     # 其他服务
│   ├── hooks/                # 自定义React钩子
│   ├── types/                # TypeScript类型定义
│   ├── styles/               # 样式文件
│   ├── utils/                # 工具函数
│   ├── data/                 # 静态数据
│   ├── App.tsx               # 应用主组件
│   └── main.tsx              # 应用入口点
├── scripts/                  # 后端脚本
│   └── getFollowing.js       # 获取Twitter关注列表脚本
├── followdata/               # 关注数据存储目录
├── public/                   # 静态资源
└── ... 其他配置文件
```

### 核心数据流

1. **数据导入流程**:
   - 用户输入Twitter用户名，点击获取关注列表
   - 前端向后端发送请求
   - 后端执行`getFollowing.js`脚本获取Twitter数据
   - 后端将数据保存到`followdata`目录并返回给前端
   - 前端处理数据并展示在界面上

2. **标注流程**:
   - 用户从`AccountList`选择一个Twitter账号
   - 所选账号在`TwitterEmbed`中展示
   - 用户通过`AnnotationPanel`添加分类和备注
   - 标注数据通过`useAnnotation`钩子更新
   - 更新后的数据通过`localStorageService`持久化存储

3. **数据导出流程**:
   - 用户通过导出功能选择导出格式
   - 应用将格式化数据
   - 数据被下载为文件

## 快速开始

### 安装依赖

```bash
npm install
```

### 运行方式

项目需要同时运行前端和后端服务，请打开两个终端窗口分别运行以下命令：

#### 启动前端开发服务器

```bash
npm run dev
```

前端将在 http://localhost:5173 (或其他Vite默认端口) 启动

#### 启动后端API服务器

```bash
npm run server
```

后端将在 http://localhost:3001 启动

### 构建生产版本

```bash
npm run build
```

## 使用指南

### 获取Twitter关注列表

1. **使用内置API获取**
   - 确保后端服务已启动(`npm run server`)
   - 在应用界面输入Twitter用户名
   - 点击"获取关注列表"按钮
   - 系统会自动从Twitter获取数据并展示

2. **手动导入数据**
   - 点击应用左上角的"导入数据"按钮
   - 选择"粘贴JSON"选项卡
   - 将获取的JSON数据粘贴到文本框中
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
   - 标注会自动保存到本地浏览器存储中

### 查看不同视图

- **全部**：显示所有导入的账号（包括已标注和未标注）
- **已标注**：只显示已经添加了分类或备注的账号
- **待标注**：只显示尚未标注的账号

## 数据结构

系统使用两层数据设计：

1. **API数据层**：存储从Twitter导入的原始账号数据
   - 包含基本信息如ID、名称、用户名、头像等
   - 每次导入新数据时更新
   - 存储在服务器端的`followdata`目录

2. **本地标注层**：存储用户添加的标注信息
   - 包含分类、备注、标注时间等
   - 使用LocalStorage持久化存储
   - 导入新数据时自动与已标注数据合并

## 常见问题

### Q: 获取关注列表失败怎么办？

A: 请检查以下几点：
- 确保后端服务器已启动 (`npm run server`)
- 检查控制台是否有CORS错误，可能需要重启服务器
- 确保输入的Twitter用户名正确且公开
- 如果使用代理，确保代理服务器配置正确

### Q: 标注信息会丢失吗？

A: 标注信息存储在浏览器的LocalStorage中，除非您：
- 清除浏览器数据
- 使用隐私模式浏览
标注数据将会一直保留，即使导入新数据也不会覆盖已有标注。

### Q: 如何批量标注账号？

A: 目前系统支持单个账号标注。批量标注功能将在未来版本中添加。

## 更新日志

### 2024-03-19
- **VPS部署支持**: 添加了在VPS上部署的支持，移除了代理配置
- **网络监听优化**: 修改了服务器和前端配置，使其可以监听在所有网络接口上
- **远程访问支持**: 优化了前后端配置，支持从外部网络访问

### 2024-03-13
- **前后端通信修复**: 解决了前端无法连接到后端服务器的CORS问题
- **请求超时优化**: 将服务器连接测试超时时间从2秒增加到5秒，提高稳定性
- **错误处理增强**: 添加了详细的错误处理和日志记录
- **测试工具添加**: 增加了API测试HTML页面，方便调试服务器连接问题

### 2024-03-08
- **UI改进**: 将"数据操作"下拉菜单改为直接显示在导航栏的独立按钮，使导入/导出数据操作更加便捷
- **数据格式优化**: 更新导出数据中的Twitter链接格式，包含格式化用户名和直接链接
- **示例数据更新**: 将示例数据格式与Twitter关注列表API格式保持一致，提高开发和测试效率

## VPS部署指南

如果需要在VPS上部署本应用，可以按照以下步骤进行操作：

### 准备工作

1. 确保VPS上安装了Node.js（推荐v16以上版本）和npm
2. 克隆代码库到VPS：`git clone https://github.com/your-repo/xmark.git`
3. 切换到vps-deploy分支：`git checkout vps-deploy`
4. 安装依赖：`npm install`

### 修改配置

VPS版本已经修改了以下配置，无需代理直接访问Twitter API：

1. 修改了`scripts`目录下的所有脚本，移除了代理配置
2. 优化了服务器配置，监听在`0.0.0.0`而不是仅localhost
3. 配置vite开发服务器监听所有网络接口

### 启动服务

#### 开发模式

```bash
# 启动后端服务器
npm run server

# 启动前端开发服务器
npm run dev
```

#### 生产模式

```bash
# 构建前端
npm run build

# 启动后端服务
npm run server
```

### 持久化运行

要使服务在SSH断开连接后继续运行，可以使用nohup：

```bash
# 后台运行后端服务
nohup npm run server > server.log 2>&1 &

# 后台运行前端开发服务器（如需要）
nohup npm run dev > frontend.log 2>&1 &
```

### 防火墙设置

确保VPS的防火墙允许以下端口：

```bash
sudo ufw allow 3001/tcp  # 后端API服务器
sudo ufw allow 5173/tcp  # 前端开发服务器
```

### 访问应用

- 前端: `http://YOUR_VPS_IP:5173`
- 后端API: `http://YOUR_VPS_IP:3001`