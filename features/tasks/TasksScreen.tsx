// app/features/tasks/TasksScreen.tsx
import React, { useContext, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { useAppTheme } from '@/hooks/ThemeContext';
import { FontSizeContext } from '@/context/FontSizeContext';
import { fontSizes as appFontSizes } from '@/constants/fontSizes';
import { createStyles } from '@/features/tasks/styles';
import { RenameFolderModal } from '@/features/tasks/components/RenameFolderModal';
import { useTasksScreenLogic, type SortMode } from './hooks/useTasksScreenLogic';
import { FolderTabsBar } from './components/FolderTabsBar';
import { TaskViewPager } from './components/TaskViewPager';

export default function TasksScreen() {
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const { fontSizeKey } = useContext(FontSizeContext);
  const styles = createStyles(isDark, subColor, fontSizeKey);
  
  // 並べ替えモード用の状態
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


  const logic = useTasksScreenLogic();
  const {
    loading, activeTab, sortMode, sortModalVisible,
    isReordering,
    selectionAnim,
    folderTabLayouts, selectedTabIndex, // ★ currentContentPage の代わりに selectedTabIndex を使用
    pageScrollPosition,
    noFolderName, folderTabs,
    pagerRef, folderTabsScrollViewRef,
    isSelecting, selectedItems,
    setActiveTab, setSortMode, setSortModalVisible,
    setFolderTabLayouts,
    baseProcessedTasks,
    handleFolderTabPress, handlePageSelected, handlePageScroll,
    handleSelectAll, handleDeleteSelected,
    handleRenameFolderSubmit, handleReorderSelectedFolder, openRenameModalForSelectedFolder,
    cancelSelectionMode,
    router, t,
    toggleTaskDone,
    draggingFolder, setDraggingFolder, moveFolderOrder, stopReordering,
    onLongPressSelectItem, folderOrder, setIsTaskReorderMode,
    renameModalVisible, renameTarget, setRenameModalVisible, setRenameTarget,
    tasks,
  } = logic;

  // ✅ パフォーマンス最適化: toggleTaskDone関数をuseCallbackでメモ化
  const memoizedToggleTaskDone = useCallback((id: string, instanceDate?: string) => {
    return toggleTaskDone(id, instanceDate);
  }, [toggleTaskDone]);

  // ✅ Debug: Track reorder mode state (removed for performance)

  // ✅ パフォーマンス最適化: keyIdの追加を最小限に抑制
  const baseProcessedTasksWithKeyId = useMemo(() => {
    // baseProcessedTasksが空の場合は早期リターン
    if (!baseProcessedTasks || baseProcessedTasks.length === 0) {
      return [];
    }
    // 既にkeyIdがある場合はマッピングを避ける
    if (baseProcessedTasks[0] && 'keyId' in baseProcessedTasks[0]) {
      return baseProcessedTasks as (typeof baseProcessedTasks[0] & { keyId: string })[];
    }
    return baseProcessedTasks.map(task => ({ ...task, keyId: task.id }));
  }, [baseProcessedTasks]);


  // ✅ パフォーマンス最適化: handleSortOptionSelectをuseCallbackでメモ化
  const handleSortOptionSelect = useCallback((newSortMode: SortMode) => {
    setSortMode(newSortMode);
    setSortModalVisible(false);
  }, [setSortMode, setSortModalVisible]);
  
  // ✅ 並べ替えモード状態変更ハンドラー（既に最適化済み）
  const handleReorderModeChange = useCallback((
    isReorderMode: boolean, 
    hasChanges: boolean, 
    onConfirm: () => void, 
    onCancel: () => void
  ) => {
    // Performance: Removed console.log
    
    setTaskReorderState(prev => {
      // 同じ状態の場合は更新しない
      if (prev.isReorderMode === isReorderMode && prev.hasChanges === hasChanges) {
        return prev;
      }
      
      const newState = {
        isReorderMode,
        hasChanges,
        onConfirm,
        onCancel,
      };
      // Performance: Removed console.log
      return newState;
    });
  }, []);


  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.appBar}><Text style={styles.title}>TasksScreen</Text></View>

      <FolderTabsBar
        styles={styles}
        subColor={subColor}
        folderTabs={folderTabs}
        folderTabLayouts={folderTabLayouts}
        setFolderTabLayouts={setFolderTabLayouts}
        handleFolderTabPress={handleFolderTabPress}
        pageScrollPosition={pageScrollPosition}
        folderTabsScrollViewRef={folderTabsScrollViewRef}
        selectedTabIndex={selectedTabIndex}
      />

      <View style={styles.topRow}>
        <View style={styles.segmentedControlContainer}>
          <TouchableOpacity
            style={[ styles.segmentedControlButton, activeTab === 'incomplete' && styles.segmentedControlButtonSelected ]}
            onPress={() => { setActiveTab('incomplete'); cancelSelectionMode(); }}
            activeOpacity={0.7}
          >
            <Text style={[ styles.segmentedControlButtonText, activeTab === 'incomplete' && (isDark ? styles.segmentedControlButtonTextSelectedDark : styles.segmentedControlButtonTextSelectedLight) ]}>
              未完了
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[ styles.segmentedControlButton, activeTab === 'completed' && styles.segmentedControlButtonSelected ]}
            onPress={() => { setActiveTab('completed'); cancelSelectionMode(); }}
            activeOpacity={0.7}
          >
            <Text style={[ styles.segmentedControlButtonText, activeTab === 'completed' && (isDark ? styles.segmentedControlButtonTextSelectedDark : styles.segmentedControlButtonTextSelectedLight) ]}>
              完了
            </Text>
          </TouchableOpacity>
        </View>
        {!isSelecting && activeTab === 'incomplete' && (
          <TouchableOpacity style={styles.sortButton} onPress={() => setSortModalVisible(true)} activeOpacity={0.7}>
            <Text style={styles.sortLabel}>
              {sortMode === 'deadline' ? '期限順' : sortMode === 'custom' ? 'カスタム順' : '優先順'}
            </Text>
            <Ionicons name="swap-vertical" size={22} color={subColor} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={subColor} />
      ) : (
        <TaskViewPager
          styles={styles}
          pagerRef={pagerRef}
          folderTabs={folderTabs}
          selectedTabIndex={selectedTabIndex} // ★ プロパティ名を変更
          handlePageSelected={handlePageSelected}
          handlePageScroll={handlePageScroll}
          activeTab={activeTab}
          toggleTaskDone={memoizedToggleTaskDone}
          isReordering={isReordering}
          draggingFolder={draggingFolder}
          setDraggingFolder={setDraggingFolder}
          moveFolderOrder={moveFolderOrder}
          stopReordering={stopReordering}
          isSelecting={isSelecting}
          selectedItems={selectedItems}
          onLongPressSelectItem={onLongPressSelectItem}
          noFolderName={noFolderName}
          t={t}
          baseProcessedTasks={baseProcessedTasksWithKeyId}
          sortMode={sortMode}
          isTaskReorderMode={logic.isTaskReorderMode}
          onTaskReorder={logic.createTaskReorderHandler}
          onChangeSortMode={setSortMode}
          onReorderModeChange={handleReorderModeChange}
          folderOrder={folderOrder}
          
          // ===== CENTRALIZED DRAG & DROP PROPS =====
          pendingTasksByFolder={logic.pendingTasksByFolder}
          hasChangesByFolder={logic.hasChangesByFolder}
          isScrollEnabled={logic.isScrollEnabled}
          onLongPressStart={logic.handleLongPressStart}
          onDragUpdate={logic.handleDragUpdate}
          onDragEnd={logic.handleDragEnd}
          isDragMode={logic.isDragMode}
          draggedItemId={logic.draggedItemId}
          dragTargetIndex={logic.dragTargetIndex}
          draggedItemOriginalIndex={logic.draggedItemOriginalIndex}
          draggedItemFolderName={logic.draggedItemFolderName}
        />
      )}

      {!isReordering && !logic.isTaskReorderMode && (
        <TouchableOpacity
          style={[styles.fab, { bottom: Platform.OS === 'ios' ? 16 : 16 }]}
          onPress={() => router.push('/add/')}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}


      {/* Task Reorder Mode Buttons - 画面下部中央に独立配置 */}
      {logic.isTaskReorderMode && (
        <View style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 34 : 16, // iOSのHome Indicator考慮
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
          gap: 16,
        }}>
          <TouchableOpacity 
            style={{
              backgroundColor: isDark ? '#48484A' : '#E5E5EA',
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 25,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4,
            }}
            onPress={() => {
              logic.handleTaskReorderCancel();
            }}
          >
            <Ionicons name="close" size={20} color={isDark ? '#FFFFFF' : '#000000'} />
            <Text style={{ 
              color: isDark ? '#FFFFFF' : '#000000', 
              fontWeight: '600',
              fontSize: 16,
            }}>
              キャンセル
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{
              backgroundColor: logic.hasAnyChanges ? subColor : (isDark ? '#48484A' : '#E5E5EA'),
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 25,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4,
              opacity: logic.hasAnyChanges ? 1 : 0.6,
            }}
            onPress={() => {
              logic.handleTaskReorderConfirm();
            }}
            disabled={!logic.hasAnyChanges}
          >
            <Ionicons 
              name="checkmark" 
              size={20} 
              color={logic.hasAnyChanges ? '#FFFFFF' : (isDark ? '#8E8E93' : '#C7C7CC')} 
            />
            <Text style={{ 
              color: logic.hasAnyChanges ? '#FFFFFF' : (isDark ? '#8E8E93' : '#C7C7CC'),
              fontWeight: '600',
              fontSize: 16,
            }}>
              完了
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <RenameFolderModal
        visible={renameModalVisible}
        onClose={() => { setRenameModalVisible(false); setRenameTarget(null); cancelSelectionMode(); }}
        initialName={renameTarget || ''}
        onSubmit={handleRenameFolderSubmit}
      />

      <Modal transparent visible={sortModalVisible} animationType="fade" onRequestClose={() => setSortModalVisible(false)}>
        <SafeAreaView style={{ flex: 1 }}>
          <BlurView intensity={isDark ? 20 : 70} tint={isDark ? 'dark' : 'light'} style={styles.modalBlur}>
            <TouchableOpacity style={styles.modalBlur} onPress={() => setSortModalVisible(false)} />
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>並び順を選択</Text>
              <TouchableOpacity onPress={() => handleSortOptionSelect('deadline')} activeOpacity={0.7}>
                <Text style={[styles.modalOption, {color: sortMode === 'deadline' ? subColor : (isDark ? '#E0E0E0' : '#222222'), fontWeight: sortMode === 'deadline' ? '600' : '400'}]}>
                  期限順
                </Text>
              </TouchableOpacity>
              <View style={{height: StyleSheet.hairlineWidth, backgroundColor: isDark? '#444': '#DDD'}}/>
              <TouchableOpacity onPress={() => handleSortOptionSelect('custom')} activeOpacity={0.7}>
                <Text style={[styles.modalOption, {color: sortMode === 'custom' ? subColor : (isDark ? '#E0E0E0' : '#222222'), fontWeight: sortMode === 'custom' ? '600' : '400'}]}>
                  カスタム順
                </Text>
              </TouchableOpacity>
              <View style={{height: StyleSheet.hairlineWidth, backgroundColor: isDark? '#444': '#DDD', marginTop: 10, marginBottom: 0 }}/>
              <TouchableOpacity onPress={() => setSortModalVisible(false)} style={{ marginTop: 0 }} activeOpacity={0.7}>
                <Text style={[styles.modalOption, {color: isDark ? '#CCCCCC' : '#555555', fontSize: appFontSizes[fontSizeKey]}]}>
                  キャンセル
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}