// app/(tabs)/calendar/styles.ts
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { fontSizes as appFontSizes } from '@/constants/fontSizes';

export type CalendarScreenStyles = {
  container: ViewStyle;
  appBar: ViewStyle;
  title: TextStyle;
  monthHeader: ViewStyle;
  monthText: TextStyle;
  todayButton: ViewStyle;
  todayButtonText: TextStyle;
  toggleButton: ViewStyle;
  calendarContainer: ViewStyle;
  calendarWrapper: ViewStyle;
  list: ViewStyle;
  listContent: ViewStyle;
  headerItem: ViewStyle;
  googleHeader: ViewStyle;
  googleHeaderText: TextStyle;
  googleEventContainer: ViewStyle;
  googleEvent: TextStyle;
  fab: ViewStyle;
  fullCalendarContainer: ViewStyle;
};

export const createCalendarStyles = (isDark: boolean, subColor: string): CalendarScreenStyles => {
  const baseFontSize = appFontSizes["normal"];
  // --- 変更点：基本色を定義 ---
  const backgroundColor = isDark ? '#0C0C0C' : '#f2f2f4'; // 真っ黒・真っ白から変更
  const textColor = isDark ? '#EAEAEA' : '#333333';
  const subTextColor = isDark ? '#999999' : '#777777';
  const cardBackgroundColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? '#333333' : '#EAEAEA';
  const dynamicSubColor = subColor || (isDark ? '#5A9CF8' : '#3A75C4'); // アクセントカラー
  // -------------------------

  const shadowStyle = {
    shadowColor: '#000', // 影の色は黒で統一
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.25 : 0.1, // 影の濃さを調整
    shadowRadius: 8, // 影のぼかしを広げる
    elevation: 5,
  };
  
  return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: backgroundColor, // 変更
    },
    appBar: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: backgroundColor, // 変更
        borderBottomWidth: 0, // 境界線を削除
    },
    title: {
        fontSize: baseFontSize + 3,
        fontWeight: '600',
        color: isDark ? '#FFFFFF' : '#000000',
    },
    monthHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16, // 余白を広げる
        paddingVertical: 12,
        backgroundColor: cardBackgroundColor, // カレンダーと同じ背景色
    },
    monthText: {
        fontSize: 24, // 月の表示は大きく
        fontWeight: 'bold',
        color: textColor,
    },
    // --- 変更点：ボタンをシンプルに ---
    todayButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20, // 角を丸く
        backgroundColor: 'transparent', // 背景を透明に
        borderWidth: 1,
        borderColor: borderColor,
    },
    todayButtonText: {
        fontWeight: '600',
        color: subTextColor, // 文字色を落ち着いた色に
        fontSize: 13,
    },
    toggleButton: {
        marginLeft: 8,
        padding: 6,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    // ---------------------------------
    calendarContainer: {
        marginHorizontal: 0,
        backgroundColor: cardBackgroundColor, // 背景色を設定
        ...shadowStyle, // 全体にうっすらと影をつける
        shadowOffset: { width: 0, height: 6 },
    },
    calendarWrapper: {
        backgroundColor: 'transparent', // 背景色を透過に
        borderTopWidth: 1, // 曜日ヘッダーとの区切り線
        borderTopColor: borderColor,
    },
    list: {
        flex: 1,
        marginTop: 16, // カレンダーとの余白を広げる
    },
    listContent: {
        paddingBottom: 90, // FABと重ならないように調整
        paddingHorizontal: 16,
    },
    headerItem: {
        marginVertical: 16,
    },
    googleHeader: {
        padding: 12,
        backgroundColor: cardBackgroundColor, // リストのヘッダーもカード風に
        borderRadius: 12,
        marginBottom: 8,
    },
    googleHeaderText: {
        fontWeight: 'bold',
        marginBottom: 8,
        color: dynamicSubColor,
    },
    googleEventContainer: {
        paddingLeft: 8,
        paddingVertical: 4,
    },
    googleEvent: {
        fontSize: 14,
        lineHeight: 18,
        color: textColor,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 16,
        bottom: 16,
        backgroundColor: dynamicSubColor, // アクセントカラー
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadowStyle, // 影を適用
    },
    fullCalendarContainer: {
        backgroundColor: cardBackgroundColor,
    },
  });
};