import React, { useState, useEffect } from 'react';
import { Tweet, TweetAnnotation } from '../types';

interface AnnotationControlsProps {
  tweet: Tweet | null;
  annotation: TweetAnnotation | null;
  onUpdateAnnotation: (annotation: TweetAnnotation) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
}

export const AnnotationControls: React.FC<AnnotationControlsProps> = ({
  tweet,
  annotation,
  onUpdateAnnotation,
  onNavigatePrev,
  onNavigateNext,
}) => {
  const [group, setGroup] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (annotation) {
      setGroup(annotation.group);
      setNotes(annotation.notes);
    } else {
      setGroup('');
      setNotes('');
    }
  }, [annotation]);

  const handleSave = () => {
    if (!tweet) return;

    const updatedAnnotation: TweetAnnotation = {
      id: annotation?.id || `anno-${tweet.id}`,
      tweetId: tweet.id,
      group,
      notes,
    };

    onUpdateAnnotation(updatedAnnotation);
  };

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
        <div className="mb-6">
          <label htmlFor="group" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            分组
          </label>
          <input
            type="text"
            id="group"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="输入分组名称"
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            备注
          </label>
          <textarea
            id="notes"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="添加备注"
          />
        </div>
        
        <div className="flex justify-between mb-6">
          <button
            type="button"
            onClick={onNavigatePrev}
            className="w-20 h-12 flex justify-center items-center border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            type="button"
            onClick={onNavigateNext}
            className="w-20 h-12 flex justify-center items-center border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={handleSave}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            保存标注
          </button>
        </div>
      </div>
    </div>
  );
}; 