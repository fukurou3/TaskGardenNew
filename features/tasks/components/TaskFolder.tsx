// app/features/tasks/components/TaskFolder.tsx
import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native'; // FlatListは前回導入済みのはず
import { Ionicons } from '@expo/vector-icons';
import { DisplayableTaskItem } from '../types';
import { TaskItem } from './TaskItem';
import { useAppTheme } from '@/hooks/ThemeContext';
import { useTranslation } from 'react-i18next';
import { FontSizeContext, FontSizeKey } from '@/context/FontSizeContext';
import { createStyles } from '../styles';
import { fontSizes } from '@/constants/fontSizes';


export interface Props {
  folderName: string;
  tasks: DisplayableTaskItem[];
  // isCollapsed: boolean; // ← 削除
  // toggleFolder: (name: string) => void; // ← 削除
  onToggleTaskDone: (id: string, instanceDate?: string) => void;
  // onRefreshTasks?: () => void; // ViewPagerから渡されなくなった場合、またはFlatListが持つ場合
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
  onTaskReorder?: (folderName: string, fromIndex: number, toIndex: number) => void;
  onFolderReorder?: (folderName: string, fromIndex: number, toIndex: number) => void;
  folderIndex?: number;
  totalFolders?: number;
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
}) => {
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const { fontSizeKey } = useContext(FontSizeContext);
  const styles = createStyles(isDark, subColor, fontSizeKey);
  const { t } = useTranslation();
  const baseFontSize = fontSizes[fontSizeKey];
  const noFolderName = t('common.no_folder_name', 'フォルダなし');

  const isFolderSelected = isSelecting && selectedIds.includes(folderName);
  
  // ドラッグ状態管理
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isDraggableMode = sortMode === 'custom' && currentTab === 'incomplete' && !isSelecting && tasks.length > 1 && isTaskReorderMode;
  const isFolderDraggable = sortMode === 'custom' && currentTab === 'incomplete' && !isSelecting && totalFolders > 1 && folderName !== noFolderName && isTaskReorderMode;

  const handleTaskReorderUp = (taskId: string) => {
    const currentIndex = tasks.findIndex(task => task.keyId === taskId);
    if (currentIndex > 0 && onTaskReorder) {
      onTaskReorder(folderName, currentIndex, currentIndex - 1);
    }
  };

  const handleTaskReorderDown = (taskId: string) => {
    const currentIndex = tasks.findIndex(task => task.keyId === taskId);
    if (currentIndex < tasks.length - 1 && onTaskReorder) {
      onTaskReorder(folderName, currentIndex, currentIndex + 1);
    }
  };

  // handleToggleReorderMode削除

  const handleFolderReorderUp = () => {
    if (folderIndex > 0 && onFolderReorder) {
      onFolderReorder(folderName, folderIndex, folderIndex - 1);
    }
  };

  const handleFolderReorderDown = () => {
    if (folderIndex < totalFolders - 1 && onFolderReorder) {
      onFolderReorder(folderName, folderIndex, folderIndex + 1);
    }
  };


  const handlePressFolder = () => {
    if (isSelecting && folderName) {
        onLongPressSelect('folder', folderName);
    } else {
        // toggleFolder(folderName); // ← 呼び出しを削除 (何もしないか、別の動作を割り当てる)
        // 例えば、選択モードでなければ何もしない、など。
        // このテストでは、フォルダヘッダータップで開閉しなくなることを意図しています。
    }
  };

  const handleTaskDragStart = (taskId: string) => {
    setDraggingTaskId(taskId);
    setDragOverIndex(null);
  };

  const handleTaskDragActive = (taskId: string, translationY: number) => {
    if (draggingTaskId !== taskId) return;
    
    const itemHeight = 70;
    const currentIndex = tasks.findIndex(task => task.keyId === taskId);
    
    // 標準的なドラッグ位置計算
    const indexOffset = Math.round(translationY / itemHeight);
    let newIndex = currentIndex + indexOffset;
    newIndex = Math.max(0, Math.min(tasks.length - 1, newIndex));
    
    // インデックスが変更された場合のみ更新
    if (newIndex !== dragOverIndex) {
      setDragOverIndex(newIndex);
    }
  };

  const handleTaskDragEnd = async (taskId: string, newIndex: number) => {
    const currentIndex = tasks.findIndex(task => task.keyId === taskId);
    
    try {
      if (currentIndex === -1 || currentIndex === newIndex) return;

      console.log('Task drag end:', { taskId, currentIndex, newIndex });
      
      if (onTaskReorder) {
        await onTaskReorder(folderName, currentIndex, newIndex);
      }
    } catch (error) {
      console.error('Failed to reorder task:', error);
      // エラー時はUIを元の状態に戻すため、強制的にリフレッシュを促す
      // 実際のプロダクションではtoastやアラートでユーザーに通知
    } finally {
      // 成功・失敗に関わらずドラッグ状態をリセット
      setDraggingTaskId(null);
      setDragOverIndex(null);
    }
  };

  const renderTaskItem = ({ item, index }: { item: DisplayableTaskItem, index: number }) => {
    const isDragging = draggingTaskId === item.keyId;
    const currentDragIndex = tasks.findIndex(t => t.keyId === draggingTaskId);
    
    // 一般的なドラッグ&ドロップ：ドラッグ中に影響を受けるタスクが事前移動
    let shouldMoveUp = false;
    let shouldMoveDown = false;
    
    if (dragOverIndex !== null && !isDragging && currentDragIndex !== -1) {
      if (dragOverIndex !== currentDragIndex) {
        if (dragOverIndex > currentDragIndex) {
          // ドラッグアイテムが下に移動：間のアイテムが上に詰めてスペースを作る
          shouldMoveUp = index > currentDragIndex && index <= dragOverIndex;
        } else {
          // ドラッグアイテムが上に移動：間のアイテムが下に押し出されてスペースを作る
          shouldMoveDown = index >= dragOverIndex && index < currentDragIndex;
        }
      }
    }
    
    return (
      <TaskItem
        key={item.keyId}
        task={item}
        onToggle={onToggleTaskDone}
        isSelecting={isSelecting}
        selectedIds={selectedIds}
        onLongPressSelect={(id) => onLongPressSelect('task',id)}
        currentTab={currentTab}
        isInsideFolder={true}
        isLastItem={index === tasks.length - 1}
        isDraggable={isDraggableMode}
        onDragStart={handleTaskDragStart}
        onDragActive={handleTaskDragActive}
        onDragEnd={handleTaskDragEnd}
        onMoveUp={handleTaskReorderUp}
        onMoveDown={handleTaskReorderDown}
        canMoveUp={index > 0}
        canMoveDown={index < tasks.length - 1}
        currentIndex={index}
        totalItems={tasks.length}
        isDragging={isDragging}
        shouldMoveUp={shouldMoveUp}
        shouldMoveDown={shouldMoveDown}
      />
    );
  };

  return (
    <View style={styles.folderContainer}>
      {folderName && (
        <TouchableOpacity
          onPress={handlePressFolder}
          onLongPress={() => onLongPressSelect('folder', folderName)}
          style={[
            styles.folderHeader,
            isFolderSelected && styles.folderHeaderSelected,
          ]}
          // disabled={!isSelecting} // 選択モードでない場合はタップ不要にするなら
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
            {/* ドットメニューボタン - 無効化
            {!isReordering && !isFolderDraggable && folderName && (
              <TouchableOpacity 
                onPress={handleLongPress}
                style={styles.menuButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name="ellipsis-horizontal" 
                  size={18} 
                  color={isDark ? '#E0E0E0' : '#666666'} 
                />
              </TouchableOpacity>
            )}
            */}
            
            {/* フォルダの並べ替えボタン（カスタムモード時） */}
            {isFolderDraggable && (
              <View style={styles.reorderButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.reorderButton, folderIndex === 0 && styles.reorderButtonDisabled]}
                  onPress={handleFolderReorderUp}
                  disabled={folderIndex === 0}
                >
                  <Ionicons 
                    name="chevron-up" 
                    size={16} 
                    color={folderIndex === 0 ? (isDark ? '#5A5A5A' : '#C7C7CC') : subColor} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.reorderButton, folderIndex >= totalFolders - 1 && styles.reorderButtonDisabled]}
                  onPress={handleFolderReorderDown}
                  disabled={folderIndex >= totalFolders - 1}
                >
                  <Ionicons 
                    name="chevron-down" 
                    size={16} 
                    color={folderIndex >= totalFolders - 1 ? (isDark ? '#5A5A5A' : '#C7C7CC') : subColor} 
                  />
                </TouchableOpacity>
              </View>
            )}
            
            {/* 既存の並べ替えボタン（編集モード時） */}
            {isReordering && draggingFolder !== folderName && folderName !== noFolderName && (
              <>
                <TouchableOpacity onPress={() => moveFolder(folderName, 'up')} style={styles.reorderButton}>
                  <Ionicons name="arrow-up" size={20} color={subColor} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveFolder(folderName, 'down')} style={styles.reorderButton}>
                  <Ionicons name="arrow-down" size={20} color={subColor} />
                </TouchableOpacity>
              </>
            )}
             {isReordering && draggingFolder === folderName && folderName !== noFolderName && (
                <TouchableOpacity onPress={stopReordering} style={styles.reorderButton}>
                  <Text style={{color: subColor}}>{t('common.done')}</Text>
                </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* isCollapsed の条件を削除し、tasks.length > 0 の場合のみ FlatList を表示 */}
      {tasks.length > 0 && (
        <View style={{ overflow: 'hidden' }}>
          <FlatList
            data={tasks}
            renderItem={renderTaskItem}
            keyExtractor={(item) => item.keyId}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ flexGrow: 0 }}
          />
        </View>
      )}

      {/* isCollapsed の条件を削除 */}
      {tasks.length === 0 && folderName && (
         <View style={{ paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center' }}>
             <Text style={{ color: isDark ? '#8E8E93' : '#6D6D72', fontSize: baseFontSize -1 }}>
                 {t('task_list.empty_folder', 'このフォルダーにはタスクがありません')}
             </Text>
         </View>
      )}
    </View>
  );
};