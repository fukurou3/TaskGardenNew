// components/SkiaTaskCanvas/constants.ts - Drag & Drop Constants
export const DRAG_CONFIG = {
  // Task dimensions
  TASK_HEIGHT: 60,
  TASK_MARGIN: 2,
  TASK_PADDING: 16,
  BORDER_RADIUS: 8,
  CHECKBOX_SIZE: 24,
  
  // Gesture thresholds
  MIN_DRAG_DISTANCE: 10,
  LONG_PRESS_DURATION: 300,
  MAX_DRAG_DISTANCE: 15,
  
  // Animation settings
  SPRING_CONFIG: {
    damping: 15,
    stiffness: 150,
  },
  
  // Visual effects
  DRAG_SCALE: 1.02,
  DRAG_OPACITY: 0.9,
  SHADOW_OFFSET: 2,
  DROP_ZONE_HEIGHT: 4,
  
  // Layout
  CANVAS_PADDING: 32,
  DRAG_HANDLE_SIZE: 3,
  DRAG_HANDLE_SPACING: 6,
} as const;

export const COLORS = {
  SHADOW: '#00000040',
  TRANSPARENT: 'transparent',
} as const;

// Calculate derived values
export const ITEM_HEIGHT = DRAG_CONFIG.TASK_HEIGHT + DRAG_CONFIG.TASK_MARGIN;