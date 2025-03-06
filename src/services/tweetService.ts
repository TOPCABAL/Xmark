import { Tweet, TweetUser, TweetAnnotation } from '../types';
import { v4 as uuidv4 } from 'uuid';

// 示例用户数据
const sampleUsers: TweetUser[] = [
  {
    id: 'user1',
    username: 'bigbottle44',
    displayName: 'Big Bottle',
    avatarUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
  },
  {
    id: 'user2',
    username: 'coolcoder99',
    displayName: '酷酷的编程猫',
    avatarUrl: 'https://randomuser.me/api/portraits/women/2.jpg',
  },
  {
    id: 'user3',
    username: 'techpanda',
    displayName: '科技熊猫',
    avatarUrl: 'https://randomuser.me/api/portraits/men/3.jpg',
  },
  {
    id: 'user4',
    username: 'happysoul',
    displayName: '快乐灵魂',
    avatarUrl: 'https://randomuser.me/api/portraits/women/4.jpg',
  },
  {
    id: 'user5',
    username: 'artmaster',
    displayName: '艺术大师',
    avatarUrl: 'https://randomuser.me/api/portraits/men/5.jpg',
  },
];

// 示例推特数据
const sampleTweets: Tweet[] = [
  {
    id: 'tweet1',
    user: sampleUsers[0],
    content: '今天学习了React和TypeScript，感觉收获满满！#前端开发 #React #TypeScript',
    date: '2023-05-15 14:30',
    likes: 42,
    retweets: 8,
    replies: 5,
  },
  {
    id: 'tweet2',
    user: sampleUsers[1],
    content: '刚刚完成了新项目的部署，终于可以好好休息一下了。分享一下我的经验：部署前一定要做好测试！',
    date: '2023-05-14 09:15',
    likes: 87,
    retweets: 15,
    replies: 12,
    media: ['https://picsum.photos/id/1/500/300'],
  },
  {
    id: 'tweet3',
    user: sampleUsers[2],
    content: '人工智能正在改变我们的生活方式。你们觉得AI会在哪些领域带来最大的变革？',
    date: '2023-05-13 16:45',
    likes: 120,
    retweets: 30,
    replies: 25,
  },
  {
    id: 'tweet4',
    user: sampleUsers[3],
    content: '周末去爬山了，分享一些美丽的风景照片！大自然真的太美了！',
    date: '2023-05-12 11:20',
    likes: 156,
    retweets: 18,
    replies: 14,
    media: [
      'https://picsum.photos/id/10/500/300',
      'https://picsum.photos/id/11/500/300',
    ],
  },
  {
    id: 'tweet5',
    user: sampleUsers[4],
    content: '刚完成了一幅新画作，这次尝试了不同的风格。艺术是一个不断探索的过程。',
    date: '2023-05-11 13:10',
    likes: 95,
    retweets: 12,
    replies: 8,
    media: ['https://picsum.photos/id/15/500/300'],
  },
  {
    id: 'tweet6',
    user: sampleUsers[0],
    content: '最近在学习NextJS，感觉它比传统的React应用构建方式效率高多了！',
    date: '2023-05-10 17:40',
    likes: 65,
    retweets: 14,
    replies: 7,
  },
];

// 示例标注数据
const sampleAnnotations: TweetAnnotation[] = [
  {
    id: 'anno1',
    tweetId: 'tweet1',
    group: '技术学习',
    notes: '这条推文关于React和TypeScript学习',
  },
  {
    id: 'anno2',
    tweetId: 'tweet3',
    group: 'AI讨论',
    notes: '讨论人工智能对各行业的影响',
  },
];

// 获取所有推特
export const getAllTweets = (): Tweet[] => {
  return sampleTweets;
};

// 获取所有标注
export const getAllAnnotations = (): TweetAnnotation[] => {
  // 从LocalStorage中获取保存的标注，如果没有则使用示例数据
  const savedAnnotations = localStorage.getItem('tweet_annotations');
  return savedAnnotations ? JSON.parse(savedAnnotations) : sampleAnnotations;
};

// 更新标注
export const updateAnnotation = (annotation: TweetAnnotation): TweetAnnotation[] => {
  const annotations = getAllAnnotations();
  const index = annotations.findIndex((a) => a.tweetId === annotation.tweetId);

  if (index !== -1) {
    annotations[index] = annotation;
  } else {
    annotations.push({
      ...annotation,
      id: annotation.id || uuidv4(),
    });
  }

  // 保存到LocalStorage
  localStorage.setItem('tweet_annotations', JSON.stringify(annotations));
  return annotations;
};

// 删除标注
export const deleteAnnotation = (annotationId: string): TweetAnnotation[] => {
  const annotations = getAllAnnotations().filter((a) => a.id !== annotationId);
  localStorage.setItem('tweet_annotations', JSON.stringify(annotations));
  return annotations;
};

// 模拟网页内容cookies处理
export const handleCookiesConsent = (): void => {
  localStorage.setItem('cookies_consent', 'accepted');
  console.log('Cookies consent has been accepted');
}; 