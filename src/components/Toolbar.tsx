import React from 'react';
import { ToolState } from '../types';

interface ToolbarProps {
  toolState: ToolState;
  onSetActiveTool: (tool: ToolState['activeTool']) => void;
  onSetActiveColor: (color: string) => void;
  onSetActiveLabel: (label: string) => void;
  onCompletePolygon: () => void;
  isDrawingPolygon: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  toolState,
  onSetActiveTool,
  onSetActiveColor,
  onSetActiveLabel,
  onCompletePolygon,
  isDrawingPolygon,
}) => {
  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  const labels = ['人物', '车辆', '建筑', '动物', '植物', '其他'];

  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 border-r border-gray-300 dark:border-gray-700 flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">标注工具</h2>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">选择工具</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`p-2 rounded ${toolState.activeTool === 'select' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'}`}
              onClick={() => onSetActiveTool('select')}
            >
              选择
            </button>
            <button
              className={`p-2 rounded ${toolState.activeTool === 'point' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'}`}
              onClick={() => onSetActiveTool('point')}
            >
              点
            </button>
            <button
              className={`p-2 rounded ${toolState.activeTool === 'rectangle' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'}`}
              onClick={() => onSetActiveTool('rectangle')}
            >
              矩形
            </button>
            <button
              className={`p-2 rounded ${toolState.activeTool === 'polygon' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'}`}
              onClick={() => onSetActiveTool('polygon')}
            >
              多边形
            </button>
          </div>
        </div>

        {isDrawingPolygon && (
          <button
            className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={onCompletePolygon}
          >
            完成多边形
          </button>
        )}
        
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">选择颜色</p>
          <div className="grid grid-cols-3 gap-2">
            {colors.map(color => (
              <button
                key={color}
                className={`w-full h-8 rounded ${toolState.activeColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onSetActiveColor(color)}
                aria-label={`选择颜色 ${color}`}
              />
            ))}
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">选择标签</p>
          <div className="grid grid-cols-2 gap-2">
            {labels.map(label => (
              <button
                key={label}
                className={`p-2 rounded ${toolState.activeLabel === label ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'}`}
                onClick={() => onSetActiveLabel(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-2 mt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">自定义标签</p>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            value={toolState.activeLabel}
            onChange={(e) => onSetActiveLabel(e.target.value)}
            placeholder="输入自定义标签"
          />
        </div>
      </div>
    </div>
  );
}; 