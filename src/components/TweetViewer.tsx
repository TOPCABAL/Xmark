import React from 'react';
import { Tweet } from '../types';

interface TweetViewerProps {
  tweet: Tweet | null;
}

export const TweetViewer: React.FC<TweetViewerProps> = ({ tweet }) => {
  if (!tweet) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 bg-white dark:bg-gray-800">
        <div className="text-center">
          <p className="mt-2">请从左侧选择一个推文</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-gray-800 p-6">
      <div className="bg-white dark:bg-gray-800">
        {/* 推特头部信息 */}
        <div className="flex items-start space-x-3 mb-6">
          <img
            src={tweet.user.avatarUrl}
            alt={tweet.user.displayName}
            className="w-12 h-12 rounded-full"
          />
          <div>
            <div className="flex items-center">
              <span className="font-bold text-gray-900 dark:text-white">
                {tweet.user.displayName}
              </span>
              <svg className="h-4 w-4 ml-1 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
              </svg>
              <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">
                @{tweet.user.username}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {tweet.date}
            </p>
          </div>
        </div>

        {/* 推特内容 */}
        <div className="mb-4">
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap text-lg">{tweet.content}</p>
        </div>

        {/* 推特媒体 */}
        {tweet.media && tweet.media.length > 0 && (
          <div className="mb-6 border rounded-lg overflow-hidden">
            {tweet.media.map((src, index) => (
              <img
                key={index}
                src={src}
                alt={`Media ${index + 1}`}
                className="w-full object-cover"
              />
            ))}
          </div>
        )}

        {/* 推特互动信息 */}
        <div className="flex justify-between text-gray-500 pt-4 border-t">
          <div className="flex items-center space-x-1">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>{tweet.replies}</span>
          </div>
          <div className="flex items-center space-x-1">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{tweet.retweets}</span>
          </div>
          <div className="flex items-center space-x-1">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>{tweet.likes}</span>
          </div>
          <div className="flex items-center space-x-1">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.48-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}; 