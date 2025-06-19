// app/features/tasks/components/FolderTabsBar.tsx
import React, { useCallback, useEffect } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
// Reanimated disabled - using standard components
// import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Canvas, RoundedRect } from '@shopify/react-native-skia';
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
}) => {
  const selectedTextColor = styles.folderTabSelectedText.color as string;
  const unselectedTextColor = styles.folderTabText.color as string;
  const selectedFontWeight = styles.folderTabSelectedText.fontWeight;
  const unselectedFontWeight = styles.folderTabText.fontWeight;
  const baseTabTextStyle = styles.folderTabText;
  const baseTabButtonStyle = styles.folderTabButton;

  // Simplified without Reanimated SharedValues
  const outputX = { value: [] as number[] };
  const outputWidth = { value: [] as number[] };

  useEffect(() => {
    const layoutsReady = folderTabs.length > 0 && Object.keys(folderTabLayouts).length >= folderTabs.length;
    if (layoutsReady) {
      const sortedLayouts = folderTabs
        .map((_, i) => folderTabLayouts[i])
        .filter((l): l is FolderTabLayout => !!l)
        .sort((a, b) => a.index - b.index);

      if (sortedLayouts.length === folderTabs.length) {
        outputX.value = sortedLayouts.map(l => l.x);
        outputWidth.value = sortedLayouts.map(l => l.width);
      }
    } else if (folderTabs.length === 0) {
        outputX.value = [];
        outputWidth.value = [];
    }
  }, [folderTabs, folderTabLayouts, outputX, outputWidth]);

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

  // Simplified static indicator (no animation)
  const indicatorX = { value: 0 };
  const indicatorWidth = { value: 0 };

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
            />

          ))}
          {folderTabs.length > 0 && (
            <Canvas style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: ACCENT_LINE_HEIGHT }}>
              <RoundedRect
                x={indicatorX.value}
                y={0}
                width={indicatorWidth.value}
                height={ACCENT_LINE_HEIGHT}
                r={ACCENT_LINE_HEIGHT / 2}
                color={subColor}
              />
            </Canvas>
          )}
          </View>
      </ScrollView>
    </View>
  );
});