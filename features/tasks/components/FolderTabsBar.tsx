// app/features/tasks/components/FolderTabsBar.tsx
import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView, View, type LayoutChangeEvent, Animated } from 'react-native';
// Reanimated disabled - using standard components
// import { Gesture, GestureDetector } from 'react-native-gesture-handler';
// Canvas import removed - using Animated.View instead
// import { Canvas, RoundedRect } from '@shopify/react-native-skia';
import type { TaskScreenStyles } from '@/features/tasks/styles';
import type { FolderTab, FolderTabLayout } from '@/features/tasks/hooks/useTasksScreenLogic';
import { ACCENT_LINE_HEIGHT, FOLDER_TABS_CONTAINER_PADDING_HORIZONTAL } from '@/features/tasks/constants';
import { AnimatedTabItem } from './AnimatedTabItem';

type FolderTabsBarProps = {
  styles: TaskScreenStyles;
  subColor: string;
  folderTabs: FolderTab[];
  folderTabLayouts: Record<number, FolderTabLayout>;
  setFolderTabLayouts: (updater: (prev: Record<number, FolderTabLayout>) => Record<number, FolderTabLayout>) => void;
  handleFolderTabPress: (folderName: string, index: number) => void;
  pageScrollPosition: any; // Standard Animated.Value
  folderTabsScrollViewRef: React.RefObject<ScrollView>;
  selectedTabIndex: number;
};

export const FolderTabsBar: React.FC<FolderTabsBarProps> = React.memo(({
  styles,
  subColor,
  folderTabs,
  folderTabLayouts,
  setFolderTabLayouts,
  handleFolderTabPress,
  pageScrollPosition, // Re-enabled for mock object
  folderTabsScrollViewRef,
  selectedTabIndex,
}) => {
  const selectedTextColor = styles.folderTabSelectedText.color as string;
  const unselectedTextColor = styles.folderTabText.color as string;
  const selectedFontWeight = styles.folderTabSelectedText.fontWeight;
  const unselectedFontWeight = styles.folderTabText.fontWeight;
  const baseTabTextStyle = styles.folderTabText;
  const baseTabButtonStyle = styles.folderTabButton;

  // Animated values for accent line
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  // Update accent line position when selectedTabIndex or layouts change
  useEffect(() => {
    const layoutsReady = folderTabs.length > 0 && Object.keys(folderTabLayouts).length >= folderTabs.length;
    if (layoutsReady && selectedTabIndex < folderTabs.length) {
      const layout = folderTabLayouts[selectedTabIndex];
      if (layout) {
        Animated.parallel([
          Animated.timing(indicatorX, {
            toValue: layout.x,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(indicatorWidth, {
            toValue: layout.width,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
      }
    }
  }, [selectedTabIndex, folderTabLayouts, folderTabs.length]);

  const memoizedOnItemPress = useCallback((index: number, label: string) => {
    const folderName = folderTabs[index]?.name || label;
    handleFolderTabPress(folderName, index);
  }, [handleFolderTabPress, folderTabs]);

  const memoizedOnTabLayout = useCallback((index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setFolderTabLayouts(prev => {
      if (prev[index]?.x === x && prev[index]?.width === width) {
        return prev;
      }
      return {
        ...prev,
        [index]: { x, width, index: index },
      };
    });
  }, [setFolderTabLayouts]);

  // Mock gesture since Reanimated is disabled
  const panGesture = null;

  return (
    <View style={[styles.folderTabsContainer]}>
      <ScrollView
        ref={folderTabsScrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: FOLDER_TABS_CONTAINER_PADDING_HORIZONTAL,
        }}
      >
          <View style={{ flexDirection: 'row', position: 'relative' }}>
          {folderTabs.map((folder, index) => (
            <AnimatedTabItem
              key={`${folder.name}-${index}`}
              label={folder.label}
              index={index}
              onPress={memoizedOnItemPress}
              onTabLayout={memoizedOnTabLayout}
              pageScrollPosition={pageScrollPosition}
              selectedTextColor={selectedTextColor}
              unselectedTextColor={unselectedTextColor}
              selectedFontWeight={selectedFontWeight}
              unselectedFontWeight={unselectedFontWeight}
              baseTabTextStyle={baseTabTextStyle}
              baseTabButtonStyle={baseTabButtonStyle}
              selectedTabIndex={selectedTabIndex}
            />

          ))}
          {folderTabs.length > 0 && (
            <Animated.View 
              style={{ 
                position: 'absolute',
                bottom: 0,
                height: ACCENT_LINE_HEIGHT,
                backgroundColor: subColor,
                borderRadius: ACCENT_LINE_HEIGHT / 2,
                left: indicatorX,
                width: indicatorWidth,
              }}
            />
          )}
          </View>
      </ScrollView>
    </View>
  );
});