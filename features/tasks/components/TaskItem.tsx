// app/features/tasks/components/TaskItem.tsx
import React, { useContext, useMemo, memo, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useRouter } from 'expo-router';

import { DisplayableTaskItem } from '../types';
import { DRAG_CONFIG } from '@/components/SkiaTaskCanvas/constants';
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

  // 軽量化：リアルタイム更新を削除し、静的表示のみ
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

  // 軽量化：完了判定を単純化
  const isCurrentDisplayInstanceDone = useMemo(() => {
    if (task.isCompletedInstance || currentTab === 'completed') return true;
    if (task.deadlineDetails?.repeatFrequency && effectiveDueDateUtc) {
      const instanceDateStr = effectiveDueDateUtc.format('YYYY-MM-DD');
      return task.completedInstanceDates?.includes(instanceDateStr) ?? false;
    }
    return !!task.completedAt;
  }, [task.isCompletedInstance, currentTab, task.deadlineDetails?.repeatFrequency, effectiveDueDateUtc, task.completedInstanceDates, task.completedAt]);

  // 軽量化：テキスト計算をメモ化
  const deadlineDisplay = useMemo(() => {
    const rawText = task.isCompletedInstance
      ? t('task_list.completed_on_date_time', { date: dayjs.utc(task.instanceDate).local().locale(i18n.language).format(t('common.date_time_format_short', "M/D H:mm"))})
      : getTimeText(task, t, effectiveDueDateUtc, displayStartDateUtc);
    
    const color = task.isCompletedInstance
      ? (isDark ? '#8E8E93' : '#6D6D72')
      : getTimeColor(task, isDark, effectiveDueDateUtc, displayStartDateUtc);
    
    const text = rawText.startsWith('🔁') ? rawText.substring(1) : rawText;
    const showRepeatIcon = !!(task.deadlineDetails?.repeatFrequency && !task.isCompletedInstance && currentTab === 'incomplete' && !isCurrentDisplayInstanceDone);
    
    return { text, color, showRepeatIcon };
  }, [task, t, i18n.language, effectiveDueDateUtc, displayStartDateUtc, isDark, currentTab, isCurrentDisplayInstanceDone]);

  // 軽量化：スタイル計算を最小化
  const styles = useMemo(() => createStyles(isDark, '', fontSizeKey), [isDark, fontSizeKey]);
  const textStyle = useMemo(() => [
    styles.taskDeadlineDisplayTextBase, 
    { color: deadlineDisplay.color }
  ], [styles.taskDeadlineDisplayTextBase, deadlineDisplay.color]);

  return (
    <View style={{alignItems: 'flex-end', justifyContent: 'center', minHeight: 30 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
          {deadlineDisplay.showRepeatIcon && (
            <Ionicons
              name="repeat"
              size={fontSizes[fontSizeKey] * 0.9}
              color={deadlineDisplay.color}
              style={{ marginRight: 3 }}
            />
          )}
          <Text style={textStyle} numberOfLines={1} ellipsizeMode="tail">
            {deadlineDisplay.text}
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

const TaskMainContent = memo(({ task, styles }: { task: DisplayableTaskItem; styles: any }) => (
  <View style={styles.taskCenter}>
    <Text style={styles.taskTitle} numberOfLines={2} ellipsizeMode="tail">
      {task.title}
    </Text>
  </View>
));

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
  drag?: () => void; // react-native-draggable-flatlist drag function
  isActive?: boolean; // react-native-draggable-flatlist active state
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
  drag,
  isActive = false,
}: Props) => {
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  
  const { fontSizeKey } = useContext(FontSizeContext);
  const router = useRouter();

  // 軽量化：メモ化とスタイル計算を最小化
  const isSelected = useMemo(() => selectedIds.includes(task.keyId), [selectedIds, task.keyId]);
  const styles = useMemo(() => createStyles(isDark, subColor, fontSizeKey), [isDark, subColor, fontSizeKey]);

  const effectiveDueDateUtc = useMemo(() => {
    if (task.isCompletedInstance && task.instanceDate) {
        return dayjs.utc(task.instanceDate);
    }
    return task.displaySortDate || calculateActualDueDate(task);
  }, [task.isCompletedInstance, task.instanceDate, task.displaySortDate, task.deadline, task.deadlineDetails]);
  
  const isCurrentDisplayInstanceDone = useMemo(() => {
    if (task.isCompletedInstance || currentTab === 'completed') return true;
    if (task.deadlineDetails?.repeatFrequency && effectiveDueDateUtc) {
      const instanceDateStr = effectiveDueDateUtc.format('YYYY-MM-DD');
      return task.completedInstanceDates?.includes(instanceDateStr) ?? false;
    }
    return !!task.completedAt;
  }, [task.isCompletedInstance, currentTab, task.deadlineDetails?.repeatFrequency, effectiveDueDateUtc, task.completedInstanceDates, task.completedAt]);

  const handleToggle = useCallback(() => {
    if (task.isCompletedInstance && task.instanceDate) onToggle(task.id, task.instanceDate);
    else if (currentTab === 'completed' && !task.isCompletedInstance) onToggle(task.id);
    else if (task.deadlineDetails?.repeatFrequency && effectiveDueDateUtc) onToggle(task.id, effectiveDueDateUtc.format('YYYY-MM-DD'));
    else onToggle(task.id);
  }, [task.isCompletedInstance, task.instanceDate, task.id, currentTab, task.deadlineDetails?.repeatFrequency, effectiveDueDateUtc, onToggle]);

  const handlePress = useCallback(() => {
    if (isSelecting) {
      onLongPressSelect(task.keyId);
    } else if (!task.isCompletedInstance) {
      router.push(`/task-detail/${task.id}`);
    }
  }, [isSelecting, onLongPressSelect, task.keyId, task.isCompletedInstance, task.id, router]);

  const handleLongPress = useCallback(() => {
    if (isSelecting) {
      onLongPressSelect(task.keyId);
    }
  }, [isSelecting, onLongPressSelect, task.keyId]);

  const itemContainerStyle = useMemo(() => [
    styles.taskItemContainer,
    isInsideFolder && styles.taskInsideFolder,
    isSelected && styles.taskItemSelected,
    task.isCompletedInstance && isLastItem && { borderBottomWidth: 0 },
    isActive && { opacity: 0.8, transform: [{ scale: 1.02 }] }, // Active drag state styling
  ], [styles, isInsideFolder, isSelected, task.isCompletedInstance, isLastItem, isActive]);

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

  // For draggable items, let react-native-draggable-flatlist handle all gestures
  if (isDraggable && !isSelecting) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={drag} // Use the library's drag function directly
        delayLongPress={DRAG_CONFIG.LONG_PRESS_DURATION} // Unified timing from constants
        style={itemContainerStyle}
        activeOpacity={0.7}
      >
        {taskContent}
      </TouchableOpacity>
    );
  }

  // For non-draggable items or selection mode
  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={DRAG_CONFIG.LONG_PRESS_DURATION}
      style={itemContainerStyle}
      activeOpacity={0.7}
    >
      {taskContent}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // カスタム比較関数でパフォーマンス最適化
  return (
    prevProps.task.keyId === nextProps.task.keyId &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.completedAt === nextProps.task.completedAt &&
    prevProps.isSelecting === nextProps.isSelecting &&
    prevProps.selectedIds.length === nextProps.selectedIds.length &&
    prevProps.currentTab === nextProps.currentTab &&
    prevProps.isDraggable === nextProps.isDraggable &&
    prevProps.isActive === nextProps.isActive &&
    JSON.stringify(prevProps.task.deadlineDetails) === JSON.stringify(nextProps.task.deadlineDetails)
  );
});