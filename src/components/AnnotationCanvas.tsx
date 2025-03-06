import React, { useRef, useEffect, useState } from 'react';
import { Annotation, Point, ImageData } from '../types';

interface AnnotationCanvasProps {
  image: ImageData | null;
  selectedAnnotation: Annotation | null;
  drawingPoints: Point[];
  isDrawing: boolean;
  onAddPoint: (point: Point) => void;
  onSelectAnnotation: (annotation: Annotation | null) => void;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  image,
  selectedAnnotation,
  drawingPoints,
  isDrawing,
  onAddPoint,
  onSelectAnnotation,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [mousePosition, setMousePosition] = useState<Point | null>(null);

  // 计算适当的缩放比例以适应容器
  useEffect(() => {
    if (!image || !containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const scaleX = containerWidth / image.width;
    const scaleY = containerHeight / image.height;
    const newScale = Math.min(scaleX, scaleY, 1); // 限制最大缩放为1
    
    setScale(newScale);
  }, [image, containerRef.current?.clientWidth, containerRef.current?.clientHeight]);

  // 绘制图像和标注
  useEffect(() => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置canvas尺寸
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 创建图像对象
    const img = new Image();
    img.src = image.src;
    img.onload = () => {
      // 绘制图像
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 绘制所有标注
      image.annotations.forEach(annotation => {
        drawAnnotation(ctx, annotation, annotation.id === selectedAnnotation?.id);
      });

      // 绘制当前绘制中的点和线
      if (drawingPoints.length > 0) {
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(drawingPoints[0].x * scale, drawingPoints[0].y * scale);
        
        drawingPoints.slice(1).forEach(point => {
          ctx.lineTo(point.x * scale, point.y * scale);
        });
        
        if (mousePosition && isDrawing) {
          ctx.lineTo(mousePosition.x * scale, mousePosition.y * scale);
        }
        
        if (drawingPoints.length > 2) {
          ctx.closePath();
        }
        
        ctx.stroke();
        
        // 绘制顶点
        drawingPoints.forEach(point => {
          ctx.fillStyle = '#FF0000';
          ctx.beginPath();
          ctx.arc(point.x * scale, point.y * scale, 4, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    };
  }, [image, selectedAnnotation, drawingPoints, scale, mousePosition, isDrawing]);

  // 绘制单个标注
  const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: Annotation, isSelected: boolean) => {
    const { points, color, type } = annotation;
    
    ctx.strokeStyle = color;
    ctx.fillStyle = color + '33'; // 添加透明度
    ctx.lineWidth = isSelected ? 3 : 2;
    
    ctx.beginPath();
    
    if (type === 'point') {
      const point = points[0];
      ctx.arc(point.x * scale, point.y * scale, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      return;
    }
    
    // 为矩形和多边形绘制路径
    if (points.length > 0) {
      ctx.moveTo(points[0].x * scale, points[0].y * scale);
      
      points.slice(1).forEach(point => {
        ctx.lineTo(point.x * scale, point.y * scale);
      });
      
      if (type === 'rectangle' || (type === 'polygon' && points.length > 2)) {
        ctx.closePath();
      }
    }
    
    ctx.fill();
    ctx.stroke();
    
    // 如果被选中，绘制控制点
    if (isSelected) {
      points.forEach(point => {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x * scale, point.y * scale, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      });
    }
  };

  // 鼠标点击处理
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    // 检查是否点击了现有的标注
    let clickedAnnotation: Annotation | null = null;
    
    // 反向遍历以选择最上层的标注
    for (let i = image.annotations.length - 1; i >= 0; i--) {
      const annotation = image.annotations[i];
      if (isPointInAnnotation({ x, y }, annotation)) {
        clickedAnnotation = annotation;
        break;
      }
    }
    
    if (clickedAnnotation) {
      onSelectAnnotation(clickedAnnotation);
    } else {
      onAddPoint({ x, y });
    }
  };

  // 鼠标移动处理
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setMousePosition({ x, y });
  };

  // 判断点是否在标注内
  const isPointInAnnotation = (point: Point, annotation: Annotation): boolean => {
    const { type, points } = annotation;
    
    if (type === 'point') {
      const annotationPoint = points[0];
      const dx = point.x - annotationPoint.x;
      const dy = point.y - annotationPoint.y;
      return Math.sqrt(dx * dx + dy * dy) <= 5;
    }
    
    if (type === 'rectangle') {
      const minX = Math.min(...points.map(p => p.x));
      const maxX = Math.max(...points.map(p => p.x));
      const minY = Math.min(...points.map(p => p.y));
      const maxY = Math.max(...points.map(p => p.y));
      
      return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
    }
    
    if (type === 'polygon') {
      return isPointInPolygon(point, points);
    }
    
    return false;
  };

  // 判断点是否在多边形内
  const isPointInPolygon = (point: Point, polygonPoints: Point[]): boolean => {
    if (polygonPoints.length < 3) return false;
    
    let inside = false;
    for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
      const intersect = ((polygonPoints[i].y > point.y) !== (polygonPoints[j].y > point.y)) &&
        (point.x < (polygonPoints[j].x - polygonPoints[i].x) * (point.y - polygonPoints[i].y) / (polygonPoints[j].y - polygonPoints[i].y) + polygonPoints[i].x);
      if (intersect) inside = !inside;
    }
    
    return inside;
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-gray-800 flex items-center justify-center">
      {image ? (
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full"
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
        />
      ) : (
        <div className="text-white text-lg">请上传或选择图片</div>
      )}
    </div>
  );
}; 