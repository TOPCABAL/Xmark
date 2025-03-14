-- Twitter账号与标注信息表
CREATE TABLE twitter_accounts (
  username TEXT PRIMARY KEY,               -- Twitter用户名（不含@符号），作为主键
  twitter_id TEXT NOT NULL,                -- Twitter账号ID（数字ID）
  name TEXT,                               -- 显示名称
  description TEXT,                        -- 个人简介
  avatar_url TEXT,                         -- 头像URL
  verified BOOLEAN DEFAULT 0,              -- 是否认证
  category TEXT,                           -- 用户分类
  notes TEXT,                              -- 备注内容
  followers_count INTEGER DEFAULT 0,       -- 粉丝数
  following_count INTEGER DEFAULT 0,       -- 关注数
  tweet_count INTEGER DEFAULT 0,           -- 推文数
  imported_from TEXT,                      -- 导入来源(从哪个用户的关注列表导入)
  import_date TIMESTAMP,                   -- 导入时间
  annotated_at TIMESTAMP,                  -- 标注时间
  last_updated TIMESTAMP                   -- 最后更新时间
);

-- 分类表（存储所有使用过的分类）
CREATE TABLE categories (
  name TEXT PRIMARY KEY,                   -- 分类名称
  count INTEGER DEFAULT 0,                 -- 使用此分类的账号数量
  created_at TIMESTAMP                     -- 创建时间
);

-- 导入记录表（记录每次导入的信息）
CREATE TABLE import_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_username TEXT NOT NULL,           -- 导入源用户名
  accounts_count INTEGER DEFAULT 0,        -- 导入账号数量
  success_count INTEGER DEFAULT 0,         -- 成功导入数量
  import_date TIMESTAMP,                   -- 导入时间
  notes TEXT                               -- 备注
);

-- 索引
CREATE INDEX idx_twitter_accounts_category ON twitter_accounts(category);
CREATE INDEX idx_twitter_accounts_import_date ON twitter_accounts(import_date);
CREATE INDEX idx_twitter_accounts_annotated_at ON twitter_accounts(annotated_at);