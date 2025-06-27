// components/SkiaTaskCanvas/types.ts - Type Definitions
import { DisplayableTaskItem } from '@/features/tasks/types';

export interface TaskPosition {
  readonly taskId: string;
  readonly index: number;
  readonly y: number;
  readonly isAnimating: boolean;
}

export interface DragState {
  readonly isDragging: boolean;
  readonly dragIndex: number;
  readonly targetIndex: number;
  readonly dragY: number;
}

export interface SkiaTaskProps {
  readonly task: DisplayableTaskItem;
  readonly index: number;
  readonly isSelected: boolean;
  readonly isBeingDragged: boolean;
  readonly isDraggedOver: boolean;
  readonly isLongPressed: boolean;
  readonly y: number;
  readonly canvasWidth: number;
  readonly colors: ColorScheme;
  readonly currentTab: 'incomplete' | 'completed';
  readonly font: any | null; // Title font from react-native-skia
  readonly deadlineFont?: any | null; // Deadline font from react-native-skia
  readonly isInsideFolder?: boolean; // Distinguish folder vs standalone layout
}

export interface ColorScheme {
  readonly background: string;
  readonly text: string;
  readonly textSecondary: string;
  readonly border: string;
  readonly selected: string;
  readonly accent: string;
  readonly checkbox: string;
  readonly checkboxBorder: string;
}

export interface DragGestureConfig {
  readonly tasks: ReadonlyArray<DisplayableTaskItem>;
  readonly onTaskReorder: (fromIndex: number, toIndex: number) => void;
  readonly onToggleTaskDone?: (id: string, instanceDate?: string) => void;
  readonly onLongPressSelect?: (type: 'task', id: string) => void;
  readonly onTaskPress?: (taskId: string) => void;
  readonly isSelecting: boolean;
  readonly canvasHeight: number;
  readonly onDragStateChange?: (isDragging: boolean, dragIndex: number, isLongPressed?: boolean) => void;
  readonly onDragUpdate?: (dragY: number, targetIndex: number) => void;
}

export interface SkiaTaskCanvasProps {
  readonly tasks: ReadonlyArray<DisplayableTaskItem>;
  readonly onTaskReorder: (fromIndex: number, toIndex: number) => void;
  readonly onToggleTaskDone: (id: string, instanceDate?: string) => void;
  readonly onTaskPress?: (taskId: string) => void;
  readonly selectedIds?: ReadonlyArray<string>;
  readonly isSelecting?: boolean;
  readonly onLongPressSelect?: (type: 'task', id: string) => void;
  readonly currentTab: 'incomplete' | 'completed';
  readonly canvasHeight: number;
  readonly isInsideFolder?: boolean; // Distinguish folder vs standalone layout
}

// Error types for better error handling
export class DragError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DragError';
  }
}

export const ERROR_CODES = {
  INVALID_TASK_INDEX: 'INVALID_TASK_INDEX',
  GESTURE_INITIALIZATION_FAILED: 'GESTURE_INITIALIZATION_FAILED',
  ANIMATION_FAILED: 'ANIMATION_FAILED',
} as const;