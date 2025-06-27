// components/TaskRenderer.tsx - Advanced Skia rendering engine for tasks
import React, { useMemo } from 'react';
import {
  Canvas,
  Rect,
  RRect,
  rrect,
  rect,
  Text as SkiaText,
  useFont,
  Circle,
  Path,
  Skia,
  Paint,
  FontStyle,
} from '@shopify/react-native-skia';
import { DisplayableTaskItem } from '@/features/tasks/types';
import { useAppTheme } from '@/hooks/ThemeContext';
import { fontSizes } from '@/constants/fontSizes';
import { useContext } from 'react';
import { FontSizeContext } from '@/context/FontSizeContext';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

// Task rendering constants
export const TASK_HEIGHT = 60;
export const TASK_MARGIN = 2;
export const TASK_PADDING = 16;
export const CHECKBOX_SIZE = 24;
export const BORDER_RADIUS = 8;

interface TaskRendererProps {
  task: DisplayableTaskItem;
  index: number;
  yPosition: number;
  canvasWidth: number;
  isSelected: boolean;
  isBeingDragged: boolean;
  isDraggedOver: boolean;
  currentTab: 'incomplete' | 'completed';
}

interface TaskRenderingContext {
  colors: {
    background: string;
    text: string;
    textSecondary: string;
    border: string;
    selected: string;
    accent: string;
    checkbox: string;
    checkboxBorder: string;
  };
  fonts: {
    title: any; // Font object
    subtitle: any;
  };
  dimensions: {
    taskHeight: number;
    padding: number;
    checkboxSize: number;
    borderRadius: number;
  };
}

export const useTaskRenderingContext = (): TaskRenderingContext => {
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const { fontSizeKey } = useContext(FontSizeContext);
  
  // Use null for fonts - we'll implement text as rectangles for now
  // This avoids font loading issues and provides consistent rendering
  const titleFont = null;
  const subtitleFont = null;

  const colors = useMemo(() => ({
    background: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? '#8E8E93' : '#6D6D72',
    border: isDark ? '#38383A' : '#E5E5EA',
    selected: isDark ? '#0A84FF20' : '#007AFF20',
    accent: subColor,
    checkbox: isDark ? '#48484A' : '#C7C7CC',
    checkboxBorder: isDark ? '#6D6D72' : '#C7C7CC',
  }), [isDark, subColor]);

  return {
    colors,
    fonts: {
      title: titleFont || null,
      subtitle: subtitleFont || null,
    },
    dimensions: {
      taskHeight: TASK_HEIGHT,
      padding: TASK_PADDING,
      checkboxSize: CHECKBOX_SIZE,
      borderRadius: BORDER_RADIUS,
    },
  };
};

export const TaskRenderer: React.FC<TaskRendererProps> = ({
  task,
  index,
  yPosition,
  canvasWidth,
  isSelected,
  isBeingDragged,
  isDraggedOver,
  currentTab,
}) => {
  const context = useTaskRenderingContext();
  const { t } = useTranslation();
  
  const { colors, fonts, dimensions } = context;
  
  // Task completion state
  const isCompleted = useMemo(() => {
    if (task.isCompletedInstance) return true;
    if (currentTab === 'completed') return true;
    return !!task.completedAt;
  }, [task, currentTab]);

  // Deadline display text
  const deadlineText = useMemo(() => {
    if (!task.deadline) return t('task_list.no_deadline', 'なし');
    
    const deadline = dayjs(task.deadline);
    const now = dayjs();
    
    if (deadline.isBefore(now, 'day')) {
      return t('task_list.overdue', '期限切れ');
    } else if (deadline.isSame(now, 'day')) {
      return t('task_list.today', '今日');
    } else if (deadline.isSame(now.add(1, 'day'), 'day')) {
      return t('task_list.tomorrow', '明日');
    }
    
    return deadline.format('M/D');
  }, [task.deadline, t]);

  // Create paint objects for efficient rendering
  const backgroundPaint = useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(isSelected ? colors.selected : colors.background));
    paint.setStyle(1); // Fill
    return paint;
  }, [isSelected, colors]);

  const borderPaint = useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(colors.border));
    paint.setStyle(0); // Stroke
    paint.setStrokeWidth(1);
    return paint;
  }, [colors]);

  const checkboxPaint = useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(isCompleted ? colors.accent : colors.checkbox));
    paint.setStyle(isCompleted ? 1 : 0); // Fill if completed, stroke if not
    paint.setStrokeWidth(2);
    return paint;
  }, [isCompleted, colors]);

  const textPaint = useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(colors.text));
    paint.setAntiAlias(true);
    return paint;
  }, [colors]);

  const subtextPaint = useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(colors.textSecondary));
    paint.setAntiAlias(true);
    return paint;
  }, [colors]);

  // Render task background and border
  const taskRect = rect(0, yPosition, canvasWidth, dimensions.taskHeight);
  const roundedTaskRect = rrect(taskRect, dimensions.borderRadius, dimensions.borderRadius);

  // Checkbox position
  const checkboxX = dimensions.padding;
  const checkboxY = yPosition + (dimensions.taskHeight - dimensions.checkboxSize) / 2;
  const checkboxRect = rect(checkboxX, checkboxY, dimensions.checkboxSize, dimensions.checkboxSize);

  // Text positions
  const titleX = dimensions.padding + dimensions.checkboxSize + 12;
  const titleY = yPosition + 20; // Approximate position for title
  const deadlineX = canvasWidth - dimensions.padding - 60; // Right aligned
  const deadlineY = yPosition + dimensions.taskHeight / 2 + 4;

  // Apply dragging visual effects
  const dragOpacity = isBeingDragged ? 0.8 : 1.0;
  const dragScale = isBeingDragged ? 1.02 : 1.0;

  return (
    <>
      {/* Task background */}
      <RRect rect={roundedTaskRect} paint={backgroundPaint} opacity={dragOpacity} />
      
      {/* Task border */}
      <RRect rect={roundedTaskRect} paint={borderPaint} opacity={dragOpacity} />
      
      {/* Checkbox */}
      <Rect rect={checkboxRect} paint={checkboxPaint} opacity={dragOpacity} />
      
      {/* Checkmark if completed */}
      {isCompleted && (
        <Path
          path="M 6 12 L 10 16 L 18 8" // Simple checkmark path
          paint={textPaint}
          style="stroke"
          strokeWidth={2}
          opacity={dragOpacity}
          transform={[
            { translateX: checkboxX + 3 },
            { translateY: checkboxY + 3 },
            { scale: 0.8 }
          ]}
        />
      )}
      
      {/* Task title - conditional rendering based on font availability */}
      {fonts.title && (
        <SkiaText
          x={titleX}
          y={titleY}
          text={task.title}
          font={fonts.title}
          paint={textPaint}
          opacity={dragOpacity}
        />
      )}
      
      {/* Fallback for title if font unavailable */}
      {!fonts.title && (
        <Rect
          rect={rect(titleX, titleY - 12, Math.min(task.title.length * 8, canvasWidth - titleX - 80), 14)}
          paint={textPaint}
          opacity={dragOpacity * 0.3}
        />
      )}
      
      {/* Deadline text */}
      {fonts.subtitle && (
        <SkiaText
          x={deadlineX}
          y={deadlineY}
          text={deadlineText}
          font={fonts.subtitle}
          paint={subtextPaint}
          opacity={dragOpacity}
        />
      )}
      
      {/* Drag indicator - visual feedback during drag */}
      {isBeingDragged && (
        <Rect
          rect={rect(0, yPosition, 4, dimensions.taskHeight)}
          paint={(() => {
            const paint = Skia.Paint();
            paint.setColor(Skia.Color(colors.accent));
            return paint;
          })()}
          opacity={0.8}
        />
      )}
      
      {/* Drop zone indicator */}
      {isDraggedOver && (
        <Rect
          rect={rect(0, yPosition - 1, canvasWidth, 2)}
          paint={(() => {
            const paint = Skia.Paint();
            paint.setColor(Skia.Color(colors.accent));
            return paint;
          })()}
          opacity={0.8}
        />
      )}
    </>
  );
};