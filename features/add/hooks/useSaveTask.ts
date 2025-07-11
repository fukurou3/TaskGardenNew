// app/features/add/hooks/useSaveTask.ts
import { useCallback } from 'react';
import { Alert } from 'react-native';
import TasksDatabase from '@/lib/TaskDatabase';
import { getItem, setItem } from '@/lib/Storage';
import uuid from 'react-native-uuid';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { Task, Draft } from '../types';
import { STORAGE_KEY, DRAFTS_KEY } from '../constants';
import type { DeadlineSettings, DeadlineTime } from '../components/DeadlineSettingModal/types';

dayjs.extend(utc);

interface SaveTaskParams {
  title: string;
  memo: string;
  imageUris: string[];
  notifyEnabled: boolean;
  customUnit?: 'minutes' | 'hours' | 'days';
  customAmount?: number;
  folder: string;
  currentDraftId: string | null;
  clearForm: () => void;
  t: (key: string, options?: any) => string;
  deadlineDetails?: DeadlineSettings;
}

const dateStringToUTCDate = (dateStr: string, time?: DeadlineTime): dayjs.Dayjs => {
    if (time) {
        // 時刻が指定されている場合、ローカルの日付と時刻で dayjs オブジェクトを生成し、それをUTCに変換
        const localDateTimeString = `${dateStr} ${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
        // dayjs(string) はローカルタイムゾーンとして解釈される
        return dayjs(localDateTimeString).utc();
    } else {
        // 時刻が指定されていない場合、日付文字列をUTCのその日の開始時刻 (00:00:00Z) として解釈
        // dayjs.utc(string) は文字列をUTCとして解釈する
        return dayjs.utc(dateStr).startOf('day');
    }
};

const dateToUTCISOString = (dateObj: dayjs.Dayjs, includeTime: boolean = true): string => {
    if (includeTime) {
        return dateObj.toISOString(); // 例: "2023-05-25T10:00:00.000Z"
    }
    // 時刻を含めない場合、YYYY-MM-DD形式 (UTC基準の日付)
    return dateObj.format('YYYY-MM-DD');
};

const formatTaskDeadlineISO = (settings?: DeadlineSettings): string | undefined => {
  if (!settings) return undefined;

  if (settings.repeatFrequency && settings.repeatStartDate) {
    // 繰り返し設定の場合、時刻は含めず日付のみとする (UTCの0時基準の日付)
    const firstInstanceStartDate = dateStringToUTCDate(settings.repeatStartDate); // timeなしで呼び出し
    return dateToUTCISOString(firstInstanceStartDate, false); // YYYY-MM-DD
  } else if (settings.taskDeadlineDate) { // 単発タスク
    if (settings.isTaskDeadlineTimeEnabled && settings.taskDeadlineTime) {
      // 時刻設定ありの場合
      const deadlineDate = dateStringToUTCDate(settings.taskDeadlineDate, settings.taskDeadlineTime);
      return dateToUTCISOString(deadlineDate, true); // ISO文字列 (時刻あり)
    }
    // 時刻設定なしの場合 (UTCの0時基準の日付)
    const deadlineDate = dateStringToUTCDate(settings.taskDeadlineDate); // timeなしで呼び出し
    return dateToUTCISOString(deadlineDate, true); // ISO文字列 (時刻あり、00:00:00Z)
                                                      // もし時刻なし (YYYY-MM-DD) で保存したい場合は第二引数を false にするが、
                                                      // DBや他機能との一貫性のため、時刻ありのISO文字列で統一する方が無難な場合もある
                                                      // ここでは、時刻設定なしの場合も便宜上00:00:00Zを含むISO文字列で返す
  }
  return undefined;
};


export const useSaveTask = ({
  title,
  memo,
  imageUris,
  notifyEnabled,
  customUnit,
  customAmount,
  folder,
  currentDraftId,
  clearForm,
  t,
  deadlineDetails,
}: SaveTaskParams) => {
  const router = useRouter();

  // 新規タスク用のcustomOrderを計算（簡易版）
  const calculateNextCustomOrder = useCallback(async (targetFolder: string | undefined) => {
    try {
      // 既存タスクとフォルダオーダーを取得
      const tasks = await TasksDatabase.getAllTasks() as Task[];
      const folderOrderData = await getItem('@folderOrder');
      const folderOrder = folderOrderData ? JSON.parse(folderOrderData) : [];
      const noFolderName = 'フォルダなし';
      
      const folderName = targetFolder || noFolderName;
      const folderIndex = folderOrder.findIndex((name: string) => name === folderName);
      const baseOrder = folderIndex >= 0 ? folderIndex * 1000 : (folderOrder.length * 1000) + (folderName.length * 100);
      
      // 同じフォルダの既存タスクの最大customOrderを取得
      const folderTasks = tasks.filter(task => (task.folder || noFolderName) === folderName);
      const maxCustomOrder = folderTasks.reduce((max, task) => {
        const order = task.customOrder ?? (baseOrder - 10);
        return Math.max(max, order);
      }, baseOrder - 10);
      
      return maxCustomOrder + 10;
    } catch (error) {
      console.error('Failed to calculate customOrder:', error);
      // エラー時はデフォルト値を返す
      return 0;
    }
  }, []);

  const saveTask = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert(t('add_task.alert_no_title'));
      return;
    }
    const taskId = uuid.v4() as string;
    const taskDeadlineValue = formatTaskDeadlineISO(deadlineDetails);

    let finalDeadlineDetails = deadlineDetails;
    if (finalDeadlineDetails?.repeatFrequency) {
        finalDeadlineDetails = {
            ...finalDeadlineDetails,
            // isTaskStartTimeEnabled: false, // 廃止済み
            // taskStartTime: undefined, // 廃止済み
        };
    }

    const newTask: Task = {
      id: taskId,
      title: title.trim(),
      memo,
      deadline: taskDeadlineValue,
      imageUris,
      notifyEnabled,
      customUnit: notifyEnabled ? customUnit : 'hours',
      customAmount: notifyEnabled ? customAmount : 1,
      folder,
      deadlineDetails: finalDeadlineDetails,
      completedInstanceDates: [],
      completedAt: undefined,
      customOrder: await calculateNextCustomOrder(folder),
    };

    try {
      await TasksDatabase.saveTask(newTask as any);
      Toast.show({ type: 'success', text1: t('add_task.task_added_successfully', 'タスクを追加しました') });
      clearForm();
      router.replace('/(tabs)/tasks');
    } catch (error) {
      console.error("Failed to save task:", error);
      Toast.show({ type: 'error', text1: t('add_task.error_saving_task', 'タスクの保存に失敗しました') });
    }
  }, [
    title,
    memo,
    imageUris,
    notifyEnabled,
    customUnit,
    customAmount,
    folder,
    clearForm,
    router,
    t,
    deadlineDetails,
  ]);

  const saveDraft = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert(t('add_task.alert_no_title'));
      return;
    }
    const id = currentDraftId || (uuid.v4() as string);
    const draftDeadlineValue = formatTaskDeadlineISO(deadlineDetails);

    let finalDeadlineDetails = deadlineDetails;
    if (finalDeadlineDetails?.repeatFrequency) {
        finalDeadlineDetails = {
            ...finalDeadlineDetails,
            // isTaskStartTimeEnabled: false, // 廃止済み
            // taskStartTime: undefined, // 廃止済み
        };
    }

    const draftTask: Draft = {
      id,
      title: title.trim(),
      memo,
      deadline: draftDeadlineValue,
      imageUris,
      notifyEnabled,
      customUnit: notifyEnabled ? customUnit : 'hours',
      customAmount: notifyEnabled ? customAmount : 1,
      folder,
      deadlineDetails: finalDeadlineDetails,
      completedInstanceDates: deadlineDetails?.repeatFrequency ? [] : undefined,
      completedAt: undefined,
    };
    try {
      const raw = await getItem(DRAFTS_KEY);
      const drafts: Draft[] = raw ? JSON.parse(raw) : [];
      const newDrafts = drafts.filter(d => d.id !== id);
      newDrafts.push(draftTask);
      await setItem(
        DRAFTS_KEY,
        JSON.stringify(newDrafts)
      );
      Toast.show({
        type: 'success',
        text1: t('add_task.draft_saved_successfully', '下書きを保存しました'),
      });
      clearForm();
    } catch (error) {
      console.error("Failed to save draft:", error);
      Toast.show({ type: 'error', text1: t('add_task.error_saving_draft', '下書きの保存に失敗しました') });
    }
  }, [
    title,
    memo,
    imageUris,
    notifyEnabled,
    customUnit,
    customAmount,
    folder,
    currentDraftId,
    clearForm,
    t,
    deadlineDetails,
  ]);

  return { saveTask, saveDraft };
};