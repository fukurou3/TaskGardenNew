// app/features/tasks/components/TaskFolder.tsx
import React, { useContext, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DisplayableTaskItem } from '../types';
import { TaskItem } from './TaskItem';
import { SkiaTaskCanvas } from '@/components/SkiaTaskCanvas';
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
  
  // 🔥 Single Source of Truth: 親のpropsを直接使用（状態管理撤廃）
  const isDraggableMode = sortMode === 'custom' && currentTab === 'incomplete' && !isSelecting && (tasks?.length || 0) > 1;
  
  
  // Remove excessive debug logging
  
  const isFolderDraggable = sortMode === 'custom' && currentTab === 'incomplete' && !isSelecting && totalFolders > 1 && folderName !== noFolderName && isTaskReorderMode;


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



  // フォールバック用の通常TaskItem
  const renderRegularTaskItem = useCallback(({ item, index }: { item: DisplayableTaskItem, index: number }) => {
    return (
      <TaskItem
        key={item.keyId}
        task={item}
        onToggle={onToggleTaskDone}
        isSelecting={isSelecting}
        selectedIds={selectedIds}
        onLongPressSelect={(id) => onLongPressSelect('task', id)}
        currentTab={currentTab}
        isInsideFolder={true}
        isLastItem={index === tasks.length - 1}
        isDraggable={false}
      />
    );
  }, [tasks.length, onToggleTaskDone, isSelecting, selectedIds, onLongPressSelect, currentTab]);

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
          {isDraggableMode ? (
            // 🔥 Skia Canvas GPU描画モード（完全カスタム実装）
            <SkiaTaskCanvas
              tasks={tasks}
              onTaskReorder={(from, to) => {
                // 親への通知
                onTaskReorder?.(from, to);
              }}
              onToggleTaskDone={onToggleTaskDone}
              onTaskPress={(taskId) => {
                // Safe navigation to task detail
                try {
                  require('expo-router').router.push(`/task-detail/${taskId}`);
                } catch (error) {
                  console.error('Navigation error:', error);
                }
              }}
              selectedIds={selectedIds}
              isSelecting={isSelecting}
              onLongPressSelect={onLongPressSelect}
              currentTab={currentTab}
              canvasHeight={Math.max(300, tasks.length * 60)} // 動的高さ計算 (60px task height, very tight spacing)
              isInsideFolder={true} // フォルダ内レイアウト指定
            />
          ) : (
            // 通常モード（期限順ソートまたはドラッグ無効時）
            (tasks || []).map((item, index) => renderRegularTaskItem({ item, index }))
          )}
        </View>
      )}

      {/* GPU-optimized empty state */}
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