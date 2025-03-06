export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  type: 'rectangle' | 'polygon' | 'point';
  points: Point[];
  label: string;
  color: string;
}

export interface ImageData {
  id: string;
  src: string;
  width: number;
  height: number;
  annotations: Annotation[];
}

export interface ToolState {
  activeTool: 'select' | 'rectangle' | 'polygon' | 'point' | null;
  activeColor: string;
  activeLabel: string;
}

export interface TweetUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export interface Tweet {
  id: string;
  user: TweetUser;
  content: string;
  date: string;
  media?: string[];
  likes: number;
  retweets: number;
  replies: number;
}

export interface TweetAnnotation {
  id: string;
  tweetId: string;
  group: string;
  notes: string;
}

export type TabType = 'all' | 'ungrouped' | 'grouped';

export interface ImageData {
  src: string;
  width: number;
  height: number;
} 