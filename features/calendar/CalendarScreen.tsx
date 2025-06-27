// app/(tabs)/calendar/index.tsx
import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { View, FlatList, Text, ActivityIndicator, Pressable, TouchableOpacity, Platform, useWindowDimensions, Animated } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getItem } from '@/lib/Storage';
import TasksDatabase from '@/lib/TaskDatabase';
import { Gesture, GestureDetector, Directions } from 'react-native-gesture-handler';
// Temporarily disabled reanimated - using React Native Animated API instead
// import Animated, { useSharedValue, withTiming, runOnJS, useAnimatedStyle, Easing } from 'react-native-reanimated';
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { SafeAreaView } from 'react-native-safe-area-context';

import SkiaCalendar from '@/features/calendar/components/SkiaCalendar';
import { BACKGROUND_IMAGES } from '@/constants/CalendarBackgrounds';
import { useAppTheme } from '@/hooks/ThemeContext';
import { useGoogleCalendarSync } from '@/context/GoogleCalendarContext';
import { useGoogleCalendarAllEvents, GoogleEvent } from '@/features/calendar/useGoogleCalendar';
import { useOSCalendarEvents } from '@/features/calendar/useOSCalendarEvents';
import { groupTasksByDate, processMultiDayEvents } from '@/features/calendar/utils';
import type { Task } from '@/features/tasks/types';
import { STORAGE_KEY as TASKS_KEY } from '@/features/tasks/constants';
import { TaskItem } from '@/features/tasks/components/TaskItem';
import { createCalendarStyles } from '@/features/calendar/styles';
import { Ionicons } from '@expo/vector-icons';

const CALENDAR_BG_KEY = '@calendar_background_id';
const WEEKDAY_COLOR = '#1c1c1c';
const SUNDAY_COLOR = '#FF6666';
const SATURDAY_COLOR = '#106ac4';
// 曜日欄の高さに合わせて短くする
const HEADER_HEIGHT = 24;
const FULL_CELL_HEIGHT_FACTOR = 1.9;

export default function CalendarPage() {
  const { t } = useTranslation();
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const styles = createCalendarStyles(isDark, subColor);
  const router = useRouter();

  const { enabled: googleEnabled } = useGoogleCalendarSync();

  const [displayMonth, setDisplayMonth] = useState<dayjs.Dayjs>(() => dayjs());
  const [backgroundImage, setBackgroundImage] = useState<number | null>(null);
  // Mock shared value since Reanimated is disabled
  const opacity = { value: 1 };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [viewType, setViewType] = useState<'list' | 'full'>('list');

  // Animation values for smooth calendar resizing
  const calendarHeightAnim = useRef(new Animated.Value(0)).current;

  // displayMonthが正しく初期化されているかチェック
  useEffect(() => {
    if (!displayMonth || !displayMonth.format) {
      console.log('Reinitializing displayMonth');
      setDisplayMonth(dayjs());
    }
  }, []);
  const pagerRef = useRef<PagerView>(null);
  const prevMonth = useMemo(() => {
    try {
      if (displayMonth && displayMonth.subtract) {
        return displayMonth.subtract(1, 'month');
      }
      return dayjs().subtract(1, 'month');
    } catch (error) {
      console.error('Error calculating prevMonth:', error);
      return dayjs().subtract(1, 'month');
    }
  }, [displayMonth]);
  
  const nextMonth = useMemo(() => {
    try {
      if (displayMonth && displayMonth.add) {
        return displayMonth.add(1, 'month');
      }
      return dayjs().add(1, 'month');
    } catch (error) {
      console.error('Error calculating nextMonth:', error);
      return dayjs().add(1, 'month');
    }
  }, [displayMonth]);

  const { events: googleAllEvents, loading: googleLoading } = useGoogleCalendarAllEvents(googleEnabled);

  // --- 変更点：カレンダーの高さをアニメーション用に再定義 ---
  const { width } = useWindowDimensions();
  const listCellHeight = useMemo(() => (width - 0 * 2) / 7, [width]); // PADDINGは0
  const fullCellHeight = useMemo(() => listCellHeight * FULL_CELL_HEIGHT_FACTOR, [listCellHeight]);

  const getCalendarHeight = useCallback((type: 'list' | 'full', month: dayjs.Dayjs) => {
    if (!month || typeof month.startOf !== 'function') {
      month = dayjs();
    }
    const cellH = type === 'full' ? fullCellHeight : listCellHeight;
    const firstDayOfMonth = month.startOf('month');
    const daysInMonth = month.daysInMonth();
    const startDayOfWeek = firstDayOfMonth.day();
    const numRows = Math.ceil((startDayOfWeek + daysInMonth) / 7);
    return HEADER_HEIGHT + cellH * numRows;
  }, [listCellHeight, fullCellHeight]);

  // Initialize calendar height animation
  useEffect(() => {
    const initialHeight = getCalendarHeight(viewType, displayMonth);
    calendarHeightAnim.setValue(initialHeight);
  }, [getCalendarHeight, viewType, displayMonth]);

  // Update calendar height when viewType changes
  useEffect(() => {
    const newHeight = getCalendarHeight(viewType, displayMonth);
    Animated.timing(calendarHeightAnim, {
      toValue: newHeight,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [viewType, displayMonth, getCalendarHeight]);

  const getNumRows = useCallback((month: dayjs.Dayjs) => {
    if (!month || typeof month.startOf !== 'function') {
      month = dayjs();
    }
    const firstDayOfMonth = month.startOf('month');
    const daysInMonth = month.daysInMonth();
    const startDayOfWeek = firstDayOfMonth.day();
    return Math.ceil((startDayOfWeek + daysInMonth) / 7);
  }, []);

  // Removed duplicated height management - using calendarHeightAnim instead
  // ----------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const savedId = await getItem(CALENDAR_BG_KEY);
        const selectedImage = BACKGROUND_IMAGES.find(img => img.id === savedId);

        setBackgroundImage(selectedImage ? selectedImage.source : null);

        try {
          await TasksDatabase.initialize();
          const rawTasks = await TasksDatabase.getAllTasks();
          setTasks(rawTasks.map(t => JSON.parse(t)));
        } catch {
          setTasks([]);
        }
      };
      loadData();
    }, [])
  );

  const groupedTasks = useMemo(() => groupTasksByDate(tasks), [tasks]);
  const osMonthEvents = useOSCalendarEvents(displayMonth);
  const allMonthEvents = useMemo(
    () => [...osMonthEvents, ...googleAllEvents],
    [osMonthEvents, googleAllEvents]
  );
  const [eventCache, setEventCache] = useState<
    Record<string, ReturnType<typeof processMultiDayEvents>>
  >({});
  const eventLayout = useMemo(() => {
    const key = displayMonth.format('YYYY-MM');
    return eventCache[key] || processMultiDayEvents(allMonthEvents, displayMonth);
  }, [eventCache, allMonthEvents, displayMonth]);

  useEffect(() => {
    const key = displayMonth.format('YYYY-MM');
    if (!eventCache[key]) {
      const layout = processMultiDayEvents(allMonthEvents, displayMonth);
      setEventCache(prev => ({ ...prev, [key]: layout }));
    }
  }, [allMonthEvents, displayMonth]);

  useEffect(() => {
    try {
      if (displayMonth && displayMonth.subtract && displayMonth.add) {
        const prev = displayMonth.subtract(1, 'month');
        const next = displayMonth.add(1, 'month');
        [prev, next].forEach(m => {
          const key = m.format('YYYY-MM');
          if (!eventCache[key]) {
            const layout = processMultiDayEvents(allMonthEvents, m);
            setEventCache(prevCache => ({ ...prevCache, [key]: layout }));
          }
        });
      }
    } catch (error) {
      console.error('Error updating event cache:', error);
    }
  }, [displayMonth, allMonthEvents]);
  const dayTasks = useMemo(() => groupedTasks[selectedDate] || [], [groupedTasks, selectedDate]);
  const googleDayEvents = useMemo(() => {
    if (!googleEnabled) return [];
    return googleAllEvents.filter(ev => dayjs(ev.start).format('YYYY-MM-DD') === selectedDate);
  }, [googleAllEvents, selectedDate, googleEnabled]);

  const handlePageSelected = useCallback(
    (e: PagerViewOnPageSelectedEvent) => {
      const index = e.nativeEvent.position;
      if (index === 1) return;
      
      let newMonth: dayjs.Dayjs;
      if (index === 2) {
        newMonth = displayMonth && displayMonth.add ? displayMonth.add(1, 'month') : dayjs().add(1, 'month');
      } else if (index === 0) {
        newMonth = displayMonth && displayMonth.subtract ? displayMonth.subtract(1, 'month') : dayjs().subtract(1, 'month');
      } else {
        return;
      }
      
      // 月を更新
      setDisplayMonth(newMonth);
      
      // 選択日付の調整
      const selectedDay = dayjs(selectedDate);
      if (!selectedDay.isSame(newMonth, 'month')) {
        const targetDay = selectedDay.date();
        const daysInNewMonth = newMonth.daysInMonth();
        
        if (targetDay <= daysInNewMonth) {
          setSelectedDate(newMonth.date(targetDay).format('YYYY-MM-DD'));
        } else {
          setSelectedDate(newMonth.endOf('month').format('YYYY-MM-DD'));
        }
      }
      
      // ページをリセット（アニメーション付き）
      setTimeout(() => {
        pagerRef.current?.setPageWithoutAnimation(1);
      }, 100);
    },
    [displayMonth, selectedDate]
  );

  const onDayPress = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);
  
  const onTodayPress = useCallback(() => {
      const today = dayjs();
      setSelectedDate(today.format('YYYY-MM-DD'));
      if (!displayMonth || typeof displayMonth.isSame !== 'function' || !displayMonth.isSame(today, 'month')) {
          if (today && typeof today.format === 'function') {
            setDisplayMonth(today);
          } else {
            setDisplayMonth(dayjs());
          }
      }
  }, [displayMonth]);

  // Animated view type change
  const changeViewType = useCallback((newType: 'list' | 'full') => {
    if (viewType === newType) return;
    
    const newHeight = getCalendarHeight(newType, displayMonth);
    
    setViewType(newType);
    Animated.timing(calendarHeightAnim, {
      toValue: newHeight,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [viewType, displayMonth, calendarHeightAnim]);

  // Legacy toggle function for backward compatibility
  const toggleViewJs = useCallback(() => {
    const newType = viewType === 'list' ? 'full' : 'list';
    changeViewType(newType);
  }, [viewType, changeViewType]);

  const toggleView = useCallback(() => {
    toggleViewJs();
  }, [toggleViewJs]);

  // Simplified vertical-only gesture system to avoid PagerView conflicts
  const verticalGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY([-15, 15])
    .failOffsetX([-30, 30])  // Fail on horizontal movement to avoid PagerView conflict
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      const absY = Math.abs(translationY);
      
      // Only process clear vertical gestures
      if (absY > 40) {
        if (translationY < -40 && velocityY < -400) {
          // Strong swipe up - make calendar smaller (list view)
          changeViewType('list');
        } else if (translationY > 40 && velocityY > 400) {
          // Strong swipe down - make calendar larger (full view)
          changeViewType('full');
        }
      }
    });

  const renderTask = useCallback(({ item }: { item: Task }) => (
    <TaskItem
      task={{ ...item, keyId: item.id, displaySortDate: undefined, isTaskFullyCompleted: !!item.completedAt }}
      onToggle={() => {}}
      isSelecting={false}
      selectedIds={[]}
      onLongPressSelect={() => {}}
      currentTab="incomplete"
    />
  ), []);
  
  const renderGoogleEvent = useCallback((event: GoogleEvent) => (
     <View key={event.id} style={styles.googleEventContainer}>
        <Text style={styles.googleEvent}>{event.title}</Text>
     </View>
  ), [styles]);

  const renderListHeader = useCallback(() => {
    if (googleLoading && googleDayEvents.length === 0) {
      return <ActivityIndicator style={styles.headerItem} color={subColor} />;
    }
    if (dayTasks.length === 0 && googleDayEvents.length === 0) {
        return (
            <View style={{alignItems: 'center', marginTop: 40}}>
                <Text style={{color: '#888'}}>タスクはありません</Text>
            </View>
        );
    }
    if (googleDayEvents.length === 0) return null;

    return (
      <View style={styles.googleHeader}>
        <Text style={styles.googleHeaderText}>Google Calendar</Text>
        {googleDayEvents.map(renderGoogleEvent)}
      </View>
    );
  }, [googleDayEvents, dayTasks, googleLoading, subColor, renderGoogleEvent, styles]);
  
  // SkiaCalendarのtheme propに渡す色を定義
  const textColor = isDark ? '#EAEAEA' : '#333333';
  const subTextColor = isDark ? '#999999' : '#777777';
  const borderColor = isDark ? '#2A2A2A' : '#E8E8E8';
  const dynamicSubColor = subColor || (isDark ? '#5A9CF8' : '#3A75C4');
  
  const skiaTheme = useMemo(() => ({
    primary: dynamicSubColor,
    weekday: WEEKDAY_COLOR,
    day: textColor,
    saturday: SATURDAY_COLOR,
    sunday: SUNDAY_COLOR,
    line: borderColor,
    background: 'transparent',
    eventText: '#FFFFFF',
  }), [dynamicSubColor, textColor, borderColor]);


  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
       <View style={styles.appBar}>
         <Text style={styles.title}>{t('calendar.title')}</Text>
       </View>
      <View style={styles.monthHeader}>
            <Text style={styles.monthText}>
                {displayMonth && displayMonth.format 
                  ? displayMonth.format(t('common.year_month_format'))
                  : dayjs().format(t('common.year_month_format'))
                }
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable onPress={onTodayPress} style={styles.todayButton}>
                    <Text style={styles.todayButtonText}>{t('common.today')}</Text>
                </Pressable>
                <Pressable onPress={toggleViewJs} style={styles.toggleButton}>
                    <Ionicons name={viewType === 'list' ? 'list' : 'calendar-outline'} size={20} color={subTextColor} />
                </Pressable>
            </View>
      </View>
      
      {/* Animated calendar container */}
      <GestureDetector gesture={verticalGesture}>
        <Animated.View style={[
          styles.calendarContainer,
          { height: calendarHeightAnim },
        ]}>
            <PagerView
              ref={pagerRef}
              style={[ styles.calendarWrapper, { flex: 1 } ]}
              initialPage={1}
              onPageSelected={handlePageSelected}
              offscreenPageLimit={1}
            >
            <View key="prev">
              <SkiaCalendar
                date={prevMonth}
                backgroundImage={backgroundImage}
                opacity={opacity}
                selectedDate={selectedDate}
                onDayPress={onDayPress}
                groupedTasks={groupedTasks}
                eventLayout={eventCache[prevMonth.format('YYYY-MM')] || eventLayout}
                showTaskTitles={viewType === 'full'}
                numRows={getNumRows(prevMonth)}
                theme={skiaTheme}
              />
            </View>
            <View key="current">
              <SkiaCalendar
                date={displayMonth}
                backgroundImage={backgroundImage}
                opacity={opacity}
                selectedDate={selectedDate}
                onDayPress={onDayPress}
                groupedTasks={groupedTasks}
                eventLayout={eventLayout}
                showTaskTitles={viewType === 'full'}
                numRows={getNumRows(displayMonth)}
                theme={skiaTheme}
              />
            </View>
            <View key="next">
              <SkiaCalendar
                date={nextMonth}
                backgroundImage={backgroundImage}
                opacity={opacity}
                selectedDate={selectedDate}
                onDayPress={onDayPress}
                groupedTasks={groupedTasks}
                eventLayout={eventCache[nextMonth.format('YYYY-MM')] || eventLayout}
                showTaskTitles={viewType === 'full'}
                numRows={getNumRows(nextMonth)}
                theme={skiaTheme}
              />
            </View>
            </PagerView>
        </Animated.View>
      </GestureDetector>

      {viewType === 'list' && (
        <FlatList
          data={dayTasks}
          keyExtractor={item => item.id}
          renderItem={renderTask}
          ListHeaderComponent={renderListHeader}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push({ pathname: '/add/', params: { date: selectedDate } })}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}