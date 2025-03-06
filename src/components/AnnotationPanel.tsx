import React from 'react';
import { Annotation, ImageData } from '../types';

interface AnnotationPanelProps {
  image: ImageData | null;
  selectedAnnotation: Annotation | null;
  onSelectAnnotation: (annotation: Annotation | null) => void;
  onDeleteAnnotation: (id: string) => void;
  onUpdateAnnotation: (annotation: Annotation) => void;
}

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  image,
  selectedAnnotation,
  onSelectAnnotation,
  onDeleteAnnotation,
  onUpdateAnnotation,
}) => {
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedAnnotation) return;
    
    onUpdateAnnotation({
      ...selectedAnnotation,
      label: e.target.value,
    });
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedAnnotation) return;
    
    onUpdateAnnotation({
      ...selectedAnnotation,
      color: e.target.value,
    });
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 border-l border-gray-300 dark:border-gray-700 flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">标注信息</h2>
      
      {image ? (
        <>
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">图像信息</h3>
            <div className="bg-white dark:bg-gray-700 rounded p-3 text-sm">
              <p className="text-gray-800 dark:text-gray-200">
                尺寸: {image.width} x {image.height}
              </p>
              <p className="text-gray-800 dark:text-gray-200">
                标注数量: {image.annotations.length}
              </p>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">标注列表</h3>
            {image.annotations.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {image.annotations.map(annotation => (
                  <div
                    key={annotation.id}
                    className={`p-2 rounded cursor-pointer ${
                      selectedAnnotation?.id === annotation.id
                        ? 'bg-blue-100 dark:bg-blue-900'
                        : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => onSelectAnnotation(annotation)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-2"
                          style={{ backgroundColor: annotation.color }}
                        ></div>
                        <span className="text-gray-800 dark:text-gray-200 text-sm">
                          {annotation.label || '未命名'} ({annotation.type})
                        </span>
                      </div>
                      <button
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAnnotation(annotation.id);
                        }}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          ></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-700 rounded p-3 text-sm text-gray-500 dark:text-gray-400">
                暂无标注
              </div>
            )}
          </div>
          
          {selectedAnnotation && (
            <div className="mt-auto">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">编辑标注</h3>
              <div className="bg-white dark:bg-gray-700 rounded p-3 space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    标签
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm"
                    value={selectedAnnotation.label}
                    onChange={handleLabelChange}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    颜色
                  </label>
                  <div className="flex items-center">
                    <input
                      type="color"
                      className="w-8 h-8 border-0 p-0 mr-2"
                      value={selectedAnnotation.color}
                      onChange={handleColorChange}
                    />
                    <input
                      type="text"
                      className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm"
                      value={selectedAnnotation.color}
                      onChange={handleColorChange}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    类型
                  </label>
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm text-gray-800 dark:text-gray-200">
                    {selectedAnnotation.type}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    坐标点
                  </label>
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm text-gray-800 dark:text-gray-200 max-h-24 overflow-y-auto">
                    {selectedAnnotation.points.map((point, index) => (
                      <div key={index} className="mb-1">
                        点 {index + 1}: ({point.x.toFixed(0)}, {point.y.toFixed(0)})
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-gray-500 dark:text-gray-400 text-center mt-8">
          请上传或选择图片
        </div>
      )}
    </div>
  );
}; 