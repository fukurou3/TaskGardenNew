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