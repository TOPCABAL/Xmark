#!/bin/bash

# API端点
API_BASE="http://localhost:5173/api"
GET_CATEGORIES_ENDPOINT="${API_BASE}/categories"
DELETE_CATEGORY_ENDPOINT="${API_BASE}/categories/delete"

echo "===== 开始删除包含'测试'字样的分类 ====="

# 第一步：获取所有分类
echo "正在获取所有分类..."
CATEGORIES=$(curl -s ${GET_CATEGORIES_ENDPOINT})

# 检查是否成功获取分类
if [ $? -ne 0 ]; then
  echo "获取分类失败，请检查API服务是否正常运行"
  exit 1
fi

# 解析JSON结果，提取分类名称
echo "正在解析分类信息..."
# 使用简单的字符串处理方式提取名称（实际环境中最好使用jq等工具）
CATEGORIES_STRING=$(echo $CATEGORIES | tr ',' '\n' | grep -o '"name":"[^"]*"' | cut -d':' -f2 | tr -d '"')

# 初始化计数器
DELETED_COUNT=0

# 循环处理每个分类
echo "正在检查并删除包含'测试'字样的分类..."
for category in $CATEGORIES_STRING; do
  # 检查分类名称是否包含"测试"
  if [[ $category == *测试* ]]; then
    echo "发现目标分类：$category，准备删除..."
    
    # 发送删除请求
    DELETE_RESULT=$(curl -s -X POST \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"$category\"}" \
      $DELETE_CATEGORY_ENDPOINT)
    
    # 检查删除结果
    if [[ $DELETE_RESULT == *"success"* ]]; then
      echo "✅ 成功删除分类：$category"
      DELETED_COUNT=$((DELETED_COUNT + 1))
    else
      echo "❌ 删除分类失败：$category，错误信息：$DELETE_RESULT"
    fi
    
    # 添加短暂延迟，避免请求过快
    sleep 0.5
  fi
done

echo "===== 删除操作完成 ====="
echo "共删除了 $DELETED_COUNT 个包含'测试'字样的分类"