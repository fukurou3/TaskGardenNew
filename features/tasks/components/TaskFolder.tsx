// app/features/tasks/components/TaskFolder.tsx
import React, { useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { DisplayableTaskItem } from '../types';
import { TaskItem } from './TaskItem';
import { useAppTheme } from '@/hooks/ThemeContext';
import { useTranslation } from 'react-i18next';
import { FontSizeContext, FontSizeKey } from '@/context/FontSizeContext';
import { createStyles } from '../styles';
import { fontSizes } from '@/constants/fontSizes';

// ネイティブドラッグ&ドロップの準備

// 固定スタイル定数（再計算防止）
const DEADLINE_CONTAINER_STYLE = { 
  alignItems: 'flex-end' as const, 
  justifyContent: 'center' as const, 
  minHeight: 30 
};


export interface Props {
  folderName: string;
  tasks: DisplayableTaskItem[];
  onToggleTaskDone: (id: string, instanceDate?: string) => void;
  isReordering: boolean;
  setDraggingFolder: (name: string | null) => void;
  draggingFolder: string | null;
  moveFolder: (folderName: string, direction: 'up' | 'down') => void;
  stopReordering: () => void;
  isSelecting: boolean;
  selectedIds: string[];
  onLongPressSelect: (type: 'task' | 'folder', id: string) => void;
  currentTab: 'incomplete' | 'completed';
  sortMode?: 'deadline' | 'custom';
  isTaskReorderMode?: boolean;
  onTaskReorder?: (fromIndex: number, toIndex: number) => Promise<void>;
  onFolderReorder?: (folderName: string, fromIndex: number, toIndex: number) => void;
  folderIndex?: number;
  totalFolders?: number;
  onTaskDragStateChange?: (isDragging: boolean) => void;
  onChangeSortMode?: (sortMode: 'deadline' | 'custom') => void;
  onReorderModeChange?: (isReorderMode: boolean, hasChanges: boolean, onConfirm: () => void, onCancel: () => void) => void;
}

export const TaskFolder: React.FC<Props> = ({
  folderName,
  tasks,
  // isCollapsed, // ← 削除
  // toggleFolder, // ← 削除
  onToggleTaskDone,
  // onRefreshTasks,
  isReordering,
  setDraggingFolder,
  draggingFolder,
  moveFolder,
  stopReordering,
  isSelecting,
  selectedIds,
  onLongPressSelect,
  currentTab,
  sortMode = 'deadline',
  isTaskReorderMode = false,
  onTaskReorder,
  onFolderReorder,
  folderIndex = 0,
  totalFolders = 1,
  onTaskDragStateChange,
  onChangeSortMode,
  onReorderModeChange,
}) => {
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const { fontSizeKey } = useContext(FontSizeContext);
  // 🔥 useMemoでstylesオブジェクトの生成をメモ化し、不要な再生成を防ぐ
  const styles = useMemo(() => createStyles(isDark, subColor, fontSizeKey), [isDark, subColor, fontSizeKey]);
  const { t } = useTranslation();
  const baseFontSize = fontSizes[fontSizeKey];
  const noFolderName = t('common.no_folder_name', 'フォルダなし');


  const isFolderSelected = isSelecting && selectedIds.includes(folderName);
  
  // DraggableFlatList用の状態管理
  const [pendingTasks, setPendingTasks] = useState<DisplayableTaskItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  
  // 並べ替えモードの条件
  const isDraggableMode = sortMode === 'custom' && currentTab === 'incomplete' && !isSelecting && (tasks?.length || 0) > 1;
  
  
  // グローバル並べ替えモード開始時にpendingTasksを初期化
  useEffect(() => {
    if (isTaskReorderMode && tasks.length > 0) {
      setPendingTasks([...tasks]);
      setHasChanges(false);
    } else if (!isTaskReorderMode) {
      setPendingTasks([]);
      setHasChanges(false);
    }
  }, [isTaskReorderMode, tasks]);

  // 並べ替えモード状態を親に通知
  useEffect(() => {
    if (onReorderModeChange) {
      onReorderModeChange(isTaskReorderMode, hasChanges, handleConfirmReorder, handleCancelReorder);
    }
  }, [isTaskReorderMode, hasChanges, onReorderModeChange]);
  
  // ドラッグ状態を親に通知して外側のScrollViewを制御
  useEffect(() => {
    if (onTaskDragStateChange) {
      onTaskDragStateChange(isTaskReorderMode);
    }
  }, [isTaskReorderMode, onTaskDragStateChange]);
  
  
  // Remove excessive debug logging
  
  


  // handleToggleReorderMode削除



  const handlePressFolder = () => {
    if (isSelecting && folderName) {
        onLongPressSelect('folder', folderName);
    } else {
        // toggleFolder(folderName); // ← 呼び出しを削除 (何もしないか、別の動作を割り当てる)
        // 例えば、選択モードでなければ何もしない、など。
        // このテストでは、フォルダヘッダータップで開閉しなくなることを意図しています。
    }
  };



  // 並べ替え処理
  const handleDragEnd = useCallback((data: DisplayableTaskItem[], from: number, to: number) => {
    if (from === to) return;
    console.log('📝 TaskFolder: 並び替え実行:', from, '->', to);
    setPendingTasks(data);
    setHasChanges(true);
  }, []);
  
  
  // 並べ替え確定
  const handleConfirmReorder = useCallback(async () => {
    if (!hasChanges) {
      return;
    }
    
    try {
      // ソートモードをカスタム順に変更（並び替えを行ったため）
      if (sortMode !== 'custom') {
        console.log('📋 ソートモードをカスタム順に変更');
        onChangeSortMode?.('custom');
      }
      
      // 親に並び替え結果を通知
      for (let i = 0; i < pendingTasks.length; i++) {
        if (pendingTasks[i].id !== tasks[i]?.id) {
          // 並び替えが必要
          const originalIndex = tasks.findIndex(t => t.id === pendingTasks[i].id);
          if (originalIndex !== -1 && originalIndex !== i) {
            await onTaskReorder?.(originalIndex, i);
            break; // 一度に一つずつ処理
          }
        }
      }
    } catch (error) {
      console.error('TaskFolder: 並び替え確定エラー:', error);
    } finally {
      setHasChanges(false);
    }
  }, [hasChanges, pendingTasks, tasks, onTaskReorder, sortMode, onChangeSortMode]);
  
  // 並べ替えキャンセル
  const handleCancelReorder = useCallback(() => {
    setPendingTasks([...tasks]);
    setHasChanges(false);
  }, [tasks]);
  
  // 6つの点でのドラッグ並び替え
  const renderDraggableTaskItem = useCallback(({ item, drag, isActive }: any) => {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* タスク内容部分 - ドラッグ無効、通常タッチ可能 */}
        <View 
          style={{ flex: 1 }}
          pointerEvents="box-none" // 子要素のタッチイベントを通す
        >
          <TaskItem
            task={item}
            onToggle={onToggleTaskDone}
            isSelecting={false}
            selectedIds={[]}
            onLongPressSelect={() => {}}
            currentTab={currentTab}
            isInsideFolder={true}
            isLastItem={false}
            isDraggable={false}
            isActive={false}
          />
        </View>
        
        {/* 3つの点 - ドラッグハンドル */}
        {isTaskReorderMode && (
          <ScaleDecorator>
            <TouchableOpacity
              onLongPress={drag}
              delayLongPress={200}
              style={{
                padding: 16,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'transparent', // タスク背景と同じ透明背景
                marginLeft: 8,
                borderRadius: 8,
                minWidth: 40,
              }}
              activeOpacity={0.8}
            >
              <View style={{
                flexDirection: 'column',
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
                    }}
                  />
                ))}
              </View>
            </TouchableOpacity>
          </ScaleDecorator>
        )}
      </View>
    );
  }, [isTaskReorderMode, onToggleTaskDone, currentTab, isDark]);
  

  // 通常TaskItem
  const renderRegularTaskItem = useCallback(({ item, index }: { item: DisplayableTaskItem, index: number }) => {
    return (
      <TaskItem
        key={item.keyId}
        task={item}
        onToggle={onToggleTaskDone}
        isSelecting={isSelecting}
        selectedIds={selectedIds}
        onLongPressSelect={() => {}}
        currentTab={currentTab}
        isInsideFolder={true}
        isLastItem={index === tasks.length - 1}
        isDraggable={false}
      />
    );
  }, [tasks.length, onToggleTaskDone, isSelecting, selectedIds, currentTab]);

  // Mock animations since Reanimated is disabled
  const animatedFolderHeaderStyle = {
    opacity: 1,
  };

  return (
    <View 
      style={styles.folderContainer}
      nativeID={`folder-container-${folderName}`}
    >
      {folderName && (
        <View style={animatedFolderHeaderStyle}>
          <TouchableOpacity
            onPress={handlePressFolder}
            style={[
              styles.folderHeader,
              isFolderSelected && styles.folderHeaderSelected,
            ]}
            activeOpacity={0.7}
          >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
             {isSelecting && (
                <Ionicons
                    name={isFolderSelected ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                    color={subColor}
                    style={{ marginRight: 10 }}
                />
            )}
            {/* isCollapsed を参照しないように修正 */}
            {!isSelecting && folderName && (
                <Ionicons
                    name={"folder-open-outline"} // ← 常に開いているアイコン
                    size={20}
                    color={isDark ? '#E0E0E0' : '#333333'}
                    style={styles.folderIconStyle}
                />
            )}
            <Text style={styles.folderName} numberOfLines={1}>{folderName}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* ドットメニューボタン - 無効化 */}
            

            
          </View>
        </TouchableOpacity>
        </View>
      )}
      
      {/* タスクリスト表示 */}
      {tasks && tasks.length > 0 && (
        <View
          style={{
            flex: 1,
            overflow: 'hidden',
          }}
          nativeID={`task-list-${folderName}`}
        >
          {isTaskReorderMode ? (
            // 並べ替えモード - DraggableFlatListを独立コンテナで分離
            <DraggableFlatList
              data={pendingTasks}
              renderItem={renderDraggableTaskItem}
              keyExtractor={(item) => item.keyId}
              onDragEnd={({ data, from, to }) => {
                if (from !== to) {
                  handleDragEnd(data, from, to);
                }
                // ドラッグ終了時に外側のスクロールを再有効化
                onTaskDragStateChange?.(false);
              }}
              onDragBegin={() => {
                // ドラッグ開始時に外側のスクロールを無効化
                onTaskDragStateChange?.(true);
              }}
              activationDistance={20}
              dragItemOverflow={false}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              simultaneousHandlers={[]}
              style={{ flex: 1 }}
            />
          ) : (
            // 通常モード
            (tasks || []).map((item, index) => renderRegularTaskItem({ item, index }))
          )}
        </View>
      )}

      {/* Empty state */}
      {(!tasks || tasks.length === 0) && folderName && (
        <View 
          style={{ 
            paddingVertical: 20, 
            paddingHorizontal: 16, 
            alignItems: 'center',
          }}
        >
          <Text style={{ color: isDark ? '#8E8E93' : '#6D6D72', fontSize: baseFontSize -1 }}>
            {t('task_list.empty_folder', 'このフォルダーにはタスクがありません')}
          </Text>
        </View>
      )}

    </View>
  );
};