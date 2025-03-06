import { useState, useEffect } from 'react';
import { Tweet, TweetAnnotation, TabType } from '../types';
import { getAllTweets, getAllAnnotations, updateAnnotation as updateAnnotationService } from '../services/tweetService';

export const useTweetAnnotations = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [annotations, setAnnotations] = useState<TweetAnnotation[]>([]);
  const [selectedTweetId, setSelectedTweetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  useEffect(() => {
    // 加载推特和标注数据
    const loadData = () => {
      const tweetsData = getAllTweets();
      const annotationsData = getAllAnnotations();
      
      setTweets(tweetsData);
      setAnnotations(annotationsData);
      
      // 默认选中第一条推特
      if (tweetsData.length > 0 && !selectedTweetId) {
        setSelectedTweetId(tweetsData[0].id);
      }
    };
    
    loadData();
  }, [selectedTweetId]);

  // 获取当前选中的推特
  const selectedTweet = selectedTweetId 
    ? tweets.find(tweet => tweet.id === selectedTweetId) || null
    : null;

  // 获取当前选中的推特的标注
  const selectedAnnotation = selectedTweetId
    ? annotations.find(anno => anno.tweetId === selectedTweetId) || null
    : null;

  // 更新标注
  const updateAnnotation = (annotation: TweetAnnotation) => {
    const updatedAnnotations = updateAnnotationService(annotation);
    setAnnotations(updatedAnnotations);
  };

  // 导航到上一条推特
  const navigateToPrevTweet = () => {
    if (!selectedTweetId || tweets.length === 0) return;
    
    const currentIndex = tweets.findIndex(t => t.id === selectedTweetId);
    if (currentIndex > 0) {
      setSelectedTweetId(tweets[currentIndex - 1].id);
    }
  };

  // 导航到下一条推特
  const navigateToNextTweet = () => {
    if (!selectedTweetId || tweets.length === 0) return;
    
    const currentIndex = tweets.findIndex(t => t.id === selectedTweetId);
    if (currentIndex < tweets.length - 1) {
      setSelectedTweetId(tweets[currentIndex + 1].id);
    }
  };

  return {
    tweets,
    annotations,
    selectedTweet,
    selectedAnnotation,
    selectedTweetId,
    activeTab,
    setSelectedTweetId,
    setActiveTab,
    updateAnnotation,
    navigateToPrevTweet,
    navigateToNextTweet,
  };
}; 