// app/features/tasks/components/TaskItem.tsx
import React, { useContext, useMemo, memo, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextStyle, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useRouter } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedGestureHandler, 
  withSpring, 
  withTiming,
  withDelay,
  runOnJS,
  interpolate
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

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
  onDragStart?: (id: string) => void;
  onDragActive?: (id: string, translationY: number) => void;
  onDragEnd?: (id: string, newIndex: number) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  currentIndex?: number;
  totalItems?: number;
  isDragging?: boolean;
  shouldMoveUp?: boolean;
  shouldMoveDown?: boolean;
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
  onDragStart,
  onDragActive,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  currentIndex = 0,
  totalItems = 1,
  isDragging = false,
  shouldMoveUp = false,
  shouldMoveDown = false,
}: Props) => {
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const { fontSizeKey } = useContext(FontSizeContext);
  const styles = createStyles(isDark, subColor, fontSizeKey);
  const router = useRouter();

  // シンプルなドラッグアニメーション用の値
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const elevation = useSharedValue(0);
  
  // 他のタスクの位置調整用の値
  const offsetY = useSharedValue(0);
  
  // 長押し検出用
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isDragEnabled = useSharedValue(false);
  const gestureStartTime = useSharedValue(0);
  
  // ハプティックフィードバック関数
  const triggerHaptic = () => {
    try {
      Vibration.vibrate(30); // 軽い振動（30ms）
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  };
  
  // フォルダ内での控えめな移動（枠を拡張させない）
  useEffect(() => {
    if (shouldMoveUp) {
      // Google Todo風の微細な移動
      offsetY.value = withSpring(-8, { damping: 20, stiffness: 400 });
    } else if (shouldMoveDown) {
      // Google Todo風の微細な移動
      offsetY.value = withSpring(8, { damping: 20, stiffness: 400 });
    } else {
      // 元の位置に戻る
      offsetY.value = withSpring(0, { damping: 20, stiffness: 400 });
    }
  }, [shouldMoveUp, shouldMoveDown, offsetY]);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (event) => {
      gestureStartTime.value = Date.now();
      isDragEnabled.value = false;
    },
    onActive: (event) => {
      const currentTime = Date.now();
      const timeSinceStart = currentTime - gestureStartTime.value;
      
      // 長押し閾値（500ms）を超えた場合のみドラッグを有効化
      if (timeSinceStart >= 500 && !isDragEnabled.value && isDraggable) {
        isDragEnabled.value = true;
        
        if (onDragStart) {
          // Google Todo風のドラッグエフェクト
          scale.value = withSpring(1.02, { damping: 15, stiffness: 300 });
          elevation.value = withTiming(4, { duration: 150 });
          opacity.value = withTiming(0.95, { duration: 150 });
          runOnJS(triggerHaptic)();
          runOnJS(onDragStart)(task.keyId);
        }
      }
      
      // ドラッグが有効化されている場合のみ移動を追従
      if (isDragEnabled.value && isDraggable) {
        translateY.value = event.translationY;
        
        if (onDragActive) {
          runOnJS(onDragActive)(task.keyId, event.translationY);
        }
      }
    },
    onEnd: (event) => {
      if (isDragEnabled.value && isDraggable && onDragEnd) {
        // 標準的なドラッグ終了計算
        const itemHeight = 70;
        const movement = event.translationY;
        
        // シンプルなインデックス計算
        const indexOffset = Math.round(movement / itemHeight);
        let newIndex = currentIndex + indexOffset;
        newIndex = Math.max(0, Math.min(totalItems - 1, newIndex));
        
        console.log('Drag calculation:', { 
          movement, 
          currentIndex, 
          newIndex, 
          itemHeight, 
          totalItems 
        });
        
        // 位置が変更された場合のみハプティックフィードバック
        if (newIndex !== currentIndex) {
          runOnJS(triggerHaptic)();
        }
        
        // データ更新を実行
        runOnJS(onDragEnd)(task.keyId, newIndex);
      }
      
      // 常にアニメーションリセット
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      elevation.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(1, { duration: 200 });
      
      // フラグをリセット
      isDragEnabled.value = false;
      gestureStartTime.value = 0;
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateY: isDragging ? translateY.value : offsetY.value },
        { scale: scale.value }
      ] as any,
      opacity: isDragging ? opacity.value : 1.0,
      elevation: elevation.value,
      shadowOpacity: interpolate(elevation.value, [0, 10], [0, 0.4]),
      shadowRadius: interpolate(elevation.value, [0, 10], [0, 12]),
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: interpolate(elevation.value, [0, 10], [0, 6])
      },
      zIndex: isDragging ? 1000 : (offsetY.value !== 0 ? 100 : 0),
    };
  });

  // Google Todo風のドロップインジケーター
  const dropZoneStyle = useAnimatedStyle(() => {
    'worklet';
    const showDropZone = shouldMoveUp || shouldMoveDown;
    return {
      height: showDropZone ? withSpring(2, { damping: 20, stiffness: 400 }) : withSpring(0, { damping: 20, stiffness: 400 }),
      opacity: showDropZone ? withSpring(0.8, { damping: 20, stiffness: 400 }) : withSpring(0, { damping: 20, stiffness: 400 }),
      backgroundColor: showDropZone ? '#1A73E8' : 'transparent',
      marginHorizontal: showDropZone ? 16 : 0,
      borderRadius: 1,
    };
  });

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
    else if (!task.isCompletedInstance) router.push(`/task-detail/${task.id}`);
  };

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

  if (isDraggable) {
    return (
      <>
        {/* コンパクトなドロップインジケーター */}
        <Animated.View 
          style={[
            dropZoneStyle,
            {
              backgroundColor: isDark ? 'rgba(0, 122, 255, 0.4)' : 'rgba(0, 122, 255, 0.4)',
              borderRadius: 3,
              marginHorizontal: 20,
            }
          ]} 
        />
        
        <Animated.View style={[animatedStyle]}>
          <PanGestureHandler 
            onGestureEvent={gestureHandler}
            activeOffsetY={[-5, 5]}
            failOffsetX={[-20, 20]}
            shouldCancelWhenOutside={false}
            enableTrackpadTwoFingerGesture={false}
            minPointers={1}
            minDist={0}
          >
            <Animated.View>
              <TouchableOpacity
                onPress={handlePress}
                style={itemContainerStyle}
                disabled={isSelecting ? false : task.isCompletedInstance}
              >
                {taskContent}
              </TouchableOpacity>
            </Animated.View>
          </PanGestureHandler>
        </Animated.View>
      </>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={() => onLongPressSelect(task.keyId)}
      delayLongPress={200}
      style={itemContainerStyle}
      disabled={isSelecting ? false : task.isCompletedInstance}
    >
      {taskContent}
    </TouchableOpacity>
  );
});