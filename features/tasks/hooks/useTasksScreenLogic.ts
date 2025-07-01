// app/features/tasks/hooks/useTasksScreenLogic.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, Dimensions, Platform, ScrollView } from 'react-native';
import { getItem, setItem } from '@/lib/Storage';
import TasksDatabase from '@/lib/TaskDatabase';
import dayjs from 'dayjs';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import PagerView, { type PagerViewOnPageSelectedEvent, type PagerViewOnPageScrollEvent } from 'react-native-pager-view';
import { Animated } from 'react-native';

import type { Task, FolderOrder, SelectableItem, DisplayTaskOriginal, DisplayableTaskItem } from '@/features/tasks/types';
import { calculateNextDisplayInstanceDate, calculateActualDueDate } from '@/features/tasks/utils';
import { useSelection } from '@/features/tasks/context';
import { STORAGE_KEY, FOLDER_ORDER_KEY, SELECTION_BAR_HEIGHT, FOLDER_TABS_CONTAINER_PADDING_HORIZONTAL, TAB_MARGIN_RIGHT } from '@/features/tasks/constants';
import i18n from '@/lib/i18n';

const windowWidth = Dimensions.get('window').width;

export type SortMode = 'deadline' | 'custom';
export type ActiveTab = 'incomplete' | 'completed';
export type FolderTab = { name: string; label: string };
export type FolderTabLayout = { x: number; width: number; index: number };

export type MemoizedPageData = {
  foldersToRender: string[];
  tasksByFolder: Map<string, DisplayableTaskItem[]>;
  allTasksForPage: DisplayableTaskItem[];
};

export const useTasksScreenLogic = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const selectionHook = useSelection();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [folderOrder, setFolderOrder] = useState<FolderOrder>([]);
  const [loading, setLoading] = useState(true);
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('incomplete');
  const [selectedFolderTabName, setSelectedFolderTabName] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('deadline');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggingFolder, setDraggingFolder] = useState<string | null>(null);
  const [isTaskReorderMode, setIsTaskReorderMode] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);

  const selectionAnim = useRef(new Animated.Value(SELECTION_BAR_HEIGHT)).current;
  const pagerRef = useRef<PagerView>(null);
  const folderTabsScrollViewRef = useRef<ScrollView>(null);
  const [folderTabLayouts, setFolderTabLayouts] = useState<Record<number, FolderTabLayout>>({});
  
  // ★ ちらつきの原因となっていた currentContentPage を廃止し、新しい確定状態を導入
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  const [pageScrollPosition, setPageScrollPosition] = useState(0);

  const noFolderName = useMemo(() => t('common.no_folder_name', 'フォルダなし'), [t]);

  // React.useRefを使って循環参照を断ち切る
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  // 循環参照を避けるため、useRefと安定した依存配列を使用
  const folderOrderString = useMemo(() => folderOrder.join(','), [folderOrder]);
  const folderTabs: FolderTab[] = useMemo(() => {
    const currentTasks = tasksRef.current;
    const tabsArr: FolderTab[] = [{ name: 'all', label: t('folder_tabs.all', 'すべて') }];
    const uniqueFoldersFromTasks = Array.from(new Set(currentTasks.map(task => task.folder || noFolderName)));

    if (activeTab === 'completed') {
        const foldersWithCompletedTasks = new Set(
            currentTasks.filter(t => t.completedAt || (t.completedInstanceDates && t.completedInstanceDates.length > 0))
                 .map(t => t.folder || noFolderName)
        );
        
        // フォルダなしを「すべて」の直後に追加
        if (foldersWithCompletedTasks.has(noFolderName)) {
            tabsArr.push({ name: noFolderName, label: noFolderName });
        }
        
        folderOrder.forEach(folderName => {
            if (foldersWithCompletedTasks.has(folderName) && folderName !== noFolderName) {
                tabsArr.push({ name: folderName, label: folderName });
            }
        });
        const remainingFolders = [...foldersWithCompletedTasks].filter(name => !folderOrder.includes(name) && name !== noFolderName).sort();
        remainingFolders.forEach(folderName => {
             tabsArr.push({ name: folderName, label: folderName });
        });
    } else {
        const allFolders = new Set([...folderOrder, ...uniqueFoldersFromTasks]);
        
        // フォルダなしを「すべて」の直後に追加
        if (allFolders.has(noFolderName)) {
            tabsArr.push({ name: noFolderName, label: noFolderName });
        }
        
        const orderedFolders = folderOrder.filter(name => allFolders.has(name) && name !== noFolderName);
        const unorderedFolders = [...allFolders].filter(name => !folderOrder.includes(name) && name !== noFolderName).sort();

        [...orderedFolders, ...unorderedFolders].forEach(folderName => {
            if (!tabsArr.some(tab => tab.name === folderName)) {
                tabsArr.push({ name: folderName, label: folderName });
            }
        });
    }
    return tabsArr;
  }, [tasks.length, folderOrderString, noFolderName, t, activeTab]);

  useFocusEffect(
    useCallback(() => {
      const langForDayjs = i18n.language.split('-')[0];
      if (dayjs.Ls[langForDayjs]) { dayjs.locale(langForDayjs); } else { dayjs.locale('en'); }

      const loadData = async () => {
        if (!isDataInitialized) {
          setLoading(true);
        }
        try {
          const [taskRows, rawOrderData] = await Promise.all([
            TasksDatabase.getAllTasks(),
            getItem(FOLDER_ORDER_KEY),
          ]);
          setTasks(taskRows.map(t => JSON.parse(t)));
          setFolderOrder(rawOrderData ? JSON.parse(rawOrderData) : []);
        } catch (e) {
          console.error('Failed to load data from storage on focus:', e);
          setTasks([]);
          setFolderOrder([]);
        } finally {
          if (!isDataInitialized) {
            setLoading(false);
            setIsDataInitialized(true);
          }
        }
      };

      loadData();
    }, [i18n.language, isDataInitialized])
  );

  // ★ フォルダタブリストの変更（例：未完了/完了の切替）時に、ページャーの位置を同期させる
  // 循環参照を避けるため、folderTabsの代わりにfolderOrderStringとactiveTabを使用
  useEffect(() => {
    const targetIndex = folderTabs.findIndex(
      (ft) => ft.name === selectedFolderTabName
    );
    const newIndex = targetIndex !== -1 ? targetIndex : 0;

    if (selectedTabIndex !== newIndex) {
      setSelectedTabIndex(newIndex);
      // フォルダタブリストが変化したときのみページャーを同期させる
      pagerRef.current?.setPageWithoutAnimation(newIndex);
      setPageScrollPosition(newIndex);
    }
  }, [folderOrderString, selectedFolderTabName, activeTab, tasks.length]);


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

  // ★ 依存配列を新しい確定状態 selectedTabIndex に変更 - 循環参照回避
  useEffect(() => {
    const tabInfo = folderTabLayouts[selectedTabIndex];
    const currentFolderTabs = folderTabs; // 現在のfolderTabsを取得
    if (tabInfo && folderTabsScrollViewRef.current && windowWidth > 0 && currentFolderTabs.length > 0 && selectedTabIndex < currentFolderTabs.length) {
        const screenCenter = windowWidth / 2;
        let targetScrollXForTabs = tabInfo.x + tabInfo.width / 2 - screenCenter;
        targetScrollXForTabs = Math.max(0, targetScrollXForTabs);

        let totalFolderTabsContentWidth = 0;
        currentFolderTabs.forEach((_ft, idx) => {
            const layout = folderTabLayouts[idx];
            if (layout) {
                totalFolderTabsContentWidth += layout.width;
                if (idx < currentFolderTabs.length - 1) {
                    totalFolderTabsContentWidth += TAB_MARGIN_RIGHT;
                }
            }
        });
        totalFolderTabsContentWidth += FOLDER_TABS_CONTAINER_PADDING_HORIZONTAL * 2;
        const maxScrollX = Math.max(0, totalFolderTabsContentWidth - windowWidth);
        targetScrollXForTabs = Math.min(targetScrollXForTabs, maxScrollX);

        folderTabsScrollViewRef.current.scrollTo({ x: targetScrollXForTabs, animated: true });
    }
  }, [selectedTabIndex, folderTabLayouts, windowWidth, folderOrderString, activeTab]);


  const syncTasksToDatabase = async (prevTasks: Task[], newTasks: Task[]) => {
    try {
      const prevIds = new Set(prevTasks.map(t => t.id));
      const newIds = new Set(newTasks.map(t => t.id));
      for (const task of newTasks) {
        await TasksDatabase.saveTask(task as any);
      }
      for (const id of prevIds) {
        if (!newIds.has(id)) {
          await TasksDatabase.deleteTask(id);
        }
      }
    } catch (e) {
      console.error('Failed to sync tasks with DB:', e);
    }
  };

  const saveFolderOrderToStorage = async (orderToSave: FolderOrder) => {
    try {
      await setItem(FOLDER_ORDER_KEY, JSON.stringify(orderToSave));
    } catch (e) {
      console.error('Failed to save folder order to storage:', e);
    }
  };

  // フォルダ別のベースオーダーを計算する関数
  const getBaseOrderForFolder = useCallback((folderName: string): number => {
    const folderIndex = folderOrder.findIndex(name => name === folderName);
    // 存在しないフォルダには一意のベースオーダーを生成
    return folderIndex >= 0 ? folderIndex * 1000 : (folderOrder.length * 1000) + (folderName.length * 100);
  }, [folderOrder]);

  const toggleTaskDone = useCallback(async (id: string, instanceDateStr?: string) => {
    const newTasks = tasks.map(task => {
      if (task.id === id) {
        if (task.deadlineDetails?.repeatFrequency) {
          let newCompletedDates = task.completedInstanceDates ? [...task.completedInstanceDates] : [];
          if (instanceDateStr) {
            const exists = newCompletedDates.includes(instanceDateStr);
            if (exists) {
              newCompletedDates = newCompletedDates.filter(d => d !== instanceDateStr);
            } else {
              newCompletedDates.push(instanceDateStr);
            }
          }
          return { ...task, completedInstanceDates: newCompletedDates };
        } else {
          const wasCompleted = !!task.completedAt;
          const updatedTask = { 
            ...task, 
            completedAt: wasCompleted ? undefined : dayjs.utc().toISOString() 
          };
          
          // customOrder管理: 完了状態変更時の処理
          if (sortMode === 'custom') {
            if (!wasCompleted) {
              // 未完了→完了: customOrderを削除
              const { customOrder, ...taskWithoutOrder } = updatedTask;
              return taskWithoutOrder as Task;
            } else {
              // 完了→未完了: 新しいcustomOrderを割り当て
              const folderName = task.folder || noFolderName;
              // 循環参照を避けるため、ここで直接計算
              const folderIndex = folderOrder.indexOf(folderName);
              const baseOrder = folderIndex >= 0 ? folderIndex * 1000 : (folderOrder.length * 1000) + (folderName.length * 100);
              const folderTasks = tasks.filter(t => 
                (t.folder || noFolderName) === folderName && 
                !t.completedAt && 
                t.id !== id
              );
              const maxCustomOrder = folderTasks.reduce((max, t) => {
                const order = t.customOrder ?? (baseOrder - 10);
                return Math.max(max, order);
              }, baseOrder - 10);
              
              return { ...updatedTask, customOrder: maxCustomOrder + 10 };
            }
          }
          
          return updatedTask;
        }
      }
      return task;
    });
    setTasks(newTasks);
    await syncTasksToDatabase(tasks, newTasks);
  }, [tasks, sortMode, noFolderName, folderOrder]);

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

  // 安定した依存配列のための計算値
  const tasksStabilityKeys = useMemo(() => ({
    length: tasks.length,
    ids: tasks.map(t => t.id).join(','),
    completed: tasks.map(t => t.completedAt || '').join(','),
    customOrders: tasks.map(t => t.customOrder || '').join(',')
  }), [tasks]);

  const baseProcessedTasks: DisplayTaskOriginal[] = useMemo(() => {
    return tasksRef.current.map(task => {
      const displayDateUtc = task.deadlineDetails?.repeatFrequency && task.deadlineDetails.repeatStartDate
        ? calculateNextDisplayInstanceDate(task)
        : calculateActualDueDate(task);
      let isTaskFullyCompleted = false;
      if (task.deadlineDetails?.repeatFrequency) {
        const nextInstanceIsNull = displayDateUtc === null;
        let repeatEndsPassed = false;
        const repeatEnds = task.deadlineDetails.repeatEnds;
        if (repeatEnds) {
          switch (repeatEnds.type) {
            case 'on_date': if (typeof repeatEnds.date === 'string') { repeatEndsPassed = dayjs.utc(repeatEnds.date).endOf('day').isBefore(dayjs().utc()); } break;
            case 'count': if (typeof repeatEnds.count === 'number') { if ((task.completedInstanceDates?.length || 0) >= repeatEnds.count) { repeatEndsPassed = true; } } break;
          }
        }
        isTaskFullyCompleted = nextInstanceIsNull || repeatEndsPassed;
      } else { isTaskFullyCompleted = !!task.completedAt; }
      return { ...task, displaySortDate: displayDateUtc, isTaskFullyCompleted };
    });
  }, [tasksStabilityKeys.length, tasksStabilityKeys.ids, tasksStabilityKeys.completed, tasksStabilityKeys.customOrders]);

  const memoizedPagesData = useMemo<Map<string, MemoizedPageData>>(() => {
    const pagesData = new Map<string, MemoizedPageData>();

    const getTasksToDisplayForPage = (pageFolderName: string): DisplayableTaskItem[] => {
        let filteredTasks = baseProcessedTasks;
        if (pageFolderName !== 'all') {
            filteredTasks = filteredTasks.filter(task => (task.folder || noFolderName) === pageFolderName);
        }

        if (activeTab === 'completed') {
            const completedDisplayItems: DisplayableTaskItem[] = [];
            filteredTasks.forEach(task => {
                if (task.isTaskFullyCompleted && !task.deadlineDetails?.repeatFrequency) {
                    completedDisplayItems.push({ ...task, keyId: task.id, displaySortDate: task.completedAt ? dayjs.utc(task.completedAt) : null });
                } else if (task.deadlineDetails?.repeatFrequency && task.completedInstanceDates && task.completedInstanceDates.length > 0) {
                    task.completedInstanceDates.forEach(instanceDate => {
                        completedDisplayItems.push({ ...task, keyId: `${task.id}-${instanceDate}`, displaySortDate: dayjs.utc(instanceDate), isCompletedInstance: true, instanceDate: instanceDate });
                    });
                }
            });
            return completedDisplayItems.sort((a, b) => (b.displaySortDate?.unix() || 0) - (a.displaySortDate?.unix() || 0));
        } else {
            const todayStartOfDayUtc = dayjs.utc().startOf('day');
            return filteredTasks
                .filter(task => {
                    if (task.isTaskFullyCompleted) return false;
                    if ((task.deadlineDetails as any)?.isPeriodSettingEnabled && (task.deadlineDetails as any)?.periodStartDate) {
                        const periodStartDateUtc = dayjs.utc((task.deadlineDetails as any).periodStartDate).startOf('day');
                        if (periodStartDateUtc.isAfter(todayStartOfDayUtc)) return false;
                    }
                    return true;
                })
                .map(task => ({ ...task, keyId: task.id }));
        }
    };
    
    folderTabs.forEach(tab => {
        const pageFolderName = tab.name;
        const tasksForPage = getTasksToDisplayForPage(pageFolderName);
        let foldersToRenderOnThisPage: string[];
        if (pageFolderName === 'all') {
            const allFolderNamesInTasksOnPage = Array.from(new Set(tasksForPage.map(t => t.folder || noFolderName)));
            const combinedFolders = new Set([...folderOrder, ...allFolderNamesInTasksOnPage]);
            const ordered = folderOrder.filter(name => combinedFolders.has(name) && name !== noFolderName);
            const unordered = [...combinedFolders].filter(name => !ordered.includes(name) && name !== noFolderName && name !== 'all').sort((a, b) => a.localeCompare(b));
            
            foldersToRenderOnThisPage = [...ordered, ...unordered];
            
            if (combinedFolders.has(noFolderName) && tasksForPage.some(t => (t.folder || noFolderName) === noFolderName)) {
                foldersToRenderOnThisPage.push(noFolderName);
            }
        } else {
            foldersToRenderOnThisPage = [pageFolderName];
        }

        const tasksByFolder = new Map<string, DisplayableTaskItem[]>();

        foldersToRenderOnThisPage.forEach(folderName => {
            const tasksInThisFolder = tasksForPage.filter(t => (t.folder || noFolderName) === folderName);
            if (activeTab === 'completed' && tasksInThisFolder.length === 0) {
                return;
            }

            // パフォーマンス最適化: ソート前に長さをチェック
            if (tasksInThisFolder.length === 0) {
                return;
            }
            if (tasksInThisFolder.length === 1) {
                tasksByFolder.set(folderName, tasksInThisFolder);
                return;
            }

            // 最適化されたソート処理
            const sortedFolderTasks = tasksInThisFolder.sort((a, b) => {
                if (activeTab === 'incomplete' && sortMode === 'deadline') {
                  const today = dayjs.utc().startOf('day');
                  const getCategory = (task: DisplayableTaskItem): number => {
                    const date = task.displaySortDate;
                    if (!date) return 3;
                    if (date.isBefore(today, 'day')) return 0;
                    if (date.isSame(today, 'day')) return 1;
                    return 2;
                  };
                  const categoryA = getCategory(a);
                  const categoryB = getCategory(b);
                  if (categoryA !== categoryB) return categoryA - categoryB;
                  if (categoryA === 3) return a.title.localeCompare(b.title);
                  const dateAVal = a.displaySortDate!;
                  const dateBVal = b.displaySortDate!;
                  if (dateAVal.isSame(dateBVal, 'day')) {
                      const timeEnabledA = a.deadlineDetails?.isTaskDeadlineTimeEnabled === true && !a.deadlineDetails?.repeatFrequency;
                      const timeEnabledB = b.deadlineDetails?.isTaskDeadlineTimeEnabled === true && !b.deadlineDetails?.repeatFrequency;
                      if (timeEnabledA && !timeEnabledB) return -1;
                      if (!timeEnabledA && timeEnabledB) return 1;
                  }
                  return dateAVal.unix() - dateBVal.unix();
                }

                if (sortMode === 'custom' && activeTab === 'incomplete') {
                    const folderA = a.folder || noFolderName;
                    const folderB = b.folder || noFolderName;
                    
                    // 同じフォルダ内でのcustomOrder比較
                    if (folderA === folderB) {
                        const orderA = a.customOrder ?? Infinity;
                        const orderB = b.customOrder ?? Infinity;
                        if (orderA !== orderB) {
                            if (orderA === Infinity) return 1;
                            if (orderB === Infinity) return -1;
                            return orderA - orderB;
                        }
                        // customOrderが同じ場合はタイトルでソート
                        return a.title.localeCompare(b.title);
                    }
                }
                return a.title.localeCompare(b.title);
            });
            if (sortedFolderTasks.length > 0) {
                tasksByFolder.set(folderName, sortedFolderTasks);
            }
        });

        if (activeTab === 'completed') {
            foldersToRenderOnThisPage = foldersToRenderOnThisPage.filter(name => tasksByFolder.has(name));
        }

        pagesData.set(pageFolderName, {
            foldersToRender: foldersToRenderOnThisPage,
            tasksByFolder,
            allTasksForPage: tasksForPage,
        });
    });

    return pagesData;
  }, [baseProcessedTasks, activeTab, sortMode, folderOrder, noFolderName, folderTabs]);

  // ★ タブタップ時の処理を修正
  const handleFolderTabPress = useCallback((_folderName: string, index: number) => {
    if (selectedTabIndex !== index) {
      // 確定状態を更新
      setSelectedTabIndex(index);
      // PagerView をプログラムで操作
      pagerRef.current?.setPage(index);
      // アニメーション値を更新して、UIの追従を即座に開始させる（ちらつき防止）
      setPageScrollPosition(index); // Simplified without animation
    }
  }, [selectedTabIndex]);

  const handlePageScroll = useCallback((event: PagerViewOnPageScrollEvent) => {
    // PagerViewのスクロールに追従してアニメーション値を更新
    setPageScrollPosition(event.nativeEvent.position + event.nativeEvent.offset);
  }, []);

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
      console.log('CustomOrders cleaned up for deleted folder:', deletedFolderName);
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
    console.log('CustomOrders updated for renamed folder:', { oldFolderName, newFolderName });
  }, [tasks, noFolderName, getBaseOrderForFolder]);

  // CustomOrderのクリーンアップと正規化（tasksを依存から除外してループを防ぐ）
  const normalizeCustomOrdersRef = useRef<(currentTasks: Task[]) => Promise<void>>();
  
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
      console.log('CustomOrders normalized');
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
    if (fromIndex === toIndex) return;

    // 並び替え操作のロック（前の操作が完了するまで待機）
    if (reorderLockRef.current) {
      console.warn('Reorder operation already in progress, waiting...');
      try {
        await reorderLockRef.current;
      } catch (error) {
        console.error('Previous reorder operation failed:', error);
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
        await syncTasksToDatabase(currentTasks, optimisticTasks);
        
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
  }, [tasks, noFolderName, sortMode, getBaseOrderForFolder, setTasks, setIsTaskReorderMode]);

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

  return {
    tasks, folderOrder, loading, activeTab, selectedFolderTabName, sortMode, sortModalVisible,
    isReordering, draggingFolder, isTaskReorderMode, renameModalVisible, renameTarget,
    selectionAnim, folderTabLayouts, selectedTabIndex, // ★ currentContentPage の代わりに selectedTabIndex を返す
    pageScrollPosition,
    noFolderName, folderTabs,
    pagerRef, folderTabsScrollViewRef,
    isSelecting: selectionHook.isSelecting,
    selectedItems: selectionHook.selectedItems,
    isRefreshing,
    memoizedPagesData,
    setActiveTab, setSelectedFolderTabName, setSortMode, setSortModalVisible,
    setIsReordering, setDraggingFolder, setRenameModalVisible, setRenameTarget,
    setFolderTabLayouts,
    toggleTaskDone,
    moveFolderOrder, stopReordering, toggleTaskReorderMode, setIsTaskReorderMode,
    onLongPressSelectItem, cancelSelectionMode,
    handleFolderTabPress, handlePageSelected, handlePageScroll,
    handleSelectAll, handleDeleteSelected, confirmDelete,

    handleRenameFolderSubmit, handleReorderSelectedFolder, openRenameModalForSelectedFolder,
    handleTaskReorder,
    createTaskReorderHandler,
    handleFolderReorder,
    handleRefresh,
    // フォルダ操作用のクリーンアップ関数を公開
    cleanupCustomOrdersForDeletedFolder,
    updateCustomOrdersForRenamedFolder,
    router, t,
  };
};