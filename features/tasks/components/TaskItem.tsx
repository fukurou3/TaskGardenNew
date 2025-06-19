// app/features/tasks/components/TaskItem.tsx
import React, { useContext, useMemo, memo, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextStyle, Vibration } from 'react-native';
import { Gesture, GestureDetector, PanGesture } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useRouter } from 'expo-router';

import { DisplayableTaskItem } from '../types';
import { createStyles } from '../styles';
import { useAppTheme } from '@/hooks/ThemeContext';
import { useTranslation } from 'react-i18next';
import { FontSizeContext } from '@/context/FontSizeContext';
import { getTimeColor, getTimeText, calculateActualDueDate } from '../utils';
import { fontSizes } from '@/constants/fontSizes';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

type TaskDeadlineProps = {
  task: DisplayableTaskItem;
  isDark: boolean;
  fontSizeKey: keyof typeof fontSizes;
  currentTab: 'incomplete' | 'completed';
};

const TaskDeadline = memo(({ task, isDark, fontSizeKey, currentTab }: TaskDeadlineProps) => {
  const { t, i18n } = useTranslation();
  const [, setTick] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (task.isCompletedInstance) return;

    const calculateNextIntervalMs = (): number => {
      const dateToMonitorLocal = (displayStartDateUtc?.isAfter(dayjs().utc())
          ? displayStartDateUtc.local()
          : effectiveDueDateUtc?.local());
      if (!dateToMonitorLocal) return 60000 * 5;
      const diffMinutesTotal = dateToMonitorLocal.diff(dayjs(), 'minute');
      if (diffMinutesTotal <= 1) return 5000;
      if (diffMinutesTotal <= 5) return 10000;
      if (diffMinutesTotal <= 60) return 30000;
      return 60000;
    };

    const tick = () => {
      setTick(prev => prev + 1);
      timeoutRef.current = setTimeout(tick, calculateNextIntervalMs());
    };
    timeoutRef.current = setTimeout(tick, calculateNextIntervalMs());
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [task.isCompletedInstance, task.id, effectiveDueDateUtc, displayStartDateUtc]);

  let isCurrentDisplayInstanceDone = false;
  if (task.isCompletedInstance) isCurrentDisplayInstanceDone = true;
  else if (currentTab === 'completed') isCurrentDisplayInstanceDone = true;
  else if (task.deadlineDetails?.repeatFrequency && effectiveDueDateUtc) {
    const instanceDateStr = effectiveDueDateUtc.format('YYYY-MM-DD');
    isCurrentDisplayInstanceDone = task.completedInstanceDates?.includes(instanceDateStr) ?? false;
  } else if (!task.deadlineDetails?.repeatFrequency) {
    isCurrentDisplayInstanceDone = !!task.completedAt;
  }

  const rawDeadlineText = task.isCompletedInstance
    ? t('task_list.completed_on_date_time', { date: dayjs.utc(task.instanceDate).local().locale(i18n.language).format(t('common.date_time_format_short', "M/D H:mm"))})
    : getTimeText(task, t, effectiveDueDateUtc, displayStartDateUtc);

  const determinedTimeColor = task.isCompletedInstance
    ? (isDark ? '#8E8E93' : '#6D6D72')
    : getTimeColor(task, isDark, effectiveDueDateUtc, displayStartDateUtc);

  const isRepeatingTaskIconVisible = !!(task.deadlineDetails?.repeatFrequency && !task.isCompletedInstance && currentTab === 'incomplete' && !isCurrentDisplayInstanceDone);
  let deadlineTextForDisplay = rawDeadlineText.startsWith('🔁') ? rawDeadlineText.substring(1) : rawDeadlineText;

  const styles = createStyles(isDark, '', fontSizeKey);
  const topTextStyleArray: TextStyle[] = [styles.taskDeadlineDisplayTextBase, { color: determinedTimeColor }];
  if (deadlineTextForDisplay === t('task_list.no_deadline') && styles.noDeadlineText) {
    const { color, fontWeight, ...noDeadlineOtherStyles } = styles.noDeadlineText as TextStyle;
    topTextStyleArray.push(noDeadlineOtherStyles);
  }

  return (
    <View style={{alignItems: 'flex-end', justifyContent: 'center', minHeight: 30 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
          {isRepeatingTaskIconVisible && (
            <Ionicons
              name="repeat"
              size={fontSizes[fontSizeKey] * 0.9}
              color={determinedTimeColor}
              style={{ marginRight: 3 }}
            />
          )}
          <Text style={StyleSheet.flatten(topTextStyleArray)} numberOfLines={1} ellipsizeMode="tail">
            {deadlineTextForDisplay}
          </Text>
        </View>
    </View>
  );
});

const TaskCheckbox = memo(({ isDone, onToggle, subColor, styles }: { isDone: boolean; onToggle: () => void; subColor: string; styles: any }) => (
  <TouchableOpacity onPress={onToggle} style={styles.checkboxContainer}>
    <Ionicons name={isDone ? 'checkbox' : 'square-outline'} size={24} color={subColor} />
  </TouchableOpacity>
));

const TaskMainContent = memo(({ task, isDark, fontSizeKey, styles }: { task: DisplayableTaskItem; isDark: boolean; fontSizeKey: keyof typeof fontSizes; styles: any }) => {
  const displayStartDateUtc = useMemo(() => {
    if (!task.isCompletedInstance && (task.deadlineDetails as any)?.isPeriodSettingEnabled && (task.deadlineDetails as any).periodStartDate) {
      let startDate = dayjs.utc((task.deadlineDetails as any).periodStartDate);
      if ((task.deadlineDetails as any).periodStartTime) {
        startDate = startDate.hour((task.deadlineDetails as any).periodStartTime.hour).minute((task.deadlineDetails as any).periodStartTime.minute);
      } else {
        startDate = startDate.startOf('day');
      }
      return startDate;
    }
    return null;
  }, [task.isCompletedInstance, task.deadlineDetails]);

  return (
    <View style={styles.taskCenter}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {!task.isCompletedInstance && (task.deadlineDetails as any)?.isPeriodSettingEnabled && (task.deadlineDetails as any).periodStartDate && !((task.deadlineDetails as any)?.isPeriodSettingEnabled && displayStartDateUtc && displayStartDateUtc.local().isAfter(dayjs())) && (
          <Ionicons name="calendar-outline" size={fontSizes[fontSizeKey]} color={isDark ? '#999' : '#777'} style={{ marginRight: 4 }} />
        )}
         {!(task.isCompletedInstance) && (task.deadlineDetails as any)?.isPeriodSettingEnabled && displayStartDateUtc && displayStartDateUtc.local().isAfter(dayjs()) && (
          <Ionicons name="time-outline" size={fontSizes[fontSizeKey]} color={isDark ? '#999' : '#777'} style={{ marginRight: 4 }} />
        )}
        <Text style={styles.taskTitle} numberOfLines={1}>
          {task.title}
        </Text>
      </View>
    </View>
  );
});

const TaskSelectionIndicator = memo(({ isSelected, subColor, styles }: { isSelected: boolean; subColor: string; styles: any }) => (
  <View style={styles.selectionIconContainer}>
    <Ionicons name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={subColor} />
  </View>
));

type Props = {
  task: DisplayableTaskItem;
  onToggle: (id: string, instanceDate?: string) => void;
  isSelecting: boolean;
  selectedIds: string[];
  onLongPressSelect: (id: string) => void;
  currentTab: 'incomplete' | 'completed';
  isInsideFolder?: boolean;
  isLastItem?: boolean;
  isDraggable?: boolean;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onDragStart?: (index: number) => boolean;
  onDragUpdate?: (offsetY: number) => void;
  onDragEnd?: () => void;
  onDragCancel?: () => void;
  index?: number;
  totalItems?: number;
  // SharedValue-based animation props
  draggedItemAnimatedStyle?: any;
  itemOffsetAnimatedStyle?: any;
  placeholderAnimatedStyle?: any;
  isDragging?: SharedValue<boolean>;
  dragIndex?: SharedValue<number>;
  placeholderPosition?: 'above' | 'below' | null;
};

export const TaskItem = memo(({
  task,
  onToggle,
  isSelecting,
  selectedIds,
  onLongPressSelect,
  currentTab,
  isInsideFolder,
  isLastItem,
  isDraggable = false,
  onReorder,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  onDragCancel,
  index = 0,
  totalItems = 1,
  draggedItemAnimatedStyle,
  itemOffsetAnimatedStyle,
  placeholderAnimatedStyle,
  isDragging,
  dragIndex,
  placeholderPosition = null,
}: Props) => {
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  
  const { fontSizeKey } = useContext(FontSizeContext);
  const styles = createStyles(isDark, subColor, fontSizeKey);
  const router = useRouter();

  // Gesture state management
  const [isLongPressActive, setIsLongPressActive] = useState(false);
  const startPositionRef = useRef({ x: 0, y: 0 });
  const dragStartedRef = useRef(false);
  
  // Enhanced haptic feedback
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      const intensity = type === 'light' ? 30 : type === 'medium' ? 50 : 100;
      Vibration.vibrate(intensity);
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }, []);

  // Gesture handling replaced with simple TouchableOpacity long press
  // Complex gesture detection removed due to Reanimated stability issues

  // Determine if this item is being dragged
  const isBeingDragged = useMemo(() => {
    return isDragging?.value && dragIndex?.value === index;
  }, [isDragging, dragIndex, index]);

  // Enhanced animated styles with gesture handling
  const enhancedGestureAnimatedStyle = useAnimatedStyle(() => {
    if (!isDragging || !dragIndex) return {};
    
    const isCurrentlyDragged = isDragging.value && dragIndex.value === index;
    const scale = isCurrentlyDragged ? 1.05 : 1;
    const opacity = isCurrentlyDragged ? 0.9 : 1;
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Combined animated styles
  const combinedAnimatedStyle = useMemo(() => {
    const styles = [enhancedGestureAnimatedStyle];
    
    // Add drag-specific styles if being dragged
    if (isBeingDragged && draggedItemAnimatedStyle) {
      styles.push(draggedItemAnimatedStyle);
    }
    
    // Add offset styles for other items
    if (!isBeingDragged && itemOffsetAnimatedStyle) {
      styles.push(itemOffsetAnimatedStyle);
    }
    
    return styles;
  }, [enhancedGestureAnimatedStyle, isBeingDragged, draggedItemAnimatedStyle, itemOffsetAnimatedStyle]);

  const effectiveDueDateUtc = useMemo(() => {
    if (task.isCompletedInstance && task.instanceDate) {
        return dayjs.utc(task.instanceDate);
    }
    return task.displaySortDate || calculateActualDueDate(task);
  }, [task.isCompletedInstance, task.instanceDate, task.displaySortDate, task.deadline, task.deadlineDetails]);
  
  const isCurrentDisplayInstanceDone = useMemo(() => {
    if (task.isCompletedInstance) return true;
    if (currentTab === 'completed') return true;
    if (task.deadlineDetails?.repeatFrequency && effectiveDueDateUtc) {
      const instanceDateStr = effectiveDueDateUtc.format('YYYY-MM-DD');
      return task.completedInstanceDates?.includes(instanceDateStr) ?? false;
    }
    if (!task.deadlineDetails?.repeatFrequency) {
      return !!task.completedAt;
    }
    return false;
  }, [task, currentTab, effectiveDueDateUtc]);

  const handleToggle = () => {
    if (task.isCompletedInstance && task.instanceDate) onToggle(task.id, task.instanceDate);
    else if (currentTab === 'completed' && !task.isCompletedInstance) onToggle(task.id);
    else if (task.deadlineDetails?.repeatFrequency && effectiveDueDateUtc) onToggle(task.id, effectiveDueDateUtc.format('YYYY-MM-DD'));
    else onToggle(task.id);
  };

  const handlePress = () => {
    if (isSelecting) onLongPressSelect(task.keyId);
    else if (isBeingDragged || isLongPressActive) return; // ドラッグ中は詳細画面に遷移しない
    else if (!task.isCompletedInstance) router.push(`/task-detail/${task.id}`);
  };

  // Enhanced gesture for drag and drop
  const panGesture = useMemo(() => {
    if (!isDraggable || isSelecting) return null;
    
    return Gesture.Pan()
      .minDistance(10)
      .onStart(() => {
        if (onDragStart) {
          runOnJS(onDragStart)(index);
        }
      })
      .onUpdate((event) => {
        if (onDragUpdate) {
          runOnJS(onDragUpdate)(event.translationY);
        }
      })
      .onEnd(() => {
        if (onDragEnd) {
          runOnJS(onDragEnd)();
        }
      })
      .onFinalize(() => {
        if (onDragCancel) {
          runOnJS(onDragCancel)();
        }
      });
  }, [isDraggable, isSelecting, onDragStart, onDragUpdate, onDragEnd, onDragCancel, index]);


  const isSelected = selectedIds.includes(task.keyId);
  const baseStyle = isInsideFolder ? styles.folderTaskItemContainer : styles.taskItemContainer;
  const itemContainerStyle = StyleSheet.flatten([
    baseStyle,
    (isInsideFolder && isLastItem && !task.isCompletedInstance) && { borderBottomWidth: 0 },
    task.isCompletedInstance && isLastItem && { borderBottomWidth: 0 }
  ]);

  const taskContent = (
    <View style={styles.taskItem}>
      {!isSelecting && (
        <TaskCheckbox
          isDone={isCurrentDisplayInstanceDone}
          onToggle={handleToggle}
          subColor={subColor}
          styles={styles}
        />
      )}
      <TaskMainContent
        task={task}
        isDark={isDark}
        fontSizeKey={fontSizeKey}
        styles={styles}
      />
      <TaskDeadline
        task={task}
        isDark={isDark}
        fontSizeKey={fontSizeKey}
        currentTab={currentTab}
      />
      {isSelecting && (
        <TaskSelectionIndicator
          isSelected={isSelected}
          subColor={subColor}
          styles={styles}
        />
      )}
    </View>
  );

  const handleLongPress = () => {
    // 選択モードの時のみ長押し処理
    if (isSelecting) {
      onLongPressSelect(task.keyId);
    }
  };

  // Enhanced drag-and-drop interface with gesture handling
  if (isDraggable && !isSelecting) {
    const DraggableItem = () => (
      <Animated.View
        style={[
          itemContainerStyle,
          combinedAnimatedStyle,
          isBeingDragged && {
            backgroundColor: isDark ? 'rgba(28, 28, 30, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            marginHorizontal: 8,
            borderRadius: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }
        ]}
      >
        <TouchableOpacity
          onPress={handlePress}
          style={{ flex: 1 }}
          disabled={isBeingDragged}
          activeOpacity={0.7}
        >
          {taskContent}
        </TouchableOpacity>
      </Animated.View>
    );

    return (
      <View>
        {/* Top placeholder */}
        {placeholderPosition === 'above' && (
          <Animated.View 
            style={[
              {
                backgroundColor: isDark ? '#007AFF' : '#007AFF',
                marginHorizontal: 20,
                borderRadius: 2,
                marginVertical: 2,
              },
              placeholderAnimatedStyle
            ]}
          />
        )}
        
        {panGesture ? (
          <GestureDetector gesture={panGesture}>
            <DraggableItem />
          </GestureDetector>
        ) : (
          <TouchableOpacity
            onLongPress={() => {
              if (onDragStart) {
                onDragStart(index);
              }
            }}
            delayLongPress={500}
            style={{ flex: 1 }}
          >
            <DraggableItem />
          </TouchableOpacity>
        )}
        
        {/* Bottom placeholder */}
        {placeholderPosition === 'below' && (
          <Animated.View 
            style={[
              {
                backgroundColor: isDark ? '#007AFF' : '#007AFF',
                marginHorizontal: 20,
                borderRadius: 2,
                marginVertical: 2,
              },
              placeholderAnimatedStyle
            ]}
          />
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={isSelecting ? handleLongPress : undefined}
      delayLongPress={300}
      style={[itemContainerStyle]}
      disabled={task.isCompletedInstance && !isSelecting}
    >
      {taskContent}
    </TouchableOpacity>
  );
});