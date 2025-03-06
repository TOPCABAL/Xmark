import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Annotation, Point, ToolState, ImageData } from '../types';

export const useAnnotation = (initialImage?: ImageData) => {
  const [image, setImage] = useState<ImageData | null>(initialImage || null);
  const [toolState, setToolState] = useState<ToolState>({
    activeTool: null,
    activeColor: '#FF0000',
    activeLabel: 'Object',
  });
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // 加载图片
  const loadImage = useCallback((imgData: ImageData) => {
    setImage(imgData);
    setSelectedAnnotation(null);
    setDrawingPoints([]);
    setIsDrawing(false);
  }, []);

  // 设置活动工具
  const setActiveTool = useCallback((tool: ToolState['activeTool']) => {
    setToolState(prev => ({ ...prev, activeTool: tool }));
    setSelectedAnnotation(null);
    setDrawingPoints([]);
    setIsDrawing(false);
  }, []);

  // 设置活动颜色
  const setActiveColor = useCallback((color: string) => {
    setToolState(prev => ({ ...prev, activeColor: color }));
  }, []);

  // 设置活动标签
  const setActiveLabel = useCallback((label: string) => {
    setToolState(prev => ({ ...prev, activeLabel: label }));
  }, []);

  // 添加注释点
  const addPoint = useCallback((point: Point) => {
    if (!image || !toolState.activeTool) return;
    
    if (toolState.activeTool === 'point') {
      // 创建一个点注释
      const annotation: Annotation = {
        id: uuidv4(),
        type: 'point',
        points: [point],
        label: toolState.activeLabel,
        color: toolState.activeColor,
      };
      
      setImage(prev => {
        if (!prev) return null;
        return {
          ...prev,
          annotations: [...prev.annotations, annotation],
        };
      });
    } else if (toolState.activeTool === 'rectangle') {
      if (!isDrawing) {
        setDrawingPoints([point]);
        setIsDrawing(true);
      } else {
        // 使用起始点和当前点创建矩形
        const startPoint = drawingPoints[0];
        const annotation: Annotation = {
          id: uuidv4(),
          type: 'rectangle',
          points: [
            startPoint,
            { x: point.x, y: startPoint.y },
            point,
            { x: startPoint.x, y: point.y },
          ],
          label: toolState.activeLabel,
          color: toolState.activeColor,
        };
        
        setImage(prev => {
          if (!prev) return null;
          return {
            ...prev,
            annotations: [...prev.annotations, annotation],
          };
        });
        
        setDrawingPoints([]);
        setIsDrawing(false);
      }
    } else if (toolState.activeTool === 'polygon') {
      setDrawingPoints(prev => [...prev, point]);
    }
  }, [image, toolState, isDrawing, drawingPoints]);

  // 完成多边形绘制
  const completePolygon = useCallback(() => {
    if (!image || toolState.activeTool !== 'polygon' || drawingPoints.length < 3) return;
    
    const annotation: Annotation = {
      id: uuidv4(),
      type: 'polygon',
      points: [...drawingPoints],
      label: toolState.activeLabel,
      color: toolState.activeColor,
    };
    
    setImage(prev => {
      if (!prev) return null;
      return {
        ...prev,
        annotations: [...prev.annotations, annotation],
      };
    });
    
    setDrawingPoints([]);
    setIsDrawing(false);
  }, [image, toolState, drawingPoints]);

  // 选择注释
  const selectAnnotation = useCallback((annotation: Annotation | null) => {
    setSelectedAnnotation(annotation);
  }, []);

  // 删除注释
  const deleteAnnotation = useCallback((annotationId: string) => {
    setImage(prev => {
      if (!prev) return null;
      return {
        ...prev,
        annotations: prev.annotations.filter(a => a.id !== annotationId),
      };
    });
    if (selectedAnnotation?.id === annotationId) {
      setSelectedAnnotation(null);
    }
  }, [selectedAnnotation]);

  // 更新注释
  const updateAnnotation = useCallback((updatedAnnotation: Annotation) => {
    setImage(prev => {
      if (!prev) return null;
      return {
        ...prev,
        annotations: prev.annotations.map(a => 
          a.id === updatedAnnotation.id ? updatedAnnotation : a
        ),
      };
    });
    if (selectedAnnotation?.id === updatedAnnotation.id) {
      setSelectedAnnotation(updatedAnnotation);
    }
  }, [selectedAnnotation]);

  return {
    image,
    toolState,
    selectedAnnotation,
    drawingPoints,
    isDrawing,
    loadImage,
    setActiveTool,
    setActiveColor,
    setActiveLabel,
    addPoint,
    completePolygon,
    selectAnnotation,
    deleteAnnotation,
    updateAnnotation,
  };
}; 