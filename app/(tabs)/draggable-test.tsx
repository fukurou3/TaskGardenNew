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
  
  // スクロール制御用の状態
  const [isDragActive, setIsDragActive] = useState(false);

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
        // Task reorder in DB not supported, keeping local order
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
    if (isReorderMode) {
      return;
    }
    
    if (isSelecting) {
      setSelectedIds(prev => 
        prev.includes(id) 
          ? prev.filter(selectedId => selectedId !== id)
          : [...prev, id]
      );
    } else {
      // 並び替えモードに切り替え
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

  // Custom task wrapper component - シンプルな実装
  const CustomTaskWrapper = useCallback(({ item, drag, isActive }: any) => {
    
    return (
      <Pressable
        onLongPress={() => {
          if (!isReorderMode) {
            handleLongPressSelect(item.keyId);
          }
        }}
        onPress={() => {
          if (isReorderMode) {
            return;
          }
          if (isSelecting) {
            handleLongPressSelect(item.keyId);
          } else {
            router.push(`/task-detail/${item.id}`);
          }
        }}
        delayLongPress={500}
        disabled={isReorderMode} // 並び替えモード時はPressableを無効化
        style={({ pressed }) => [{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isReorderMode 
            ? (isDark ? '#1C1C1E' : '#F2F2F7') 
            : pressed 
              ? (isDark ? '#2C2C2E' : '#F0F0F0')
              : 'transparent',
          paddingRight: isReorderMode ? 16 : 0,
        }]}
      >
        <View style={{ flex: 1 }}>
          <View 
            style={{ 
              pointerEvents: isReorderMode ? 'none' : 'auto' // リオーダーモード時はタッチイベントを無効化
            }}
          >
            <TaskItem
              task={item}
              onToggle={isReorderMode ? () => {} : handleToggleTaskDone}
              isSelecting={isSelecting && !isReorderMode}
              selectedIds={selectedIds}
              onLongPressSelect={(type, id) => {
                if (!isReorderMode && !isSelecting) {
                  handleLongPressSelect(id);
                }
              }}
              currentTab={currentTab}
              isDraggable={false} // Always false, we handle dragging separately
              isActive={isActive}
            />
          </View>
        </View>
        
        {/* つまみ（3つの点）- 右側に配置、リオーダーモード時のみ表示 */}
        {isReorderMode && (
          <TouchableOpacity
            onLongPress={drag}
            delayLongPress={100}
            style={{
              paddingVertical: 16,
              paddingHorizontal: 16,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              borderRadius: 8,
              marginRight: 8,
              marginLeft: 8,
              minWidth: 44,
              minHeight: 44,
            }}
            activeOpacity={0.7}
          >
            <View style={{
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
            }}>
              {Array.from({ length: 3 }, (_, i) => (
                <View
                  key={i}
                  style={{
                    width: 4,
                    height: 4,
                    backgroundColor: isDark ? '#8E8E93' : '#C7C7CC',
                    borderRadius: 2,
                    opacity: 0.8,
                  }}
                />
              ))}
            </View>
          </TouchableOpacity>
        )}
      </Pressable>
    );
  }, [isReorderMode, isSelecting, isDark, handleLongPressSelect, router]); // 依存関係を追加
  
  // Render draggable task item
  const renderItem = useCallback(({ item, drag, isActive }: any) => {
    return (
      <ScaleDecorator>
        <CustomTaskWrapper item={item} drag={drag} isActive={isActive} />
      </ScaleDecorator>
    );
  }, [isReorderMode]);

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
            <DraggableFlatList
              key={`draggable-${isReorderMode ? 'reorder' : 'normal'}-${currentTab}`} // 動的key
              data={isReorderMode ? pendingTasks : tasks}
              renderItem={renderItem}
              keyExtractor={(item) => item.keyId}
              onDragBegin={({ from }) => {
                if (isReorderMode) {
                  isDragging.value = true;
                  draggedTaskId.value = pendingTasks[from]?.keyId || null;
                  setIsDragActive(true); // ドラッグ開始時にスクロール制御
                }
              }}
              onDragEnd={({ data, from, to }) => {
                if (isReorderMode && from !== to) {
                  handleDragEnd(data, from, to);
                }
                // ドラッグ終了時のクリーンアップ
                isDragging.value = false;
                draggedTaskId.value = null;
                setIsDragActive(false); // ドラッグ終了時にスクロール制御解除
              }}
              activationDistance={isReorderMode ? 0 : 99999}
              dragItemOverflow={false}
              simultaneousHandlers={[]}
              scrollEnabled={true}
              panGestureHandlerProps={{
                // 並び替えモード時のみPanGestureを有効化
                enabled: isReorderMode,
                minDist: isReorderMode ? 5 : 999,
                activeOffsetX: isReorderMode ? [-10, 10] : undefined,
                activeOffsetY: isReorderMode ? [-10, 10] : undefined,
                failOffsetX: isReorderMode ? undefined : [-5, 5],
                failOffsetY: isReorderMode ? undefined : [-5, 5],
              }}
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