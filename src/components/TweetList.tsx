import React from 'react';
import { Tweet, TweetAnnotation, TabType } from '../types';

interface TweetListProps {
  tweets: Tweet[];
  annotations: TweetAnnotation[];
  selectedTweetId: string | null;
  activeTab: TabType;
  onSelectTweet: (tweetId: string) => void;
  onTabChange: (tab: TabType) => void;
}

export const TweetList: React.FC<TweetListProps> = ({
  tweets,
  annotations,
  selectedTweetId,
  activeTab,
  onSelectTweet,
  onTabChange,
}) => {
  const filteredTweets = tweets.filter((tweet) => {
    if (activeTab === 'all') return true;
    
    const annotation = annotations.find((a) => a.tweetId === tweet.id);
    if (activeTab === 'grouped') return annotation && annotation.group.trim() !== '';
    if (activeTab === 'ungrouped') return !annotation || annotation.group.trim() === '';
    
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            type="button"
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === 'all'
                ? 'bg-white dark:bg-gray-800 border border-gray-300 rounded-t'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
            onClick={() => onTabChange('all')}
          >
            所有
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === 'ungrouped'
                ? 'bg-white dark:bg-gray-800 border border-gray-300 rounded-t'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
            onClick={() => onTabChange('ungrouped')}
          >
            未分组
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === 'grouped'
                ? 'bg-white dark:bg-gray-800 border border-gray-300 rounded-t'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
            onClick={() => onTabChange('grouped')}
          >
            已分组
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredTweets.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            没有找到符合条件的推文
          </div>
        ) : (
          <ul>
            {filteredTweets.map((tweet) => {
              const annotation = annotations.find((a) => a.tweetId === tweet.id);
              return (
                <li
                  key={tweet.id}
                  className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    selectedTweetId === tweet.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                  }`}
                  onClick={() => onSelectTweet(tweet.id)}
                >
                  <div className="flex flex-col">
                    <div className="flex items-start mb-2">
                      <div className="mr-3 relative">
                        <span className="absolute -left-4 text-gray-400 font-bold text-lg">•</span>
                        <img
                          src={tweet.user.avatarUrl}
                          alt={tweet.user.username}
                          className="w-12 h-12 rounded"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {tweet.user.displayName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          @{tweet.user.username}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {tweet.id}
                        </p>
                      </div>
                    </div>
                    {annotation && annotation.group && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 ml-16">
                        {annotation.group}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}; 