// app/(tabs)/draggable-test.tsx
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Pressable } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSharedValue, useAnimatedReaction, runOnJS, withSpring, withTiming, useDerivedValue } from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/ThemeContext';
import { useTranslation } from 'react-i18next';
import { TaskItem } from '@/features/tasks/components/TaskItem';
import { createStyles } from '@/features/tasks/styles';
import { FontSizeContext } from '@/context/FontSizeContext';
import { useContext } from 'react';

// Use real task operations
import TasksDatabase from '@/lib/TaskDatabase';
import type { DisplayableTaskItem, Task } from '@/features/tasks/types';
import { calculateNextDisplayInstanceDate, calculateActualDueDate } from '@/features/tasks/utils';
import dayjs from 'dayjs';

export default function DraggableTestScreen() {
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const router = useRouter();
  const { fontSizeKey } = useContext(FontSizeContext);
  
  // Real task state
  const [tasks, setTasks] = useState<DisplayableTaskItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [currentTab, setCurrentTab] = useState<'incomplete' | 'completed'>('incomplete');
  const [isLoading, setIsLoading] = useState(true);
  
  // Reorder mode state
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Reorder mode state - シンプルな状態管理に戻す
  const [pendingTasks, setPendingTasks] = useState<DisplayableTaskItem[]>([]);
  
  // Shared values for UI thread operations - 必要最小限に減らす
  const isDragging = useSharedValue(false);
  const draggedTaskId = useSharedValue<string | null>(null);

  // Load real tasks from database (using same method as useTasksScreenLogic)
  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const taskRows = await TasksDatabase.getAllTasks();
      
      if (taskRows) {
        // Parse JSON strings to Task objects (same as useTasksScreenLogic)
        const parsedTasks: Task[] = taskRows.map(t => JSON.parse(t));
        
        // Convert to DisplayableTaskItem format
        const displayableTasks: DisplayableTaskItem[] = parsedTasks
          .filter(task => {
            const isCompleted = !!task.completedAt;
            return currentTab === 'completed' ? isCompleted : !isCompleted;
          })
          .map((task, index) => {
            // Calculate display date for sorting
            const displaySortDate = calculateNextDisplayInstanceDate(task) || calculateActualDueDate(task);
            
            return {
              ...task,
              keyId: task.id,
              displayOrder: index,
              isCompletedInstance: !!task.completedAt,
              displaySortDate,
              instanceDate: task.completedAt ? dayjs(task.completedAt).format('YYYY-MM-DD') : undefined,
            };
          })
          // Sort by deadline (like period order)
          .sort((a, b) => {
            if (!a.displaySortDate && !b.displaySortDate) return 0;
            if (!a.displaySortDate) return 1;
            if (!b.displaySortDate) return -1;
            return dayjs(a.displaySortDate).diff(dayjs(b.displaySortDate));
          });
        
        setTasks(displayableTasks);
        console.log(`Loaded ${displayableTasks.length} tasks for ${currentTab} tab`);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentTab]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Real task operations
  const handleToggleTaskDone = useCallback(async (id: string, instanceDate?: string) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (task) {
        if (task.completedAt) {
          await TasksDatabase.markTaskIncomplete(id);
        } else {
          await TasksDatabase.markTaskComplete(id);
        }
        await loadTasks(); // Refresh after change
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  }, [tasks, loadTasks]);

  // シンプルな並び替え処理 - DraggableFlatListの標準動作に任せる
  const handleDragEnd = useCallback((data: DisplayableTaskItem[], from: number, to: number) => {
    if (from === to) return;
    
    console.log('🔄 並び替え実行:', from, '->', to);
    
    // シンプルに新しい順序で更新
    setPendingTasks(data);
    setHasChanges(true);
  }, []);
  
  
  // Confirm reorder and update database
  const handleConfirmReorder = useCallback(async () => {
    if (!hasChanges) {
      setIsReorderMode(false);
      return;
    }
    
    try {
      // Apply changes to main state (this triggers re-render)
      setTasks([...pendingTasks]);
      
      // Update database if method exists
      try {
        if (TasksDatabase.updateTaskOrder) {
          // Update all task orders
          for (let i = 0; i < pendingTasks.length; i++) {
            await TasksDatabase.updateTaskOrder(pendingTasks[i].id, i);
          }
        }
      } catch (dbError) {
        console.log('Task reorder in DB not supported, keeping local order');
      }
    } catch (error) {
      console.error('Failed to confirm reorder:', error);
      // Reload on error
      await loadTasks();
    } finally {
      setIsReorderMode(false);
      setHasChanges(false);
    }
  }, [hasChanges, pendingTasks, loadTasks]);
  
  // Cancel reorder mode
  const handleCancelReorder = useCallback(() => {
    setIsReorderMode(false);
    setPendingTasks([]);
    setHasChanges(false);
  }, []);

  const handleLongPressSelect = useCallback((id: string) => {
    console.log('🔥 handleLongPressSelect called with ID:', id);
    console.log('Current state - isReorderMode:', isReorderMode, 'isSelecting:', isSelecting);
    
    if (isReorderMode) {
      console.log('Already in reorder mode, doing nothing');
      return;
    }
    
    if (isSelecting) {
      console.log('In selecting mode, toggling selection');
      setSelectedIds(prev => 
        prev.includes(id) 
          ? prev.filter(selectedId => selectedId !== id)
          : [...prev, id]
      );
    } else {
      console.log('🎉 ENTERING REORDER MODE!');
      setIsReorderMode(true);
      setPendingTasks([...tasks]);
      setHasChanges(false);
    }
  }, [isSelecting, isReorderMode, tasks]);

  const handleTaskPress = useCallback((taskId: string) => {
    if (isReorderMode) {
      // Do nothing in reorder mode
      return;
    }
    
    if (isSelecting) {
      handleLongPressSelect(taskId);
    } else {
      router.push(`/task-detail/${taskId}`);
    }
  }, [isSelecting, isReorderMode, handleLongPressSelect, router]);

  // Styles
  const styles = useMemo(() => createStyles(isDark, subColor, fontSizeKey), [isDark, subColor, fontSizeKey]);

  const screenStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0C0C0C' : '#f2f2f4',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? '#3A3A3C' : '#D1D1D6',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#000000',
    },
    backButton: {
      padding: 8,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA',
      borderRadius: 12,
      padding: 2,
      marginHorizontal: 16,
      marginVertical: 8,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: 'center',
    },
    tabButtonSelected: {
      backgroundColor: isDark ? subColor : '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    tabText: {
      fontSize: 16,
      fontWeight: '500',
      color: isDark ? '#A0A0A0' : '#545454',
    },
    tabTextSelected: {
      color: isDark ? '#FFFFFF' : subColor,
      fontWeight: '600',
    },
    listContainer: {
      flex: 1,
      paddingTop: 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      fontSize: 16,
      color: isDark ? '#8E8E93' : '#6D6D72',
      textAlign: 'center',
    },
    selectionBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: isDark ? '#1E1E1E' : '#F8F8F8',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? '#3A3A3C' : '#C6C6C8',
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 12,
      height: 60,
    },
    selectionAction: {
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    selectionActionText: {
      fontSize: 12,
      color: subColor,
      marginTop: 2,
      fontWeight: '500',
    },
  });

  // Custom task wrapper component
  const CustomTaskWrapper = ({ item, drag, isActive }: any) => {
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const [isPressed, setIsPressed] = useState(false);
    
    // Cleanup timer on unmount
    useEffect(() => {
      return () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
        }
      };
    }, []);
    
    const handlePressIn = useCallback(() => {
      console.log('Press in detected for task:', item.title);
      if (isReorderMode) {
        console.log('In reorder mode, ignoring press in');
        return;
      }
      
      setIsPressed(true);
      longPressTimer.current = setTimeout(() => {
        console.log('🔥 LONG PRESS DETECTED! Task:', item.title);
        console.log('Calling handleLongPressSelect with:', item.keyId);
        handleLongPressSelect(item.keyId);
      }, 300); // 300ms long press (faster response)
    }, [item.keyId, item.title]);
    
    const handlePressOut = useCallback(() => {
      console.log('Press out detected');
      setIsPressed(false);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }, []);
    
    const handlePress = useCallback(() => {
      console.log('Press detected for task:', item.title);
      if (isReorderMode) {
        console.log('In reorder mode, ignoring press');
        return;
      }
      
      // Clear any pending long press
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      
      // Handle normal press
      if (isSelecting) {
        handleLongPressSelect(item.keyId);
      } else {
        router.push(`/task-detail/${item.id}`);
      }
    }, [item.keyId, item.id]);
    
    return (
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={({ pressed }) => [{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isReorderMode 
            ? (isDark ? '#1C1C1E' : '#F2F2F7') 
            : (pressed || isPressed) 
              ? (isDark ? '#2C2C2E' : '#F0F0F0')
              : 'transparent',
          paddingRight: isReorderMode ? 16 : 0,
        }]}
      >
        <View style={{ flex: 1 }}>
          <TaskItem
            task={item}
            onToggle={isReorderMode ? () => {} : handleToggleTaskDone}
            isSelecting={isSelecting && !isReorderMode}
            selectedIds={selectedIds}
            onLongPressSelect={() => {}} // Disable TaskItem's long press
            currentTab={currentTab}
            isDraggable={false} // Always false, we handle dragging separately
            isActive={isActive}
          />
        </View>
        
        {/* Drag handle (visible only in reorder mode) */}
        {isReorderMode && (
          <TouchableOpacity
            onPressIn={drag}
            style={{
              padding: 16,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View style={{
              flexDirection: 'column',
              gap: 2,
            }}>
              {Array.from({ length: 6 }, (_, i) => (
                <View
                  key={i}
                  style={{
                    width: 3,
                    height: 3,
                    backgroundColor: isDark ? '#8E8E93' : '#C7C7CC',
                    borderRadius: 1.5,
                  }}
                />
              ))}
            </View>
          </TouchableOpacity>
        )}
      </Pressable>
    );
  };
  
  // Render draggable task item
  const renderItem = useCallback(({ item, drag, isActive }: any) => {
    return (
      <ScaleDecorator>
        <CustomTaskWrapper item={item} drag={drag} isActive={isActive} />
      </ScaleDecorator>
    );
  }, [CustomTaskWrapper]);

  return (
    <SafeAreaView style={screenStyles.container}>
      {/* Header */}
      <View style={screenStyles.header}>
        <TouchableOpacity 
          style={screenStyles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        <Text style={screenStyles.headerTitle}>
          {t('draggable_test.title', 'Draggable Test')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Selector */}
      <View style={screenStyles.tabContainer}>
        <TouchableOpacity
          style={[
            screenStyles.tabButton,
            currentTab === 'incomplete' && screenStyles.tabButtonSelected
          ]}
          onPress={() => setCurrentTab('incomplete')}
        >
          <Text style={[
            screenStyles.tabText,
            currentTab === 'incomplete' && screenStyles.tabTextSelected
          ]}>
            {t('tasks.incomplete', '未完了')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            screenStyles.tabButton,
            currentTab === 'completed' && screenStyles.tabButtonSelected
          ]}
          onPress={() => setCurrentTab('completed')}
        >
          <Text style={[
            screenStyles.tabText,
            currentTab === 'completed' && screenStyles.tabTextSelected
          ]}>
            {t('tasks.completed', '完了済み')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Task List */}
      <View style={screenStyles.listContainer}>
        {isLoading ? (
          <View style={screenStyles.emptyContainer}>
            <Text style={screenStyles.emptyText}>
              {t('common.loading', '読み込み中...')}
            </Text>
          </View>
        ) : tasks.length === 0 ? (
          <View style={screenStyles.emptyContainer}>
            <Text style={screenStyles.emptyText}>
              {currentTab === 'incomplete' 
                ? t('tasks.no_incomplete_tasks', 'タスクがありません')
                : t('tasks.no_completed_tasks', '完了済みタスクがありません')
              }
            </Text>
          </View>
        ) : (
          <>
            {/* Debug info */}
            <View style={{ padding: 16, backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}>
              <Text style={{ color: isDark ? '#FFFFFF' : '#000000', fontSize: 12, fontWeight: 'bold' }}>
                Debug Info:
              </Text>
              <Text style={{ color: isDark ? '#FFFFFF' : '#000000', fontSize: 11 }}>
                • Tasks: {tasks.length} for {currentTab} tab
              </Text>
              <Text style={{ color: isDark ? '#FFFFFF' : '#000000', fontSize: 11 }}>
                • Reorder Mode: {isReorderMode ? 'ON' : 'OFF'}
              </Text>
              <Text style={{ color: isDark ? '#FFFFFF' : '#000000', fontSize: 11 }}>
                • Selecting: {isSelecting ? 'ON' : 'OFF'}
              </Text>
              <Text style={{ color: isDark ? '#FFFFFF' : '#000000', fontSize: 11 }}>
                • Has Changes: {hasChanges ? 'YES' : 'NO'}
              </Text>
              <Text style={{ color: isDark ? '#FF9500' : '#FF8C00', fontSize: 10 }}>
                • 保留タスク数: {isReorderMode ? pendingTasks.length : 'N/A'}
              </Text>
              <Text style={{ color: isDark ? '#FF9500' : '#FF8C00', fontSize: 10, marginTop: 4 }}>
                👆 Long press any task to enter reorder mode
              </Text>
              
              {/* Manual test button */}
              <TouchableOpacity
                style={{
                  backgroundColor: subColor,
                  padding: 8,
                  borderRadius: 6,
                  marginTop: 8,
                  alignItems: 'center',
                }}
                onPress={() => {
                  console.log('Manual test button pressed');
                  if (tasks.length > 0) {
                    handleLongPressSelect(tasks[0].keyId);
                  }
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>
                  📝 Manual Test: Enter Reorder Mode
                </Text>
              </TouchableOpacity>
            </View>
            <DraggableFlatList
              data={isReorderMode ? pendingTasks : tasks}
              renderItem={renderItem}
              keyExtractor={(item) => item.keyId}
              onDragBegin={({ from }) => {
                if (isReorderMode) {
                  isDragging.value = true;
                  draggedTaskId.value = pendingTasks[from]?.keyId || null;
                  console.log('📌 Drag 開始:', from, 'タスクID:', draggedTaskId.value);
                }
              }}
              onDragEnd={({ data, from, to }) => {
                if (isReorderMode && from !== to) {
                  console.log('📌 Drag 終了:', from, '->', to);
                  handleDragEnd(data, from, to);
                }
                // ドラッグ終了時のクリーンアップ
                isDragging.value = false;
                draggedTaskId.value = null;
              }}
              activationDistance={isReorderMode ? 0 : 999}
              dragItemOverflow={false}
              simultaneousHandlers={!isReorderMode ? [] : undefined}
            />
          </>
        )}
      </View>

      {/* Selection Bar */}
      {isSelecting && !isReorderMode && (
        <View style={screenStyles.selectionBar}>
          <TouchableOpacity 
            style={screenStyles.selectionAction}
            onPress={() => {
              setIsSelecting(false);
              setSelectedIds([]);
            }}
          >
            <Ionicons name="close" size={24} color={subColor} />
            <Text style={screenStyles.selectionActionText}>
              {t('common.cancel', 'キャンセル')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={screenStyles.selectionAction}
            onPress={() => {
              // Handle bulk operations here
              console.log('Selected tasks:', selectedIds);
            }}
          >
            <Ionicons name="trash" size={24} color={subColor} />
            <Text style={screenStyles.selectionActionText}>
              {t('common.delete', '削除')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Reorder Mode Bar */}
      {isReorderMode && (
        <View style={[screenStyles.selectionBar, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
          <TouchableOpacity 
            style={screenStyles.selectionAction}
            onPress={handleCancelReorder}
          >
            <Ionicons name="close" size={24} color={isDark ? '#FF6B6B' : '#FF3B30'} />
            <Text style={[screenStyles.selectionActionText, { color: isDark ? '#FF6B6B' : '#FF3B30' }]}>
              {t('common.cancel', 'キャンセル')}
            </Text>
          </TouchableOpacity>
          
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="swap-vertical" size={24} color={subColor} />
            <Text style={[screenStyles.selectionActionText, { fontSize: 14, fontWeight: '600' }]}>
              {t('reorder.drag_to_reorder', 'ドラッグして並び替え')}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[screenStyles.selectionAction, { 
              backgroundColor: hasChanges ? subColor : (isDark ? '#48484A' : '#E5E5EA'),
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }]}
            onPress={handleConfirmReorder}
            disabled={!hasChanges}
          >
            <Ionicons 
              name="checkmark" 
              size={24} 
              color={hasChanges ? '#FFFFFF' : (isDark ? '#8E8E93' : '#C7C7CC')} 
            />
            <Text style={[
              screenStyles.selectionActionText, 
              { 
                color: hasChanges ? '#FFFFFF' : (isDark ? '#8E8E93' : '#C7C7CC'),
                fontWeight: '600'
              }
            ]}>
              {t('common.done', '完了')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}