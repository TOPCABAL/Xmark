#!/bin/bash

# XMark VPS启动脚本
# 用于在VPS上启动前后端服务

echo "==== XMark VPS 启动脚本 ===="
echo "正在启动服务..."

# 杀死可能已存在的Node进程
echo "清理旧进程..."
pkill -f "node src/server.js" || true
pkill -f "vite" || true

# 等待进程结束
sleep 2

# 启动后端服务
echo "启动后端API服务器..."
nohup node src/server.js > server.log 2>&1 &
BACKEND_PID=$!
echo "后端服务PID: $BACKEND_PID"

# 等待后端服务启动
sleep 3

# 启动前端开发服务器
echo "启动前端开发服务器..."
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端服务PID: $FRONTEND_PID"

# 保存PID到文件
echo $BACKEND_PID > backend.pid
echo $FRONTEND_PID > frontend.pid

echo "服务启动完成!"
echo "前端访问地址: http://$(hostname -I | awk '{print $1}'):5173"
echo "后端API地址: http://$(hostname -I | awk '{print $1}'):3001"
echo "查看日志: tail -f server.log 或 tail -f frontend.log"
echo "停止服务: ./vpsstop.sh"