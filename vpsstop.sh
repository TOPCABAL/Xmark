#!/bin/bash

# XMark VPS停止脚本
# 用于停止在VPS上运行的前后端服务

echo "==== XMark VPS 停止脚本 ===="
echo "正在停止服务..."

# 从PID文件中读取进程ID
if [ -f backend.pid ]; then
  BACKEND_PID=$(cat backend.pid)
  echo "停止后端服务 (PID: $BACKEND_PID)..."
  kill $BACKEND_PID 2>/dev/null || true
  rm backend.pid
else
  echo "未找到后端服务PID文件"
fi

if [ -f frontend.pid ]; then
  FRONTEND_PID=$(cat frontend.pid)
  echo "停止前端服务 (PID: $FRONTEND_PID)..."
  kill $FRONTEND_PID 2>/dev/null || true
  rm frontend.pid
else
  echo "未找到前端服务PID文件"
fi

# 确保所有相关进程都被停止
echo "确保所有相关进程都已停止..."
pkill -f "node src/server.js" || true
pkill -f "vite" || true

echo "服务已停止!" 