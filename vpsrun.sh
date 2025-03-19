#!/bin/bash

# XMark VPS启动脚本
# 用于在VPS上启动前后端服务

echo "==== XMark VPS 启动脚本 ===="
echo "正在启动服务..."

# 设置TMOUT=0防止超时
export TMOUT=0

# 杀死可能已存在的Node进程
echo "清理旧进程..."
pkill -f "node src/server.js" || true
pkill -f "vite" || true

# 等待进程结束
sleep 2

# 启动后端服务
echo "启动后端API服务器..."
# 使用 setsid 创建新的会话
setsid node src/server.js --host 0.0.0.0 > server.log 2>&1 &
BACKEND_PID=$!
# 将进程从当前shell中分离
disown $BACKEND_PID
echo "后端服务PID: $BACKEND_PID"

# 等待后端服务启动
sleep 3

# 启动前端开发服务器
echo "启动前端开发服务器..."
# 使用 setsid 创建新的会话，添加 --host 0.0.0.0 参数
setsid npm run dev -- --host 0.0.0.0 > frontend.log 2>&1 &
FRONTEND_PID=$!
# 将进程从当前shell中分离
disown $FRONTEND_PID
echo "前端服务PID: $FRONTEND_PID"

# 保存PID到文件
echo $BACKEND_PID > backend.pid
echo $FRONTEND_PID > frontend.pid

# 设置进程优先级，使其更不容易被系统杀死
renice -n -5 $BACKEND_PID >/dev/null 2>&1
renice -n -5 $FRONTEND_PID >/dev/null 2>&1

echo "服务启动完成!"
echo "前端访问地址: http://$(hostname -I | awk '{print $1}'):5173"
echo "后端API地址: http://$(hostname -I | awk '{print $1}'):3001"
echo "查看日志: tail -f server.log 或 tail -f frontend.log"
echo "停止服务: ./vpsstop.sh"

# 提示用户服务将在后台继续运行
echo -e "\n注意：服务将在后台继续运行，即使您退出SSH会话。"
echo "如需停止服务，请使用 ./vpsstop.sh 命令。"