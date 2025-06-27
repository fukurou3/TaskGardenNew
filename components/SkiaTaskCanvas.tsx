// components/SkiaTaskCanvas.tsx - Optimized Skia Canvas implementation
import React, { useMemo, useCallback, useState, memo, useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import { useSharedValue, withTiming, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { 
  Canvas, 
  Rect, 
  RoundedRect,
  rrect, 
  rect,
  Text as SkiaText,
  useFont,
  Paint,
  Skia
} from '@shopify/react-native-skia';
import { GestureDetector } from 'react-native-gesture-handler';
import { useAppTheme } from '@/hooks/ThemeContext';
import { useAdvancedGestureHandler } from './DragGestureHandler';
import { DRAG_CONFIG, COLORS, ITEM_HEIGHT } from './SkiaTaskCanvas/constants';
import { getTimeText, getTimeColor, calculateActualDueDate } from '@/features/tasks/utils';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useContext } from 'react';
import { FontSizeContext } from '@/context/FontSizeContext';
import { fontSizes as appFontSizes } from '@/constants/fontSizes';
import type { 
  SkiaTaskCanvasProps, 
  SkiaTaskProps, 
  ColorScheme, 
  DragState,
  DragError 
} from './SkiaTaskCanvas/types';

dayjs.extend(utc);
dayjs.extend(timezone);

// Memoized task component for optimal performance
const SkiaTask = memo<SkiaTaskProps>(({ 
  task, 
  index, 
  isSelected, 
  isBeingDragged, 
  isDraggedOver, 
  isLongPressed,
  y, 
  canvasWidth, 
  colors, 
  currentTab, 
  font,
  deadlineFont,
  isInsideFolder = false
}) => {
  // Enhanced visual effects with constants
  const opacity = isBeingDragged ? DRAG_CONFIG.DRAG_OPACITY : (isLongPressed ? 0.95 : 1.0);
  const scale = isBeingDragged ? DRAG_CONFIG.DRAG_SCALE : (isLongPressed ? 1.02 : 1.0);
  const isCompleted = !!task.completedAt || task.isCompletedInstance || currentTab === 'completed';
  
  // Simple overlay state for long press - persists until drag ends
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Track long press and drag lifecycle
  useEffect(() => {
    if (isLongPressed) {
      // Fade in overlay when long press is detected
      setOverlayOpacity(0.08);
      setIsDragActive(true);
    } else if (isBeingDragged) {
      // Keep overlay during drag
      setOverlayOpacity(0.08);
    } else if (isDragActive && !isBeingDragged && !isLongPressed) {
      // Fade out overlay only when drag completely ends
      setOverlayOpacity(0);
      setIsDragActive(false);
    }
  }, [isLongPressed, isBeingDragged, isDragActive]);

  // Task background - layout depends on folder vs standalone
  const taskWidth = isInsideFolder ? canvasWidth : canvasWidth - (DRAG_CONFIG.TASK_MARGIN_HORIZONTAL * 2);
  const scaledWidth = taskWidth * scale;
  const scaledHeight = DRAG_CONFIG.TASK_HEIGHT * scale;
  const offsetX = isInsideFolder 
    ? (isBeingDragged ? (taskWidth - scaledWidth) / 2 : 0)
    : (isBeingDragged ? DRAG_CONFIG.TASK_MARGIN_HORIZONTAL + (taskWidth - scaledWidth) / 2 : DRAG_CONFIG.TASK_MARGIN_HORIZONTAL);
  const yOffset = isInsideFolder ? y : y + DRAG_CONFIG.TASK_MARGIN_TOP;
  const taskRect = rect(offsetX, yOffset, isBeingDragged ? scaledWidth : taskWidth, scaledHeight);
  const roundedRect = rrect(taskRect, isInsideFolder ? 0 : DRAG_CONFIG.BORDER_RADIUS, isInsideFolder ? 0 : DRAG_CONFIG.BORDER_RADIUS);

  // Checkbox dimensions - different for folder vs standalone
  const checkboxX = isInsideFolder 
    ? offsetX + 20 + DRAG_CONFIG.CHECKBOX_PADDING_LEFT // folderTaskItemContainer paddingLeft: 20
    : offsetX + DRAG_CONFIG.TASK_PADDING_HORIZONTAL + DRAG_CONFIG.CHECKBOX_PADDING_LEFT; // taskItemContainer paddingHorizontal: 16
  const checkboxY = yOffset + (DRAG_CONFIG.TASK_HEIGHT - DRAG_CONFIG.CHECKBOX_SIZE) / 2;
  const checkboxRect = rect(checkboxX, checkboxY, DRAG_CONFIG.CHECKBOX_SIZE, DRAG_CONFIG.CHECKBOX_SIZE);

  // Text positions - consistent spacing from checkbox
  const titleX = checkboxX + DRAG_CONFIG.CHECKBOX_SIZE + DRAG_CONFIG.CHECKBOX_PADDING_RIGHT;
  const titleY = yOffset + (DRAG_CONFIG.TASK_HEIGHT / 2) + 6; // Center text vertically
  
  // Use translation hook for deadline text
  const { t, i18n } = useTranslation();
  
  // Calculate effective due date using same logic as TaskItem
  const effectiveDueDateUtc = useMemo(() => {
    if (task.isCompletedInstance && task.instanceDate) {
        return dayjs.utc(task.instanceDate);
    }
    return task.displaySortDate || calculateActualDueDate(task);
  }, [task.isCompletedInstance, task.instanceDate, task.displaySortDate, task.deadline, task.deadlineDetails]);

  const displayStartDateUtc = useMemo(() => {
    if (!task.isCompletedInstance && (task.deadlineDetails as any)?.isPeriodSettingEnabled && (task.deadlineDetails as any).periodStartDate) {
      let startDate = dayjs.utc((task.deadlineDetails as any).periodStartDate);
      if ((task.deadlineDetails as any).periodStartTime) {
        startDate = startDate
          .hour((task.deadlineDetails as any).periodStartTime.hour)
          .minute((task.deadlineDetails as any).periodStartTime.minute);
      } else {
        startDate = startDate.startOf('day');
      }
      return startDate;
    }
    return null;
  }, [task.isCompletedInstance, task.deadlineDetails]);
  
  // Use exact same deadline display logic as TaskItem
  const deadlineDisplay = useMemo(() => {
    const rawText = task.isCompletedInstance
      ? t('task_list.completed_on_date_time', { date: dayjs.utc(task.instanceDate).local().locale(i18n.language).format(t('common.date_time_format_short', "M/D H:mm"))})
      : getTimeText(task, t, effectiveDueDateUtc, displayStartDateUtc);
    
    const color = task.isCompletedInstance
      ? (colors.textSecondary)
      : getTimeColor(task, colors.text === '#FFFFFF', effectiveDueDateUtc, displayStartDateUtc);
    
    const text = rawText.startsWith('🔁') ? rawText.substring(1) : rawText;
    const showRepeatIcon = !!(task.deadlineDetails?.repeatFrequency && !task.isCompletedInstance && currentTab === 'incomplete');
    
    return { text, color, showRepeatIcon };
  }, [task, t, i18n.language, effectiveDueDateUtc, displayStartDateUtc, colors.textSecondary, colors.text, currentTab]);
  
  const deadlineText = deadlineDisplay.text;
  const deadlineColor = deadlineDisplay.color;
  
  // Position deadline text with more margin from right edge
  const deadlineTextWidth = deadlineFont && deadlineText ? deadlineFont.measureText(deadlineText).width : 60;
  const deadlineX = isInsideFolder 
    ? offsetX + (isBeingDragged ? scaledWidth : taskWidth) - 16 - deadlineTextWidth - 40 // Added 40px margin from right
    : offsetX + (isBeingDragged ? scaledWidth : taskWidth) - DRAG_CONFIG.TASK_PADDING_HORIZONTAL - deadlineTextWidth - 40; // Added 40px margin from right
  const deadlineY = titleY; // Match title Y position exactly
  
  // Dynamic text measurement with exact TaskItem text area calculation
  const truncatedTitle = useMemo(() => {
    if (!font) return task.title;
    
    // Calculate exact text area like TaskItem's taskCenter
    const textAreaStart = titleX;
    const textAreaEnd = deadlineX - 10; // Leave small gap before deadline
    const maxWidth = textAreaEnd - textAreaStart;
    
    const titleMeasurement = font.measureText(task.title);
    
    if (titleMeasurement.width <= maxWidth) {
      return task.title;
    }
    
    // Binary search for optimal text length
    let left = 0;
    let right = task.title.length;
    let bestFit = '';
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const testText = task.title.substring(0, mid) + '...';
      const testWidth = font.measureText(testText).width;
      
      if (testWidth <= maxWidth) {
        bestFit = testText;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return bestFit || task.title.substring(0, 1) + '...';
  }, [task.title, font, titleX, deadlineX]);

  return (
    <>
      {/* Drop zone indicator - REMOVED per user request */}
      
      {/* Subtle shadow effect for dragged items and long press feedback */}
      {(isBeingDragged || isLongPressed) && (
        <>
          {isInsideFolder ? (
            // Simple shadow for folder items
            <>
              <Rect 
                rect={rect(
                  offsetX + DRAG_CONFIG.SHADOW_OFFSET, 
                  yOffset + DRAG_CONFIG.SHADOW_OFFSET, 
                  isBeingDragged ? scaledWidth : taskWidth, 
                  scaledHeight
                )} 
                color={COLORS.SHADOW}
                opacity={0.15} 
              />
              <Rect 
                rect={rect(
                  offsetX + 1, 
                  yOffset + 1, 
                  isBeingDragged ? scaledWidth : taskWidth, 
                  scaledHeight
                )} 
                color={COLORS.SHADOW}
                opacity={0.08} 
              />
            </>
          ) : (
            // Rounded shadow for standalone items
            <>
              <RoundedRect 
                rect={rrect(
                  rect(
                    offsetX + DRAG_CONFIG.SHADOW_OFFSET, 
                    yOffset + DRAG_CONFIG.SHADOW_OFFSET, 
                    isBeingDragged ? scaledWidth : taskWidth, 
                    scaledHeight
                  ), 
                  DRAG_CONFIG.BORDER_RADIUS, 
                  DRAG_CONFIG.BORDER_RADIUS
                )} 
                color={COLORS.SHADOW}
                opacity={0.15} 
              />
              <RoundedRect 
                rect={rrect(
                  rect(
                    offsetX + 1, 
                    yOffset + 1, 
                    isBeingDragged ? scaledWidth : taskWidth, 
                    scaledHeight
                  ), 
                  DRAG_CONFIG.BORDER_RADIUS, 
                  DRAG_CONFIG.BORDER_RADIUS
                )} 
                color={COLORS.SHADOW}
                opacity={0.08} 
              />
            </>
          )}
        </>
      )}
      
      {/* Task background - only show for selected or dragged items */}
      {(isSelected || isBeingDragged || isLongPressed) && (
        <RoundedRect 
          rect={roundedRect} 
          color={isSelected ? colors.selected : colors.background}
          opacity={opacity} 
        />
      )}
      
      {/* Long press dark overlay effect */}
      {overlayOpacity > 0 && (
        <RoundedRect 
          rect={roundedRect}
          color={colors.text}
          opacity={overlayOpacity}
        />
      )}
      
      {/* Remove all task borders to match period order design */}
      
      {/* Checkbox */}
      <Rect 
        rect={checkboxRect} 
        color={isCompleted ? colors.accent : 'transparent'}
        opacity={opacity} 
      />
      <RoundedRect 
        rect={rrect(checkboxRect, 4, 4)} 
        style="stroke"
        strokeWidth={2}
        color={colors.accent}
        opacity={opacity} 
      />
      
      {/* Checkmark if completed - match TaskItem size */}
      {isCompleted && font && (
        <SkiaText
          x={checkboxX + 6}
          y={checkboxY + 18}
          text="✓"
          font={font}
          color={colors.background}
        />
      )}
      
      {/* Checkmark fallback (if no font) - match TaskItem size */}
      {isCompleted && !font && (
        <>
          {/* Simple checkmark lines */}
          <Rect 
            rect={rect(checkboxX + 6, checkboxY + 12, 6, 2)} 
            color={colors.background}
            opacity={opacity} 
          />
          <Rect 
            rect={rect(checkboxX + 12, checkboxY + 8, 8, 2)} 
            color={colors.background}
            opacity={opacity} 
          />
        </>
      )}
      
      {/* Task title with dynamic text measurement */}
      {font && (
        <SkiaText
          x={titleX}
          y={titleY}
          text={truncatedTitle}
          font={font}
          color={colors.text}
          opacity={opacity * (isCompleted ? 0.6 : 1.0)}
        />
      )}
      
      {/* Task title fallback (if no font) - match TaskItem text area */}
      {!font && (
        <>
          {/* Main title line with exact text area calculation */}
          <Rect 
            rect={rect(titleX, titleY - 8, Math.min(task.title.length * 8, deadlineX - titleX - 10), 4)} 
            color={colors.text}
            opacity={opacity * (isCompleted ? 0.4 : 0.8)} 
          />
          {/* Subtitle/description line */}
          {task.title.length > 15 && (
            <Rect 
              rect={rect(titleX, titleY - 2, Math.min(task.title.length * 6, deadlineX - titleX - 20), 3)} 
              color={colors.text}
              opacity={opacity * (isCompleted ? 0.3 : 0.6)} 
            />
          )}
        </>
      )}
      
      {/* Deadline text with urgency-based color and exact TaskItem font */}
      {deadlineText && deadlineFont && (
        <>
          {/* Repeat icon if needed */}
          {deadlineDisplay.showRepeatIcon && (
            <SkiaText
              x={deadlineX - 15}
              y={deadlineY}
              text="🔁"
              font={deadlineFont}
              color={deadlineColor}
              opacity={opacity}
            />
          )}
          <SkiaText
            x={deadlineX}
            y={deadlineY}
            text={deadlineText}
            font={deadlineFont}
            color={deadlineColor}
            opacity={opacity}
          />
        </>
      )}
      
      {/* Deadline fallback (if no font) - right-aligned */}
      {deadlineText && !font && (
        <>
          <Rect 
            rect={rect(deadlineX, deadlineY - 6, 35, 3)} 
            color={deadlineColor}
            opacity={opacity * 0.8} 
          />
          <Rect 
            rect={rect(deadlineX + 5, deadlineY - 2, 25, 2)} 
            color={colors.textSecondary}
            opacity={opacity * 0.6} 
          />
        </>
      )}
      
      {/* Enhanced drag indicator - left edge */}
      {isBeingDragged && (
        <>
          <Rect 
            rect={rect(offsetX - DRAG_CONFIG.DROP_ZONE_HEIGHT, yOffset, DRAG_CONFIG.DROP_ZONE_HEIGHT, scaledHeight)} 
            color={colors.accent}
            opacity={0.9} 
          />
          {/* Drag handle dots using constants */}
          {Array.from({ length: 4 }, (_, i) => (
            <Rect 
              key={i}
              rect={rect(
                offsetX + (isBeingDragged ? scaledWidth : taskWidth) - 20, 
                yOffset + scaledHeight/2 - 10 + i * DRAG_CONFIG.DRAG_HANDLE_SPACING, 
                DRAG_CONFIG.DRAG_HANDLE_SIZE, 
                DRAG_CONFIG.DRAG_HANDLE_SIZE
              )} 
              color={colors.accent}
              opacity={0.7} 
            />
          ))}
        </>
      )}
    </>
  );
});

// Display name for debugging
SkiaTask.displayName = 'SkiaTask';

// Optimized main component with error boundaries
export const SkiaTaskCanvas = memo<SkiaTaskCanvasProps>(({
  tasks,
  onTaskReorder,
  onToggleTaskDone,
  onTaskPress,
  selectedIds = [],
  isSelecting = false,
  onLongPressSelect,
  currentTab,
  canvasHeight,
  isInsideFolder = false,
}) => {
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  
  // Get exact font size context like TaskItem
  const { fontSizeKey } = useContext(FontSizeContext);
  const baseFontSize = appFontSizes["normal"]; // 16 like TaskItem
  
  // Load fonts with EXACT TaskItem specifications
  const titleFont = useFont(require('../assets/fonts/NotoSansJP-Regular.ttf'), baseFontSize + 0.5); // 16.5px - taskTitle
  const deadlineFont = useFont(require('../assets/fonts/NotoSansJP-Regular.ttf'), baseFontSize - 2); // 14px - taskDeadlineDisplayTextBase
  
  // Memoized canvas dimensions (match TaskItem full width)
  const { canvasWidth, screenWidth } = useMemo(() => {
    const width = Dimensions.get('window').width;
    return {
      screenWidth: width,
      canvasWidth: width, // Full width like TaskItem
    };
  }, []);

  // Validate and sanitize tasks
  const safeTasks = useMemo(() => {
    if (!Array.isArray(tasks)) {
      if (__DEV__) {
        console.warn('SkiaTaskCanvas: tasks prop is not an array');
      }
      return [];
    }
    return tasks.filter(task => task && typeof task === 'object' && task.keyId);
  }, [tasks]);
  
  // Early return if no valid tasks
  if (safeTasks.length === 0) {
    return <View style={{ height: canvasHeight, width: '100%' }} />;
  }
  
  // Optimized drag state management
  const [dragState, setDragState] = useState({
    isDragging: false,
    dragIndex: -1,
    targetIndex: -1,
    dragY: 0,
    isLongPressed: false,
  });

  // Memoized task positions with error handling
  const taskPositions = useMemo(() => {
    try {
      return safeTasks.map((_, index) => index * ITEM_HEIGHT);
    } catch (error) {
      if (__DEV__) {
        console.error('SkiaTaskCanvas: Error calculating task positions', error);
      }
      return [];
    }
  }, [safeTasks.length]);

  // Update positions callback (without console.log)
  const updateTaskPosition = useCallback((index: number, newY: number) => {
    if (index < 0 || index >= safeTasks.length) {
      if (__DEV__) {
        console.warn('SkiaTaskCanvas: Invalid task index', index);
      }
      return taskPositions[index] || 0;
    }
    return newY;
  }, [safeTasks.length, taskPositions]);

  // Optimized gesture handler with clean state management
  const handleDragStateChange = useCallback((isDragging: boolean, dragIndex: number, isLongPressed?: boolean) => {
    setDragState(prevState => ({
      ...prevState,
      isDragging,
      dragIndex,
      targetIndex: isDragging ? prevState.targetIndex : -1,
      dragY: isDragging ? prevState.dragY : 0,
      isLongPressed: isLongPressed || false,
    }));
  }, []);

  const handleDragUpdate = useCallback((y: number, targetIdx: number) => {
    setDragState(prevState => {
      const newState = {
        ...prevState,
        dragY: y,
        targetIndex: targetIdx,
      };
      
      // Calculate animated positions for other tasks
      if (prevState.dragIndex >= 0 && targetIdx >= 0) {
        // Smooth position calculation with gradual transitions
        const updatedPositions = safeTasks.map((_, originalIndex) => {
          if (originalIndex === prevState.dragIndex) {
            return y; // Dragged task follows finger
          }
          
          let adjustedIndex = originalIndex;
          let transitionProgress = 1; // Full transition by default
          
          if (prevState.dragIndex < targetIdx) {
            // Dragging down - create smooth gap opening
            if (originalIndex > prevState.dragIndex && originalIndex <= targetIdx) {
              adjustedIndex = originalIndex - 1;
              // Add smooth transition based on drag proximity
              const dragPosition = y / ITEM_HEIGHT;
              const itemPosition = originalIndex;
              const distance = Math.abs(dragPosition - itemPosition);
              transitionProgress = Math.max(0, Math.min(1, 2 - distance)); // Smooth falloff
              // Apply easing for more natural motion
              transitionProgress = 1 - Math.pow(1 - transitionProgress, 3); // Ease-out cubic
            }
          } else if (prevState.dragIndex > targetIdx) {
            // Dragging up - create smooth gap opening
            if (originalIndex >= targetIdx && originalIndex < prevState.dragIndex) {
              adjustedIndex = originalIndex + 1;
              // Add smooth transition based on drag proximity
              const dragPosition = y / ITEM_HEIGHT;
              const itemPosition = originalIndex;
              const distance = Math.abs(dragPosition - itemPosition);
              transitionProgress = Math.max(0, Math.min(1, 2 - distance)); // Smooth falloff
              // Apply easing for more natural motion
              transitionProgress = 1 - Math.pow(1 - transitionProgress, 3); // Ease-out cubic
            }
          }
          
          // Smooth interpolation between original and target positions
          const originalY = originalIndex * ITEM_HEIGHT;
          const targetY = adjustedIndex * ITEM_HEIGHT;
          return originalY + (targetY - originalY) * transitionProgress;
        });
      }
      
      return newState;
    });
  }, [safeTasks]);

  const gestureHandler = useAdvancedGestureHandler({
    tasks: safeTasks,
    onTaskReorder,
    onToggleTaskDone,
    onTaskPress,
    onLongPressSelect,
    isSelecting,
    canvasHeight,
    onDragStateChange: handleDragStateChange,
    onDragUpdate: handleDragUpdate,
  });

  // Memoized color scheme with EXACT TaskItem colors
  const colors = useMemo<ColorScheme>(() => ({
    background: isDark ? '#1f1f21' : '#FFFFFF', // cardBackground from TaskItem
    text: isDark ? '#FFFFFF' : '#111111', // EXACT taskTitle color from TaskItem styles
    textSecondary: isDark ? '#AEAEB2' : '#6D6D72', // EXACT secondaryText from TaskItem styles
    border: isDark ? '#38383A' : '#E5E5EA',
    selected: isDark ? '#0A84FF20' : '#007AFF20',
    accent: subColor, // EXACT subColor like TaskItem checkbox
    checkbox: isDark ? '#48484A' : '#C7C7CC',
    checkboxBorder: isDark ? '#6D6D72' : '#C7C7CC',
  }), [isDark, subColor]);

  // Calculate dynamic task positions based on drag state
  const getTaskPosition = useCallback((index: number): number => {
    if (!dragState.isDragging || dragState.dragIndex === -1) {
      return taskPositions[index] || index * ITEM_HEIGHT;
    }
    
    if (index === dragState.dragIndex) {
      return dragState.dragY;
    }
    
    // Calculate adjusted position for other tasks
    let adjustedIndex = index;
    
    if (dragState.dragIndex < dragState.targetIndex) {
      if (index > dragState.dragIndex && index <= dragState.targetIndex) {
        adjustedIndex = index - 1;
      }
    } else if (dragState.dragIndex > dragState.targetIndex) {
      if (index >= dragState.targetIndex && index < dragState.dragIndex) {
        adjustedIndex = index + 1;
      }
    }
    
    return adjustedIndex * ITEM_HEIGHT;
  }, [dragState, taskPositions]);

  // Optimized rendering with error boundary
  try {
    return (
      <View style={{ height: canvasHeight, width: '100%', overflow: 'hidden' }}>
        <GestureDetector gesture={gestureHandler.gesture}>
          <Canvas 
            style={{ 
              flex: 1, 
              width: '100%', 
              height: canvasHeight
            }}
          >
            {/* Canvas background - transparent to show folder background */}
            <Rect 
              rect={rect(0, 0, canvasWidth, canvasHeight)} 
              color={'transparent'}
            />
            
            {/* Render all tasks with proper Z-order (dragged task on top) */}
            {safeTasks.map((task, index) => {
              const isBeingDragged = dragState.isDragging && dragState.dragIndex === index;
              const isDraggedOver = dragState.isDragging && dragState.targetIndex === index && !isBeingDragged;
              const isLongPressed = dragState.isLongPressed && dragState.dragIndex === index;
              
              // Skip dragged task in first pass - will render it last
              if (isBeingDragged) return null;
              
              return (
                <SkiaTask
                  key={task.keyId}
                  task={task}
                  index={index}
                  isSelected={selectedIds.includes(task.keyId)}
                  isBeingDragged={false}
                  isDraggedOver={isDraggedOver}
                  isLongPressed={isLongPressed}
                  y={getTaskPosition(index)}
                  canvasWidth={canvasWidth}
                  colors={colors}
                  currentTab={currentTab}
                  font={titleFont}
                  deadlineFont={deadlineFont}
                  isInsideFolder={isInsideFolder}
                />
              );
            })}
            
            {/* Render dragged task last (on top of all others) */}
            {dragState.isDragging && dragState.dragIndex >= 0 && dragState.dragIndex < safeTasks.length && (
              <SkiaTask
                key={`dragged-${safeTasks[dragState.dragIndex].keyId}`}
                task={safeTasks[dragState.dragIndex]}
                index={dragState.dragIndex}
                isSelected={selectedIds.includes(safeTasks[dragState.dragIndex].keyId)}
                isBeingDragged={true}
                isDraggedOver={false}
                isLongPressed={dragState.isLongPressed && dragState.dragIndex === dragState.dragIndex}
                y={getTaskPosition(dragState.dragIndex)}
                canvasWidth={canvasWidth}
                colors={colors}
                currentTab={currentTab}
                font={titleFont}
                deadlineFont={deadlineFont}
                isInsideFolder={isInsideFolder}
              />
            )}
          </Canvas>
        </GestureDetector>
      </View>
    );
  } catch (error) {
    if (__DEV__) {
      console.error('SkiaTaskCanvas: Rendering error', error);
    }
    
    // Fallback UI
    return (
      <View style={{ height: canvasHeight, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>
          レンダリングエラーが発生しました
        </Text>
      </View>
    );
  }
});

// Display name for debugging
SkiaTaskCanvas.displayName = 'SkiaTaskCanvas';