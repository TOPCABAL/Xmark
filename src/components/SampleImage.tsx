import React from 'react';
import { ImageData } from '../types';
import { v4 as uuidv4 } from 'uuid';

// 示例图片数据
const sampleImages: ImageData[] = [
  {
    id: uuidv4(),
    src: 'https://images.unsplash.com/photo-1579353977828-2a4eab540b9a?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80',
    width: 1000,
    height: 667,
    annotations: [],
  },
  {
    id: uuidv4(),
    src: 'https://images.unsplash.com/photo-1584715642381-6f1c4b452b1c?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80',
    width: 1000,
    height: 667,
    annotations: [],
  },
];

interface SampleImageProps {
  onSelectImage: (image: ImageData) => void;
}

export const SampleImage: React.FC<SampleImageProps> = ({ onSelectImage }) => {
  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">示例图片</h3>
      <div className="grid grid-cols-2 gap-4">
        {sampleImages.map(image => (
          <div
            key={image.id}
            className="cursor-pointer overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
            onClick={() => onSelectImage(image)}
          >
            <img
              src={image.src}
              alt="示例图片"
              className="w-full h-32 object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}; 