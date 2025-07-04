// app/features/tasks/hooks/useTasksScreenLogic.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, Dimensions, Platform, ScrollView, InteractionManager } from 'react-native';
import { getItem, setItem } from '@/lib/Storage';
import TasksDatabase from '@/lib/TaskDatabase';
import dayjs from 'dayjs';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import PagerView, { type PagerViewOnPageSelectedEvent, type PagerViewOnPageScrollEvent } from 'react-native-pager-view';
import { Animated } from 'react-native';
import { useSharedValue, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { shallow } from 'zustand/shallow';

import type { Task, FolderOrder, SelectableItem, DisplayTaskOriginal, DisplayableTaskItem } from '@/features/tasks/types';
import { calculateNextDisplayInstanceDate, calculateActualDueDate } from '@/features/tasks/utils';
import { useSelection } from '@/features/tasks/context';
import { STORAGE_KEY, FOLDER_ORDER_KEY, SELECTION_BAR_HEIGHT, FOLDER_TABS_CONTAINER_PADDING_HORIZONTAL, TAB_MARGIN_RIGHT } from '@/features/tasks/constants';
import i18n from '@/lib/i18n';
import { useTaskStore } from '@/stores/taskStore';

const windowWidth = Dimensions.get('window').width;

export type SortMode = 'deadline' | 'custom';
export type ActiveTab = 'incomplete' | 'completed';
export type FolderTab = { name: string; label: string };
export type FolderTabLayout = { x: number; width: number; index: number };

// ★ REMOVED: MemoizedPageData type no longer needed with optimized architecture

export const useTasksScreenLogic = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const selectionHook = useSelection();

  // ✅ 最小限の状態のみ取得（無限ループ回避のため）
  const loading = useTaskStore(state => state.loading);
  const tasks = useTaskStore(state => state.tasks);
  
  // ✅ 基本状態を段階的に復元
  const folderOrder = useTaskStore(state => state.folderOrder);
  const isTaskReorderMode = useTaskStore(state => state.isTaskReorderMode);
  const sortMode = useTaskStore(state => state.sortMode);
  const activeTab = useTaskStore(state => state.activeTab);
  const isDataInitialized = useTaskStore(state => state.isDataInitialized);
  const isRefreshing = useTaskStore(state => state.isRefreshing);
  const baseProcessedTasks = useTaskStore(state => state.baseProcessedTasks);
  
  // ✅ 複雑な状態を段階的に復元
  const pendingTasksByFolder = useTaskStore(state => state.pendingTasksByFolder);
  const hasChangesByFolder = useTaskStore(state => state.hasChangesByFolder);
  const isScrollEnabled = useTaskStore(state => state.isScrollEnabled);

  // ✅ 基本アクション関数を段階的に復元
  const setTasks = useTaskStore(state => state.setTasks);
  const setFolderOrder = useTaskStore(state => state.setFolderOrder);
  const setActiveTab = useTaskStore(state => state.setActiveTab);
  const setSortMode = useTaskStore(state => state.setSortMode);
  const loadData = useTaskStore(state => state.loadData);
  const toggleTaskDone = useTaskStore(state => state.toggleTaskDone);
  
  // ✅ 複雑なアクションを段階的に復元
  const setIsTaskReorderMode = useTaskStore(state => state.setIsTaskReorderMode);
  const setLoading = useTaskStore(state => state.setLoading);
  const setIsDataInitialized = useTaskStore(state => state.setIsDataInitialized);
  const setIsRefreshing = useTaskStore(state => state.setIsRefreshing);
  const syncTasksToDatabase = useTaskStore(state => state.syncTasksToDatabase);
  const storeHandleLongPressStart = useTaskStore(state => state.handleLongPressStart);
  const storeHandleDragUpdate = useTaskStore(state => state.handleDragUpdate);
  const storeHandleDragEnd = useTaskStore(state => state.handleDragEnd);
  const handleTaskReorderConfirm = useTaskStore(state => state.handleTaskReorderConfirm);
  const handleTaskReorderCancel = useTaskStore(state => state.handleTaskReorderCancel);

  // ✅ Shared Valuesを更新するラッパー関数（アニメーション復活）
  const handleLongPressStart = useCallback((itemId: string, folderName: string) => {
    // Shared Valuesを更新してアニメーションを有効化
    isDragMode.value = true;
    draggedItemId.value = itemId;
    draggedItemFolderName.value = folderName;
    scrollEnabled.value = false;
    
    // ストアの処理を実行
    storeHandleLongPressStart(itemId, folderName);
  }, [isDragMode, draggedItemId, draggedItemFolderName, scrollEnabled, storeHandleLongPressStart]);

  const handleDragUpdate = useCallback((translationY: number, itemId: string, folderName: string) => {
    // Shared Valuesを更新
    draggedItemY.value = translationY;
    
    // ドラッグターゲットインデックスを計算
    const itemHeight = 80;
    const moveDistance = Math.round(translationY / itemHeight);
    const currentPendingTasks = pendingTasksByFolder.get(folderName);
    if (currentPendingTasks) {
      const originalIndex = currentPendingTasks.findIndex(task => task.keyId === itemId);
      if (originalIndex !== -1) {
        draggedItemOriginalIndex.value = originalIndex;
        const newTargetIndex = Math.max(0, Math.min(currentPendingTasks.length - 1, originalIndex + moveDistance));
        dragTargetIndex.value = newTargetIndex;
      }
    }
    
    // ストアの処理を実行
    storeHandleDragUpdate(translationY, itemId, folderName);
  }, [draggedItemY, dragTargetIndex, draggedItemOriginalIndex, pendingTasksByFolder, storeHandleDragUpdate]);

  const handleDragEnd = useCallback((fromIndex: number, translationY: number, itemId: string, folderName: string) => {
    // アニメーションをリセット
    isDragMode.value = false;
    draggedItemId.value = '';
    draggedItemY.value = 0;
    draggedItemFolderName.value = '';
    scrollEnabled.value = true;
    dragTargetIndex.value = -1;
    draggedItemOriginalIndex.value = -1;
    
    // ストアの処理を実行
    storeHandleDragEnd(fromIndex, translationY, itemId, folderName);
  }, [isDragMode, draggedItemId, draggedItemY, draggedItemFolderName, scrollEnabled, dragTargetIndex, draggedItemOriginalIndex, storeHandleDragEnd]);

  // ✅ ローカル状態のみを管理（UIに特化した状態）
  const [selectedFolderTabName, setSelectedFolderTabName] = useState<string>('all');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggingFolder, setDraggingFolder] = useState<string | null>(null);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);

  // ===== DRAG & DROP STATE MANAGEMENT =====
  // ✅ Shared valuesはuseTasksScreenLogicで管理（アニメーション用）
  const isDragMode = useSharedValue(false);
  const draggedItemId = useSharedValue<string>('');
  const draggedItemY = useSharedValue(0);
  const scrollEnabled = useSharedValue(true);
  const dragTargetIndex = useSharedValue(-1);
  const draggedItemOriginalIndex = useSharedValue(-1);
  const draggedItemFolderName = useSharedValue<string>(''); // Track which folder is being dragged

  const selectionAnim = useRef(new Animated.Value(SELECTION_BAR_HEIGHT)).current;
  const pagerRef = useRef<PagerView>(null);
  const folderTabsScrollViewRef = useRef<ScrollView>(null);
  const [folderTabLayouts, setFolderTabLayouts] = useState<Record<number, FolderTabLayout>>({});
  
  // ★ ちらつきの原因となっていた currentContentPage を廃止し、新しい確定状態を導入
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  // ✅ アクセントラインアニメーション用のAnimated.Value
  const pageScrollPosition = useRef(new Animated.Value(0)).current;

  const noFolderName = useMemo(() => t('common.no_folder_name', 'フォルダなし'), [t]);

  // ✅ setIsScrollEnabled は存在しないため削除

  // React.useRefを使って循環参照を断ち切る
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  // ✅ folderTabs を段階的に復元（循環参照を避けつつ）
  const folderTabs: FolderTab[] = useMemo(() => {
    // 基本的な「すべて」タブ
    const tabs: FolderTab[] = [{ name: 'all', label: t('folder_tabs.all', 'すべて') }];
    
    // baseProcessedTasks が利用可能な場合のみフォルダを検出
    if (baseProcessedTasks.length > 0) {
      const uniqueFolderNames = new Set<string>();
      
      // タスクからフォルダ名を収集
      baseProcessedTasks.forEach(task => {
        const folderName = task.folder || noFolderName;
        uniqueFolderNames.add(folderName);
      });
      
      // フォルダ順序に基づいてソート
      const sortedFolderNames = Array.from(uniqueFolderNames).sort((a, b) => {
        const aIndex = folderOrder.findIndex(name => name === a);
        const bIndex = folderOrder.findIndex(name => name === b);
        
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });
      
      // フォルダタブを追加
      sortedFolderNames.forEach(folderName => {
        tabs.push({ name: folderName, label: folderName });
      });
    }
    
    return tabs;
  }, [baseProcessedTasks, folderOrder, noFolderName, t]);

  // ✅ loadDataを復元（依存配列から除外して安全化）
  useFocusEffect(
    useCallback(() => {
      const langForDayjs = i18n.language.split('-')[0];
      if (dayjs.Ls[langForDayjs]) { dayjs.locale(langForDayjs); } else { dayjs.locale('en'); }
      loadData();
    }, [i18n.language])
  );

  // ✅ 基本的なタブ同期を復元（循環参照を避けつつ）
  useEffect(() => {
    if (selectedFolderTabName === 'all') {
      const newIndex = 0;
      if (selectedTabIndex !== newIndex) {
        setSelectedTabIndex(newIndex);
        pagerRef.current?.setPageWithoutAnimation(newIndex);
        setPageScrollPosition(newIndex);
      }
    }
  }, [selectedFolderTabName, activeTab, selectedTabIndex]);


  const scrollFolderTabsToCenter = useCallback((pageIndex: number) => {
    const tabInfo = folderTabLayouts[pageIndex];
    if (tabInfo && folderTabsScrollViewRef.current && windowWidth > 0 && folderTabs.length > 0 && pageIndex < folderTabs.length) {
        const screenCenter = windowWidth / 2;
        let targetScrollXForTabs = tabInfo.x + tabInfo.width / 2 - screenCenter;
        targetScrollXForTabs = Math.max(0, targetScrollXForTabs);

        let totalFolderTabsContentWidth = 0;
        folderTabs.forEach((_ft, idx) => {
            const layout = folderTabLayouts[idx];
            if (layout) {
                totalFolderTabsContentWidth += layout.width;
                if (idx < folderTabs.length - 1) {
                    totalFolderTabsContentWidth += TAB_MARGIN_RIGHT;
                }
            }
        });
        totalFolderTabsContentWidth += FOLDER_TABS_CONTAINER_PADDING_HORIZONTAL * 2;
        const maxScrollX = Math.max(0, totalFolderTabsContentWidth - windowWidth);
        targetScrollXForTabs = Math.min(targetScrollXForTabs, maxScrollX);

        folderTabsScrollViewRef.current.scrollTo({ x: targetScrollXForTabs, animated: true });
    }
  }, [folderTabLayouts, folderTabs]);

  useEffect(() => {
    Animated.timing(selectionAnim, {
      toValue: selectionHook.isSelecting ? 0 : SELECTION_BAR_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [selectionHook.isSelecting, selectionAnim]);

  // Auto-exit task reorder mode when switching tabs or changing from custom sort
  useEffect(() => {
    if (isTaskReorderMode && (activeTab !== 'incomplete' || sortMode !== 'custom')) {
      setIsTaskReorderMode(false);
    }
  }, [activeTab, sortMode, isTaskReorderMode]);

  // ★ 循環参照の原因となるuseEffectを削除
  // useEffect(() => {
  //   ...フォルダタブスクロール処理...
  // }, [selectedTabIndex, folderTabLayouts, windowWidth, folderOrderString, activeTab]);


  // ✅ syncTasksToDatabase はストアから取得するため削除

  const saveFolderOrderToStorage = useCallback(async (orderToSave: FolderOrder) => {
    try {
      await setItem(FOLDER_ORDER_KEY, JSON.stringify(orderToSave));
    } catch (e) {
      console.error('Failed to save folder order to storage:', e);
    }
  }, []);

  // フォルダ別のベースオーダーを計算する関数
  const getBaseOrderForFolder = useCallback((folderName: string): number => {
    const folderIndex = folderOrder.findIndex(name => name === folderName);
    // 存在しないフォルダには一意のベースオーダーを生成
    return folderIndex >= 0 ? folderIndex * 1000 : (folderOrder.length * 1000) + (folderName.length * 100);
  }, [folderOrder]);

  // ✅ toggleTaskDone はストアから取得するため削除

  const moveFolderOrder = useCallback(async (folderName: string, direction: 'up' | 'down') => {
    const idx = folderOrder.indexOf(folderName);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= folderOrder.length) return;

    const newOrder = [...folderOrder];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    setFolderOrder(newOrder);
    await saveFolderOrderToStorage(newOrder);
  }, [folderOrder]);

  const onLongPressSelectItem = useCallback((type: 'task' | 'folder', id: string) => {
    // 長押し処理を無効化
  }, []);

  const cancelSelectionMode = useCallback(() => {
    selectionHook.clearSelection();
    // Also exit task reorder mode when canceling selection mode
    if (isTaskReorderMode) {
      setIsTaskReorderMode(false);
    }
  }, [selectionHook, isTaskReorderMode]);

  const stopReordering = useCallback(() => {
      setIsReordering(false);
      setDraggingFolder(null);
  }, []);

  const toggleTaskReorderMode = useCallback(() => {
    setIsTaskReorderMode(!isTaskReorderMode);
    if (isTaskReorderMode) {
      // 並べ替えモード終了時に選択モードもクリア
      selectionHook.clearSelection();
    }
  }, [isTaskReorderMode, selectionHook]);

  // ✅ baseProcessedTasksはストアから取得するため、ここでの計算は不要

  // ★ PERFORMANCE OPTIMIZATION: memoizedPagesData removed
  // Data processing now handled individually by each TaskFolder component

  // ★ タブタップ時の処理を修正
  const handleFolderTabPress = useCallback((_folderName: string, index: number) => {
    if (selectedTabIndex !== index) {
      // 確定状態を更新
      setSelectedTabIndex(index);
      // PagerView をプログラムで操作
      pagerRef.current?.setPage(index);
      // ✅ アクセントラインアニメーション復活: Animated.Valueを更新
      pageScrollPosition.setValue(index);
    }
  }, [selectedTabIndex]);

  const handlePageScroll = useCallback((event: PagerViewOnPageScrollEvent) => {
    // ✅ アクセントラインアニメーション復活: Animated.Valueを更新
    const scrollValue = event.nativeEvent.position + event.nativeEvent.offset;
    pageScrollPosition.setValue(scrollValue);
  }, [pageScrollPosition]);

  // ★ ページ切り替え完了時の処理を修正
  const handlePageSelected = useCallback((event: PagerViewOnPageSelectedEvent) => {
    const newPageIndex = event.nativeEvent.position;
    
    // 確定状態とUIを同期
    if (selectedTabIndex !== newPageIndex) {
      setSelectedTabIndex(newPageIndex);
    }
    
    // 現在のタブを中央にスクロール - 直接実装で循環参照を回避
    const tabInfo = folderTabLayouts[newPageIndex];
    if (tabInfo && folderTabsScrollViewRef.current && windowWidth > 0 && folderTabs.length > 0 && newPageIndex < folderTabs.length) {
        const screenCenter = windowWidth / 2;
        let targetScrollXForTabs = tabInfo.x + tabInfo.width / 2 - screenCenter;
        targetScrollXForTabs = Math.max(0, targetScrollXForTabs);

        let totalFolderTabsContentWidth = 0;
        folderTabs.forEach((_ft, idx) => {
            const layout = folderTabLayouts[idx];
            if (layout) {
                totalFolderTabsContentWidth += layout.width;
                if (idx < folderTabs.length - 1) {
                    totalFolderTabsContentWidth += TAB_MARGIN_RIGHT;
                }
            }
        });
        totalFolderTabsContentWidth += FOLDER_TABS_CONTAINER_PADDING_HORIZONTAL * 2;
        const maxScrollX = Math.max(0, totalFolderTabsContentWidth - windowWidth);
        targetScrollXForTabs = Math.min(targetScrollXForTabs, maxScrollX);

        folderTabsScrollViewRef.current.scrollTo({ x: targetScrollXForTabs, animated: true });
    }

    // フォルダ名などの関連情報を更新
    if (newPageIndex >= 0 && newPageIndex < folderTabs.length) {
      const newSelectedFolder = folderTabs[newPageIndex].name;
      setSelectedFolderTabName(newSelectedFolder);
      selectionHook.clearSelection();
    }
  }, [folderTabs, selectedTabIndex, selectionHook, folderTabLayouts, windowWidth]);

  const handleSelectAll = useCallback(() => {
    // 循環参照を避けるため、直接計算
    const activeFolderTabName = folderTabs[selectedTabIndex]?.name || 'all';
    
    // 基本的な処理済みタスクを取得
    let filteredTasks = baseProcessedTasks;
    if (activeFolderTabName !== 'all') {
        filteredTasks = filteredTasks.filter(task => (task.folder || noFolderName) === activeFolderTabName);
    }

    const itemsToSelect: SelectableItem[] = [];

    // タスクを選択対象に追加
    filteredTasks.forEach(task => {
        if (activeTab === 'completed') {
            if (task.isTaskFullyCompleted && !task.deadlineDetails?.repeatFrequency) {
                itemsToSelect.push({ type: 'task', id: task.id });
            } else if (task.deadlineDetails?.repeatFrequency && task.completedInstanceDates) {
                task.completedInstanceDates.forEach(instanceDate => {
                    itemsToSelect.push({ type: 'task', id: `${task.id}-${instanceDate}` });
                });
            }
        } else {
            // 未完了タスクの場合
            if (!task.isTaskFullyCompleted) {
                itemsToSelect.push({ type: 'task', id: task.id });
            }
        }
    });
    
    // フォルダを選択対象に追加
    if (activeFolderTabName === 'all') {
        const allFolderNames = Array.from(new Set(filteredTasks.map(t => t.folder || noFolderName)));
        allFolderNames.forEach(folderName => {
            if (folderName !== noFolderName) {
                itemsToSelect.push({ type: 'folder', id: folderName });
            }
        });
    } else if (activeFolderTabName !== noFolderName) {
        itemsToSelect.push({ type: 'folder', id: activeFolderTabName });
    }

    selectionHook.setAllItems(itemsToSelect);
  }, [selectionHook, folderTabs, selectedTabIndex, baseProcessedTasks, noFolderName, activeTab]);

  const confirmDelete = useCallback(async (mode: 'delete_all' | 'only_folder' | 'delete_tasks_only') => {
    let finalTasks = [...tasks];
    let finalFolderOrder = [...folderOrder];
    const folderBeingDeleted = selectionHook.selectedItems.find(item => item.type === 'folder')?.id;
    const selectedTaskRootIds = new Set<string>();
    const selectedTaskInstances = new Map<string, Set<string>>();

    selectionHook.selectedItems.forEach(item => {
        if (item.type === 'task') {
            const parts = item.id.split('-');
            selectedTaskRootIds.add(parts[0]);
            if (parts.length > 1) {
                if (!selectedTaskInstances.has(parts[0])) {
                    selectedTaskInstances.set(parts[0], new Set());
                }
                selectedTaskInstances.get(parts[0])!.add(item.id);
            }
        }
    });

    if (mode === 'delete_all' && folderBeingDeleted) {
        finalTasks = tasks.filter(task => {
            const taskFolder = task.folder || noFolderName;
            if (taskFolder === folderBeingDeleted) return false;
            return !selectedTaskRootIds.has(task.id);
        });
        finalFolderOrder = folderOrder.filter(name => name !== folderBeingDeleted);
    } else if (mode === 'only_folder' && folderBeingDeleted) {
        finalTasks = tasks.map(task => {
            if ((task.folder || noFolderName) === folderBeingDeleted) {
                return { ...task, folder: undefined };
            }
            return task;
        });
        finalTasks = finalTasks.filter(task => {
            if (selectedTaskRootIds.has(task.id)) {
                if (task.deadlineDetails?.repeatFrequency && selectedTaskInstances.has(task.id)) {
                    return true;
                }
                return false;
            }
            return true;
        });
        finalFolderOrder = folderOrder.filter(name => name !== folderBeingDeleted);
    } else {
         finalTasks = tasks.filter(task => {
            if (selectedTaskRootIds.has(task.id)) {
                if (task.deadlineDetails?.repeatFrequency && selectedTaskInstances.has(task.id) && (selectedTaskInstances.get(task.id)?.size || 0) > 0) {
                    return true;
                }
                return false;
            }
            return true;
         });
    }

    finalTasks = finalTasks.map(task => {
        if (task.deadlineDetails?.repeatFrequency && selectedTaskInstances.has(task.id) && task.completedInstanceDates) {
            const instancesToDeleteForThisTask = selectedTaskInstances.get(task.id)!;
            const datesToDelete = new Set<string>();
            instancesToDeleteForThisTask.forEach(instanceKeyId => {
                const datePart = instanceKeyId.substring(task.id.length + 1);
                datesToDelete.add(datePart);
            });

            if (datesToDelete.size > 0) {
                const newCompletedDates = task.completedInstanceDates.filter(date => !datesToDelete.has(date));
                return { ...task, completedInstanceDates: newCompletedDates };
            }
        }
        return task;
    });


    setTasks(finalTasks);
    const folderOrderActuallyChanged = JSON.stringify(folderOrder) !== JSON.stringify(finalFolderOrder);
    if (folderOrderActuallyChanged) {
      setFolderOrder(finalFolderOrder);
    }

    await syncTasksToDatabase(tasks, finalTasks);
    if (folderOrderActuallyChanged) {
      await saveFolderOrderToStorage(finalFolderOrder);
    }

    selectionHook.clearSelection();
  }, [tasks, folderOrder, selectionHook, noFolderName]);

  const handleDeleteSelected = useCallback(() => {
    const folderToDelete = selectionHook.selectedItems.find(item => item.type === 'folder');
    const selectedTasksCount = selectionHook.selectedItems.filter(i => i.type === 'task').length;

    if (folderToDelete && folderToDelete.id !== noFolderName) {
        let title = t('task_list.delete_folder_title', { folderName: folderToDelete.id });
        if (selectedTasksCount > 0) {
            title = t('task_list.delete_folder_and_selected_tasks_title', {folderName: folderToDelete.id, count: selectedTasksCount});
        }

        Alert.alert(
            title,
            t('task_list.delete_folder_confirmation'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('task_list.delete_folder_and_tasks'), onPress: () => confirmDelete('delete_all'), style: 'destructive' },
                { text: t('task_list.delete_folder_only'), onPress: () => confirmDelete('only_folder') }
            ],
            { cancelable: true }
        );
    } else if (selectedTasksCount > 0) {
         Alert.alert(
            t('task_list.delete_tasks_title', {count: selectedTasksCount}),
            t('task_list.delete_tasks_confirmation', {count: selectedTasksCount}),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.delete'), onPress: () => confirmDelete('delete_tasks_only'), style: 'destructive' }
            ],
            {cancelable: true}
        );
    }
  }, [selectionHook, noFolderName, t, confirmDelete]);

  const handleRenameFolderSubmit = useCallback(async (newName: string) => {
    if (!renameTarget || newName.trim() === renameTarget) {
      setRenameModalVisible(false);
      setRenameTarget(null);
      selectionHook.clearSelection();
      return;
    }
    const trimmedNewName = newName.trim();

    const newTasks = tasks.map(task => {
      if ((task.folder || noFolderName) === renameTarget) {
        return { ...task, folder: trimmedNewName === noFolderName ? undefined : trimmedNewName };
      }
      return task;
    });
    const newFolderOrder = folderOrder.map(name => (name === renameTarget ? trimmedNewName : name));

    setTasks(newTasks);
    setFolderOrder(newFolderOrder);

    await syncTasksToDatabase(tasks, newTasks);
    await saveFolderOrderToStorage(newFolderOrder);
    
    const oldSelectedFolderTabName = selectedFolderTabName;

    setRenameModalVisible(false);
    setRenameTarget(null);
    selectionHook.clearSelection();

    if (oldSelectedFolderTabName === renameTarget) {
        setSelectedFolderTabName(trimmedNewName);
    }
  }, [tasks, folderOrder, renameTarget, noFolderName, selectionHook, selectedFolderTabName]);

  const handleReorderSelectedFolder = useCallback(() => {
    if (selectionHook.selectedItems.length === 1 && selectionHook.selectedItems[0].type === 'folder' && selectionHook.selectedItems[0].id !== noFolderName) {
      setIsReordering(true);
      setDraggingFolder(selectionHook.selectedItems[0].id);
      selectionHook.clearSelection();
    }
  }, [selectionHook, noFolderName]);

  const openRenameModalForSelectedFolder = useCallback(() => {
    if (selectionHook.selectedItems.length === 1 && selectionHook.selectedItems[0].type === 'folder' && selectionHook.selectedItems[0].id !== noFolderName) {
      setRenameTarget(selectionHook.selectedItems[0].id);
      setRenameModalVisible(true);
    }
  }, [selectionHook, noFolderName]);

  // フォルダ削除時のcustomOrderクリーンアップ
  const cleanupCustomOrdersForDeletedFolder = useCallback(async (deletedFolderName: string) => {
    const updatedTasks = tasks.map(task => {
      if ((task.folder || noFolderName) === deletedFolderName) {
        // 削除されたフォルダのタスクからcustomOrderを削除
        const { customOrder, ...taskWithoutOrder } = task;
        return taskWithoutOrder as Task;
      }
      return task;
    });

    if (updatedTasks.some((task, index) => task !== tasks[index])) {
      setTasks(updatedTasks);
      await syncTasksToDatabase(tasks, updatedTasks);
      // Performance: Removed console.log
    }
  }, [tasks, noFolderName]);

  // フォルダリネーム時のcustomOrder更新
  const updateCustomOrdersForRenamedFolder = useCallback(async (oldFolderName: string, newFolderName: string) => {
    const newBaseOrder = getBaseOrderForFolder(newFolderName);
    const folderTasks = tasks.filter(task => (task.folder || noFolderName) === oldFolderName);
    
    if (folderTasks.length === 0) return;

    const updatedTasks = tasks.map(task => {
      if ((task.folder || noFolderName) === oldFolderName) {
        const taskIndex = folderTasks.findIndex(t => t.id === task.id);
        return { 
          ...task, 
          folder: newFolderName === noFolderName ? undefined : newFolderName,
          customOrder: newBaseOrder + (taskIndex * 10)
        };
      }
      return task;
    });

    setTasks(updatedTasks);
    await syncTasksToDatabase(tasks, updatedTasks);
    // Performance: Removed console.log
  }, [tasks, noFolderName, getBaseOrderForFolder]);

  // CustomOrderのクリーンアップと正規化（tasksを依存から除外してループを防ぐ）
  const normalizeCustomOrdersRef = useRef<(currentTasks: Task[]) => Promise<void>>(undefined);
  
  const normalizeCustomOrders = useCallback(async (currentTasks: Task[]) => {
    const updatedTasks = [...currentTasks];
    let hasChanges = false;

    // フォルダごとにcustomOrderを正規化
    const folderGroups = new Map<string, Task[]>();
    
    currentTasks.forEach(task => {
      const folderName = task.folder || noFolderName;
      if (!folderGroups.has(folderName)) {
        folderGroups.set(folderName, []);
      }
      folderGroups.get(folderName)!.push(task);
    });

    folderGroups.forEach((folderTasks, folderName) => {
      const baseOrder = getBaseOrderForFolder(folderName);
      
      // customOrderでソートしてインデックスを再割り当て
      const sortedTasks = folderTasks
        .sort((a, b) => (a.customOrder ?? Infinity) - (b.customOrder ?? Infinity))
        .map((task, index) => {
          const newCustomOrder = baseOrder + (index * 10);
          if (task.customOrder !== newCustomOrder) {
            hasChanges = true;
            return { ...task, customOrder: newCustomOrder };
          }
          return task;
        });

      // 更新されたタスクを反映
      sortedTasks.forEach(updatedTask => {
        const taskIndex = updatedTasks.findIndex(t => t.id === updatedTask.id);
        if (taskIndex >= 0) {
          updatedTasks[taskIndex] = updatedTask;
        }
      });
    });

    if (hasChanges) {
      setTasks(updatedTasks);
      await syncTasksToDatabase(currentTasks, updatedTasks);
      // Performance: Removed console.log
    }
  }, [folderOrder, noFolderName, getBaseOrderForFolder]);

  // Assign to ref for use in useEffect
  normalizeCustomOrdersRef.current = normalizeCustomOrders;

  // sortMode変更時とアプリ起動時にcustomOrderを正規化（1回のみ実行）
  const normalizeTriggeredRef = useRef(false);
  
  useEffect(() => {
    if (tasks.length > 0 && sortMode === 'custom' && !normalizeTriggeredRef.current) {
      normalizeTriggeredRef.current = true;
      normalizeCustomOrdersRef.current?.(tasks);
    }
    
    // sortModeが変更された場合はフラグをリセット
    return () => {
      if (sortMode !== 'custom') {
        normalizeTriggeredRef.current = false;
      }
    };
  }, [sortMode, tasks.length]); // tasksの長さのみを監視

  // 並び替え操作のロック管理（Promise-based lock）
  const reorderLockRef = useRef<Promise<void> | null>(null);

  const handleTaskReorder = useCallback(async (folderName: string, fromIndex: number, toIndex: number) => {
    // Performance: Removed console.log
    
    if (fromIndex === toIndex) {
      // Performance: Removed console.log
      return;
    }

    // 並び替え操作のロック（前の操作が完了するまで待機）
    if (reorderLockRef.current) {
      // Performance: Removed console.warn
      try {
        await reorderLockRef.current;
      } catch (error) {
        console.error('🔥 Previous reorder operation failed:', error);
      }
    }

    // 新しいロックを設定
    let resolveLock: () => void;
    reorderLockRef.current = new Promise(resolve => { resolveLock = resolve; });

    try {
      // 現在のソートモードがcustomでない場合は何もしない
      if (sortMode !== 'custom') {
        console.warn('Task reordering is only available in custom sort mode');
        return;
      }

      // 🔥 Step 1: バックアップ作成（エラー時復元用）
      const backupTasks = [...tasks];

      // 最新のtasksを取得（stale closureを防ぐ）
      const currentTasks = tasks;

      // 対象フォルダのタスクを取得（customOrderでソート済み）
      const targetFolderTasks = currentTasks
        .filter(task => (task.folder || noFolderName) === folderName)
        .sort((a, b) => (a.customOrder ?? Infinity) - (b.customOrder ?? Infinity));
    
      if (fromIndex < 0 || fromIndex >= targetFolderTasks.length || 
          toIndex < 0 || toIndex >= targetFolderTasks.length) {
        console.error('Invalid indices:', { fromIndex, toIndex, length: targetFolderTasks.length });
        return;
      }

      // 新しいタスク配列を作成
      const newTargetTasks = [...targetFolderTasks];
      
      // タスクを移動
      const [movedTask] = newTargetTasks.splice(fromIndex, 1);
      newTargetTasks.splice(toIndex, 0, movedTask);

      // フォルダ固有のcustomOrderを更新（1000の倍数ベースで間隔を開ける）
      const baseOrder = getBaseOrderForFolder(folderName);
      const optimisticTasks = currentTasks.map(task => {
        if ((task.folder || noFolderName) === folderName) {
          const newIndex = newTargetTasks.findIndex(t => t.id === task.id);
          if (newIndex !== -1) {
            return { ...task, customOrder: baseOrder + (newIndex * 10) };
          }
        }
        return task;
      });

      // 🔥 Step 2: 楽観的更新（即座にUI反映）
      setTasks(optimisticTasks);

      // 🔥 Step 3: 成功処理（触覚フィードバック廃止）

      // 🔥 Step 4: データベース同期（バックグラウンド）
      try {
        // Performance: Removed console.log
        await syncTasksToDatabase(currentTasks, optimisticTasks);
        // Performance: Removed console.log
        
        // Auto-exit task reorder mode after successful reorder
        setTimeout(() => {
          setIsTaskReorderMode(false);
        }, 1500);
        
      } catch (dbError) {
        console.error('❌ データベース同期失敗:', dbError);
        
        // 🔥 Step 5: エラー時ロールバック（確実な復元）
        setTasks(backupTasks);
        
        // エラー触覚フィードバック
        // エラー処理（触覚フィードバック廃止）
        
        throw dbError;
      }
      
    } catch (error) {
      console.error('Error during task reordering:', error);
      throw error;
    } finally {
      // ロックを解除
      resolveLock!();
      reorderLockRef.current = null;
    }
  }, [tasks, noFolderName, sortMode, getBaseOrderForFolder]);

  // Wrapper for the new drag and drop system
  const createTaskReorderHandler = useCallback((folderName: string) => {
    return async (fromIndex: number, toIndex: number) => {
      await handleTaskReorder(folderName, fromIndex, toIndex);
    };
  }, [handleTaskReorder]);

  const handleFolderReorder = useCallback(async (folderName: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const newFolderOrder = [...folderOrder];
    
    // フォルダオーダーから現在のフォルダを削除
    const currentFolderIndex = newFolderOrder.indexOf(folderName);
    if (currentFolderIndex !== -1) {
      newFolderOrder.splice(currentFolderIndex, 1);
    }
    
    // 新しい位置に挿入
    newFolderOrder.splice(toIndex, 0, folderName);

    setFolderOrder(newFolderOrder);
    await saveFolderOrderToStorage(newFolderOrder);
  }, [folderOrder]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await TasksDatabase.initialize();
      const rawTasksData = await TasksDatabase.getAllTasks();
      setTasks(rawTasksData.map(t => JSON.parse(t)));

      const rawOrderData = await getItem(FOLDER_ORDER_KEY);
      setFolderOrder(rawOrderData ? JSON.parse(rawOrderData) : []);
    } catch (e) {
      console.error('Failed to refresh data:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // ===== CENTRALIZED DRAG & DROP HANDLERS =====
  
  // ✅ ユーティリティ関数は必要に応じてローカルで保持（ストアにないもののみ）
  const getPendingTasksForFolder = useCallback((folderName: string): DisplayableTaskItem[] => {
    const currentPending = pendingTasksByFolder.get(folderName);
    if (currentPending) {
      return currentPending;
    }
    // Fallback to filtering baseProcessedTasks for this folder
    return baseProcessedTasks
      .filter(task => (task.folder || noFolderName) === folderName)
      .filter(task => activeTab === 'completed' ? task.isTaskFullyCompleted : !task.isTaskFullyCompleted)
      .map(task => ({ ...task, keyId: task.id }));
  }, [pendingTasksByFolder, baseProcessedTasks, noFolderName, activeTab]);

  // ✅ updatePendingTasks と clearDragState はストアで管理されているため削除

  // ✅ handleLongPressStart はストアから取得するため削除

  // ✅ handleDragUpdate はストアから取得するため削除

  // ✅ handleDragEnd はストアから取得するため削除

  // ✅ handleTaskReorderConfirm はストアから取得するため削除

  // ✅ handleTaskReorderCancel はストアから取得するため削除

  // Check if any folder has changes
  const hasAnyChanges = useMemo(() => {
    return Array.from(hasChangesByFolder.values()).some(Boolean);
  }, [hasChangesByFolder]);

  return {
    // ✅ ストアから取得した状態
    tasks, folderOrder, loading, activeTab, sortMode, isTaskReorderMode, isRefreshing,
    baseProcessedTasks,
    pendingTasksByFolder, hasChangesByFolder, isScrollEnabled,
    
    // ✅ ローカルUI状態
    selectedFolderTabName, sortModalVisible, isReordering, draggingFolder, 
    renameModalVisible, renameTarget,
    selectionAnim, folderTabLayouts, selectedTabIndex,
    pageScrollPosition,
    
    // ✅ 計算値
    noFolderName, folderTabs, hasAnyChanges,
    
    // ✅ refs
    pagerRef, folderTabsScrollViewRef,
    
    // ✅ 選択状態（context）
    isSelecting: selectionHook.isSelecting,
    selectedItems: selectionHook.selectedItems,
    
    // ✅ ストアから取得したアクション
    setActiveTab, setSortMode, setIsTaskReorderMode,
    toggleTaskDone,
    
    // ✅ ストアから取得したドラッグ＆ドロップハンドラー
    handleLongPressStart,
    handleDragUpdate,
    handleDragEnd,
    handleTaskReorderConfirm,
    handleTaskReorderCancel,
    
    // ✅ ローカルUI状態セッター
    setSelectedFolderTabName, setSortModalVisible,
    setIsReordering, setDraggingFolder, setRenameModalVisible, setRenameTarget,
    setFolderTabLayouts,
    
    // ✅ ローカルハンドラー（UI特化）
    moveFolderOrder, stopReordering,
    onLongPressSelectItem, cancelSelectionMode,
    handleFolderTabPress, handlePageSelected, handlePageScroll,
    handleSelectAll, handleDeleteSelected, confirmDelete,
    handleRenameFolderSubmit, handleReorderSelectedFolder, openRenameModalForSelectedFolder,
    handleTaskReorder, createTaskReorderHandler, handleFolderReorder, handleRefresh,
    
    // ✅ フォルダ操作用のクリーンアップ関数
    cleanupCustomOrdersForDeletedFolder,
    updateCustomOrdersForRenamedFolder,
    
    // ✅ Shared Values（workletで使用）
    isDragMode, draggedItemId, draggedItemY, scrollEnabled,
    dragTargetIndex, draggedItemOriginalIndex, draggedItemFolderName,
    
    // ✅ ユーティリティ
    getPendingTasksForFolder,
    
    // ✅ その他
    router, t,
  };
};