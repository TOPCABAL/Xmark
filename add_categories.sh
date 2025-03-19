#!/bin/bash

# 要添加的标签列表
TAGS=(
  "solana生态"
  "base生态"
  "btc生态"
  "bsc生态"
  "公链"
  "交易所"
  "顶级名人"
  "Caller - T0"
  "Caller - T1"
  "Alpha博主"
  "艺术家"
  "开发者"
  "项目创始人"
  "知名项目"
  "DEV"
)

# API端点
API_ENDPOINT="http://localhost:5173/api/categories/add"

# 逐个添加标签
for tag in "${TAGS[@]}"; do
  echo "正在添加标签: $tag"
  curl -X POST \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$tag\"}" \
    $API_ENDPOINT
  
  echo -e "\n"
  # 添加短暂延迟，避免请求过快
  sleep 0.5
done

echo "所有标签添加完成"