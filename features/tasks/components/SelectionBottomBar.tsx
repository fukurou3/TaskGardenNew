// app/features/tasks/components/SelectionBottomBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TaskScreenStyles } from '@/features/tasks/styles';
import type { SelectableItem } from '@/features/tasks/types';
import type { FolderOrder } from '@/features/tasks/types';

type SelectionBottomBarProps = {
  styles: TaskScreenStyles;
  isSelecting: boolean;
  selectionAnimSharedValue: Animated.Value;
  selectedItems: SelectableItem[];
  subColor: string;
  noFolderName: string;
  folderOrder: FolderOrder;
  selectedFolderTabName: string;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onRenameSelected: () => void;
  onReorderSelected: () => void;
  onCancelSelection: () => void;
  t: (key: string, options?: any) => string;
};

export const SelectionBottomBar: React.FC<SelectionBottomBarProps> = ({
  styles,
  isSelecting,
  selectionAnimSharedValue,
  selectedItems,
  subColor,
  noFolderName,
  folderOrder,
  selectedFolderTabName,
  onSelectAll,
  onDeleteSelected,
  onRenameSelected,
  onReorderSelected,
  onCancelSelection,
  t,
}) => {
  const animatedBarStyle = {
    transform: [{ translateY: selectionAnimSharedValue }],
  };

  if (!isSelecting) {
    return null;
  }

  const canRename = selectedItems.length === 1 && selectedItems[0].type === 'folder' && selectedItems[0].id !== noFolderName;
  const canReorder = selectedItems.length === 1 && selectedItems[0].type === 'folder' && selectedItems[0].id !== noFolderName && folderOrder.filter(f => f !== noFolderName).length > 1 && selectedFolderTabName === 'all';

  return (
    <Animated.View style={[ styles.selectionBar, animatedBarStyle, Platform.OS === 'ios' && { paddingBottom: 20 } ]}>
      <TouchableOpacity onPress={onSelectAll} style={styles.selectionActionContainer} activeOpacity={0.7}>
        <Ionicons name="checkmark-done-outline" size={28} color={subColor} />
        <Text style={styles.selectionActionText}>{t('common.select_all')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDeleteSelected} style={styles.selectionActionContainer} activeOpacity={0.7}>
        <Ionicons name="trash-outline" size={28} color={subColor} />
        <Text style={styles.selectionActionText}>{t('common.delete')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={!canRename}
        onPress={onRenameSelected}
        style={[styles.selectionActionContainer, { opacity: canRename ? 1 : 0.4 }]}
        activeOpacity={0.7}
      >
        <Ionicons name="create-outline" size={28} color={subColor} />
        <Text style={styles.selectionActionText}>{t('common.rename')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={!canReorder}
        onPress={onReorderSelected}
        style={[styles.selectionActionContainer, { opacity: canReorder ? 1 : 0.4 }]}
        activeOpacity={0.7}
      >
        <Ionicons name="swap-vertical" size={28} color={subColor} />
        <Text style={styles.selectionActionText}>{t('common.reorder')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onCancelSelection} style={styles.selectionActionContainer} activeOpacity={0.7}>
        <Ionicons name="close-circle-outline" size={28} color={subColor} />
        <Text style={styles.selectionActionText}>{t('common.cancel')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};