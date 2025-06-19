// app/features/tasks/components/AnimatedTabItem.tsx
import React from 'react';
import { TouchableOpacity, type LayoutChangeEvent } from 'react-native';
import { View, Text } from 'react-native';
// Reanimated disabled - using standard components
import { TAB_MARGIN_RIGHT } from '../constants';

type AnimatedTabItemProps = {
  label: string;
  index: number;
  onPress: (index: number, label: string) => void;
  onTabLayout: (index: number, event: LayoutChangeEvent) => void;
  pageScrollPosition: any;
  selectedTextColor: string;
  unselectedTextColor: string;
  selectedFontWeight: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | undefined;
  unselectedFontWeight: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | undefined;
  baseTabTextStyle: any;
  baseTabButtonStyle: any;
};

export const AnimatedTabItem: React.FC<AnimatedTabItemProps> = React.memo(({
  label,
  index,
  onPress,
  onTabLayout,
  pageScrollPosition,
  selectedTextColor,
  unselectedTextColor,
  selectedFontWeight,
  unselectedFontWeight,
  baseTabTextStyle,
  baseTabButtonStyle,
}) => {

  const handlePress = () => {
    onPress(index, label);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    onTabLayout(index, event);
  };

  // Simplified without animation
  const activeIndex = Math.round(pageScrollPosition?.value || 0);
  const isActive = activeIndex === index;
  
  const textStyle = {
    color: isActive ? selectedTextColor : unselectedTextColor,
    fontWeight: isActive ? selectedFontWeight : unselectedFontWeight,
  };

  return (
    <TouchableOpacity
      style={[baseTabButtonStyle, { borderBottomWidth: 0, marginRight: TAB_MARGIN_RIGHT }]}
      onPress={handlePress}
      onLayout={handleLayout}
      activeOpacity={0.7}
    >
      <Text style={[baseTabTextStyle, textStyle]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});