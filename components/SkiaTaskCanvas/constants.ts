// components/SkiaTaskCanvas/constants.ts - Drag & Drop Constants
export const DRAG_CONFIG = {
  // Task dimensions (very tight spacing)
  TASK_HEIGHT: 60, // Further reduced for tighter spacing
  TASK_MARGIN_HORIZONTAL: 16, // marginHorizontal from taskItemContainer
  TASK_MARGIN_TOP: 0, // Minimal spacing
  TASK_MARGIN_BOTTOM: 0, // Minimal spacing
  TASK_PADDING_HORIZONTAL: 16, // paddingHorizontal from taskItemContainer
  TASK_PADDING_VERTICAL: 10, // paddingVertical from taskItemContainer
  BORDER_RADIUS: 12, // BORDER_RADIUS_MD from TaskItem
  CHECKBOX_SIZE: 24, // EXACT match with TaskItem Ionicons size={24}
  CHECKBOX_PADDING_RIGHT: 14, // paddingRight from checkboxContainer
  CHECKBOX_PADDING_LEFT: 2, // paddingLeft from checkboxContainer
  CHECKBOX_PADDING_VERTICAL: 8, // paddingVertical from checkboxContainer
  
  // Gesture thresholds
  MIN_DRAG_DISTANCE: 10,
  LONG_PRESS_DURATION: 300, // Stable value
  MAX_DRAG_DISTANCE: 15,
  
  // Animation settings (optimized for smooth gap animations)
  SPRING_CONFIG: {
    damping: 25,     // Increased for smoother deceleration
    stiffness: 120,  // Slightly increased for responsiveness
    mass: 1,        // Standard mass
    velocity: 0,    // No initial velocity
  },
  
  // Visual effects
  DRAG_SCALE: 1.05,
  DRAG_OPACITY: 0.85,
  SHADOW_OFFSET: 3,
  DROP_ZONE_HEIGHT: 4,
  
  // Layout (match TaskItem spacing)
  CANVAS_PADDING: 0, // Remove extra padding to match TaskItem layout
  TASK_CENTER_MARGIN_RIGHT: 10, // marginRight from taskCenter
  DRAG_HANDLE_SIZE: 3,
  DRAG_HANDLE_SPACING: 6,
} as const;

export const COLORS = {
  SHADOW: '#00000040',
  TRANSPARENT: 'transparent',
} as const;

// Calculate derived values (tighter spacing)
export const ITEM_HEIGHT = DRAG_CONFIG.TASK_HEIGHT; // Tighter spacing for folder items