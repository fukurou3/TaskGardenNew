// app/(tabs)/draggable-test.tsx
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAppTheme } from '@/hooks/ThemeContext';
import { useTranslation } from 'react-i18next';
import { TaskItem } from '@/features/tasks/components/TaskItem';
import { TaskFolder } from '@/features/tasks/components/TaskFolder';
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
  const [isTaskReorderMode, setIsTaskReorderMode] = useState(false);
  const [taskReorderState, setTaskReorderState] = useState<{
    isReorderMode: boolean;
    hasChanges: boolean;
    onConfirm: (() => void) | null;
    onCancel: (() => void) | null;
  }>({
    isReorderMode: false,
    hasChanges: false,
    onConfirm: null,
    onCancel: null,
  });
  
  // フォルダー分けされたタスク
  const [tasksByFolder, setTasksByFolder] = useState<Map<string, DisplayableTaskItem[]>>(new Map());
  const [folders, setFolders] = useState<string[]>([]);
  const [isTaskDragging, setIsTaskDragging] = useState(false);
  
  const noFolderName = t('common.no_folder_name', 'フォルダなし');

  // Load real tasks from database and organize by folders
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
        
        // Organize tasks by folder
        const folderMap = new Map<string, DisplayableTaskItem[]>();
        const folderSet = new Set<string>();
        
        displayableTasks.forEach(task => {
          const folderName = task.folder || noFolderName;
          folderSet.add(folderName);
          
          if (!folderMap.has(folderName)) {
            folderMap.set(folderName, []);
          }
          folderMap.get(folderName)!.push(task);
        });
        
        // Sort folders: noFolderName first, then alphabetically
        const sortedFolders = Array.from(folderSet).sort((a, b) => {
          if (a === noFolderName) return -1;
          if (b === noFolderName) return 1;
          return a.localeCompare(b);
        });
        
        setTasks(displayableTasks);
        setTasksByFolder(folderMap);
        setFolders(sortedFolders);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks([]);
      setTasksByFolder(new Map());
      setFolders([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentTab, noFolderName]);

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

  // 並べ替えモード状態変更ハンドラー
  const handleReorderModeChange = useCallback((
    isReorderMode: boolean, 
    hasChanges: boolean, 
    onConfirm: () => void, 
    onCancel: () => void
  ) => {
    setIsTaskReorderMode(isReorderMode);
    setTaskReorderState({
      isReorderMode,
      hasChanges,
      onConfirm,
      onCancel,
    });
  }, []);

  // Task reorder handler for specific folder
  const createTaskReorderHandler = useCallback((folderName: string) => {
    return async (fromIndex: number, toIndex: number) => {
      try {
        const folderTasks = tasksByFolder.get(folderName) || [];
        const newTasks = [...folderTasks];
        const [movedTask] = newTasks.splice(fromIndex, 1);
        newTasks.splice(toIndex, 0, movedTask);
        
        // Update folder tasks
        setTasksByFolder(prev => {
          const newMap = new Map(prev);
          newMap.set(folderName, newTasks);
          return newMap;
        });
        
        // Update database if method exists
        try {
          if (TasksDatabase.updateTaskOrder) {
            for (let i = 0; i < newTasks.length; i++) {
              await TasksDatabase.updateTaskOrder(newTasks[i].id, i);
            }
          }
        } catch (dbError) {
          console.log('Task reorder in DB not supported, keeping local order');
        }
      } catch (error) {
        console.error('Failed to reorder tasks:', error);
        await loadTasks(); // Reload on error
      }
    };
  }, [tasksByFolder, loadTasks]);

  // Handle task drag state changes to control outer scroll
  const handleTaskDragStateChange = useCallback((isDragging: boolean) => {
    setIsTaskDragging(isDragging);
  }, []);

  const handleLongPressSelect = useCallback((id: string) => {
    if (isTaskReorderMode) {
      return;
    }
    
    if (isSelecting) {
      setSelectedIds(prev => 
        prev.includes(id) 
          ? prev.filter(selectedId => selectedId !== id)
          : [...prev, id]
      );
    } else {
      // Enter task reorder mode
      setIsTaskReorderMode(true);
      setTaskReorderState({
        isReorderMode: true,
        hasChanges: false,
        onConfirm: () => {
          setIsTaskReorderMode(false);
          setTaskReorderState(prev => ({ ...prev, isReorderMode: false, hasChanges: false }));
        },
        onCancel: () => {
          setIsTaskReorderMode(false);
          setTaskReorderState(prev => ({ ...prev, isReorderMode: false, hasChanges: false }));
          loadTasks(); // Reload to discard changes
        },
      });
    }
  }, [isSelecting, isTaskReorderMode, loadTasks]);


  // Styles - パフォーマンス最適化のため直接作成
  const styles = createStyles(isDark, subColor, fontSizeKey);

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

      {/* Task List - Folder-based */}
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
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ 
              paddingTop: 8, 
              paddingBottom: isTaskReorderMode ? 120 : 100 
            }}
            showsVerticalScrollIndicator={true}
            scrollEnabled={!isTaskReorderMode}
          >
            {folders.map((folderName, folderIndex) => {
              const folderTasks = tasksByFolder.get(folderName) || [];
              if (folderTasks.length === 0) return null;
              
              return (
                <View key={`folder-section-${folderIndex}`} style={{ marginBottom: 16 }}>
                  {/* Fixed Folder Header */}
                  <View style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: isDark ? '#1C1C1E' : '#F8F8F8',
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: isDark ? '#3A3A3C' : '#D1D1D6',
                    marginBottom: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                    <Ionicons
                      name="folder-open-outline"
                      size={20}
                      color={isDark ? '#E0E0E0' : '#333333'}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: isDark ? '#FFFFFF' : '#000000',
                    }}>
                      {folderName === noFolderName ? 'フォルダなし' : folderName}
                    </Text>
                  </View>
                  
                  {/* Draggable Task List for this folder */}
                  {isTaskReorderMode ? (
                    <DraggableFlatList
                      data={folderTasks}
                      renderItem={({ item, drag, isActive }) => (
                        <Pressable
                          style={({ pressed }) => [{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: pressed 
                              ? (isDark ? '#2C2C2E' : '#F0F0F0')
                              : 'transparent',
                            paddingRight: 16,
                          }]}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ pointerEvents: 'none' }}>
                              <TaskItem
                                task={item}
                                onToggle={() => {}}
                                isSelecting={false}
                                selectedIds={[]}
                                onLongPressSelect={() => {}}
                                currentTab={currentTab}
                                isDraggable={false}
                                isActive={isActive}
                              />
                            </View>
                          </View>
                          
                          {/* Drag handle */}
                          <TouchableOpacity
                            onPressIn={drag}
                            delayPressIn={0}
                            activeOpacity={0.8}
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
                        </Pressable>
                      )}
                      keyExtractor={(item) => item.keyId}
                      onDragEnd={({ data, from, to }) => {
                        if (from !== to) {
                          // Update this folder's tasks
                          setTasksByFolder(prev => {
                            const newMap = new Map(prev);
                            newMap.set(folderName, data);
                            return newMap;
                          });
                          setTaskReorderState(prev => ({ ...prev, hasChanges: true }));
                        }
                      }}
                      activationDistance={0}
                      dragItemOverflow={false}
                      scrollEnabled={false}
                      nestedScrollEnabled={false}
                      animationConfig={{
                        damping: 20,
                        mass: 0.2,
                        stiffness: 100,
                        overshootClamping: true,
                        restSpeedThreshold: 0.2,
                        restDisplacementThreshold: 0.2,
                      }}
                    />
                  ) : (
                    // Normal task list
                    folderTasks.map((item, index) => (
                      <Pressable
                        key={item.keyId}
                        onLongPress={() => {
                          if (!isSelecting) {
                            handleLongPressSelect(item.keyId);
                          }
                        }}
                        delayLongPress={500}
                      >
                        <TaskItem
                          task={item}
                          onToggle={handleToggleTaskDone}
                          isSelecting={isSelecting}
                          selectedIds={selectedIds}
                          onLongPressSelect={(type, id) => {
                            if (!isSelecting) {
                              handleLongPressSelect(id);
                            }
                          }}
                          currentTab={currentTab}
                          isDraggable={false}
                        />
                      </Pressable>
                    ))
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Selection Bar */}
      {isSelecting && !isTaskReorderMode && (
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
      
      {/* Reorder Mode Buttons - 独立したボタンエリア */}
      {taskReorderState.isReorderMode && (
        <View style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <TouchableOpacity 
            style={{
              backgroundColor: isDark ? '#48484A' : '#E5E5EA',
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4,
            }}
            onPress={() => taskReorderState.onCancel?.()}
          >
            <Ionicons name="close" size={20} color={isDark ? '#FFFFFF' : '#000000'} />
            <Text style={{ 
              color: isDark ? '#FFFFFF' : '#000000',
              fontWeight: '600',
              marginLeft: 8,
              fontSize: 16,
            }}>
              {t('common.cancel', 'キャンセル')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{
              backgroundColor: taskReorderState.hasChanges ? subColor : (isDark ? '#48484A' : '#E5E5EA'),
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              opacity: taskReorderState.hasChanges ? 1 : 0.6,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: taskReorderState.hasChanges ? 0.2 : 0.1,
              shadowRadius: 4,
              elevation: 4,
            }}
            onPress={() => taskReorderState.onConfirm?.()}
            disabled={!taskReorderState.hasChanges}
          >
            <Ionicons 
              name="checkmark" 
              size={20} 
              color={taskReorderState.hasChanges ? '#FFFFFF' : (isDark ? '#8E8E93' : '#C7C7CC')} 
            />
            <Text style={{ 
              color: taskReorderState.hasChanges ? '#FFFFFF' : (isDark ? '#8E8E93' : '#C7C7CC'),
              fontWeight: '600',
              marginLeft: 8,
              fontSize: 16,
            }}>
              {t('common.done', '完了')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}