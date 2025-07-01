// app/features/tasks/TasksScreen.tsx
import React, { useContext, useState, useCallback } from 'react';
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
    memoizedPagesData,
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


  const handleSortOptionSelect = (newSortMode: SortMode) => {
    setSortMode(newSortMode);
    setSortModalVisible(false);
  };
  
  // 並べ替えモード状態変更ハンドラー
  const handleReorderModeChange = useCallback((
    isReorderMode: boolean, 
    hasChanges: boolean, 
    onConfirm: () => void, 
    onCancel: () => void
  ) => {
    setTaskReorderState(prev => ({
      ...prev,
      hasChanges,
      onConfirm,
      onCancel,
    }));
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
          toggleTaskDone={toggleTaskDone}
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
          memoizedPagesData={memoizedPagesData}
          sortMode={sortMode}
          isTaskReorderMode={taskReorderState.isReorderMode}
          onTaskReorder={logic.createTaskReorderHandler}
          onChangeSortMode={setSortMode}
          onReorderModeChange={handleReorderModeChange}
          folderOrder={folderOrder}
        />
      )}

      {!isReordering && !taskReorderState.isReorderMode && (
        <TouchableOpacity
          style={[styles.fab, { bottom: Platform.OS === 'ios' ? 16 : 16 }]}
          onPress={() => router.push('/add/')}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}


      {/* Task Reorder Mode Buttons - 画面下部中央に独立配置 */}
      {taskReorderState.isReorderMode && (
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
              taskReorderState.onCancel?.();
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
              backgroundColor: taskReorderState.hasChanges ? subColor : (isDark ? '#48484A' : '#E5E5EA'),
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
              opacity: taskReorderState.hasChanges ? 1 : 0.6,
            }}
            onPress={() => {
              taskReorderState.onConfirm?.();
            }}
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
        <BlurView intensity={isDark ? 20 : 70} tint={isDark ? 'dark' : 'light'} style={styles.modalBlur}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSortModalVisible(false)} />
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, {width: '80%', maxWidth: 300}]}>
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
               <View style={{height: StyleSheet.hairlineWidth, backgroundColor: isDark? '#444': '#DDD'}}/>
              <TouchableOpacity onPress={() => handleSortOptionSelect('priority')} activeOpacity={0.7}>
                <Text style={[styles.modalOption, {color: sortMode === 'priority' ? subColor : (isDark ? '#E0E0E0' : '#222222'), fontWeight: sortMode === 'priority' ? '600' : '400'}]}>
                  優先順
                </Text>
              </TouchableOpacity>
              <View style={{height: StyleSheet.hairlineWidth, backgroundColor: isDark? '#444': '#DDD', marginTop: 10, marginBottom: 0 }}/>
              <TouchableOpacity onPress={() => setSortModalVisible(false)} style={{ marginTop: 0 }} activeOpacity={0.7}>
                <Text style={[styles.modalOption, {color: isDark ? '#CCCCCC' : '#555555', fontSize: appFontSizes[fontSizeKey]}]}>
                  キャンセル
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}