# Claude Implementation Patterns - TaskGarden

**🎯 Purpose:** Comprehensive code patterns and examples for consistent development  
**📋 Quick Links:** [Main Guide](./CLAUDE.md) | [Debug](./CLAUDE_DEBUG.md)

## 📑 Pattern Index

| Category | Description | Line |
|----------|-------------|------|
| [Database](#-database-patterns) | Queue-based SQLite operations | 25 |
| [Components](#-component-patterns) | React Native component templates | 85 |  
| [Hooks](#-hook-patterns) | Custom hook implementations | 145 |
| [Context](#-context-patterns) | Provider and context management | 205 |
| [Animation](#-animation-patterns) | Animated API patterns (Reanimated disabled) | 265 |
| [Theme](#-theme-patterns) | Dark/light mode and styling | 305 |
| [Error Handling](#-error-handling-patterns) | Progressive fallback strategies | 345 |

---

## 🗄️ Database Patterns

### Core Database Operations
```typescript
// ✅ ALWAYS use executeWithQueue for race condition prevention
import { executeWithQueue } from './lib/TaskDatabase';

const saveTask = async (task: TaskRecord): Promise<void> => {
  await executeWithQueue(async () => {
    await TasksDatabase.saveTask(task);
  });
};

const getAllTasks = async (): Promise<TaskRecord[]> => {
  return executeWithQueue(async () => {
    const jsonStrings = await TasksDatabase.getAllTasks();
    return jsonStrings.map(str => JSON.parse(str));
  });
};
```

### Database Types
```typescript
export type TaskRecord = {
  id: string;
  title: string;
  memo?: string;
  deadline?: string;
  folder?: string;
  completedAt?: string;
  customOrder?: number;
  priority?: number;
  deadlineDetails?: DeadlineSettings;
  completedInstanceDates?: string[];
  imageUris?: string[];
};

export type EventRecord = {
  id: string;
  [key: string]: any;
};
```

### Database Error Handling
```typescript
const safeDbOperation = async <T>(operation: () => Promise<T>): Promise<T | null> => {
  try {
    return await executeWithQueue(operation);
  } catch (error) {
    console.warn('Database operation failed:', error);
    return null;
  }
};
```

---

## 🧩 Component Patterns

### Memoized Component with Theme
```typescript
interface ComponentProps {
  task: DisplayableTaskItem;
  onPress: (id: string) => void;
}

const TaskItem = memo(({ task, onPress }: ComponentProps) => {
  const { colorScheme, subColor } = useAppTheme();
  const { fontSizeKey } = useFontSize();
  const isDark = colorScheme === 'dark';
  
  const styles = useMemo(() => createStyles(isDark, subColor, fontSizeKey), 
    [isDark, subColor, fontSizeKey]);
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress(task.id)}
    >
      <Text style={styles.title}>{task.title}</Text>
    </TouchableOpacity>
  );
});
```

### Dynamic Style Creation
```typescript
const createStyles = (isDark: boolean, subColor: string, fontSizeKey: FontSizeKey) => {
  const baseFontSize = fontSizes[fontSizeKey];
  
  return StyleSheet.create({
    container: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderColor: isDark ? '#38383A' : '#E5E5EA',
      borderWidth: 1,
      borderRadius: 8,
      padding: 16,
    },
    title: {
      fontSize: baseFontSize,
      color: isDark ? '#FFFFFF' : '#000000',
      fontWeight: '500',
    },
    accent: {
      color: subColor,
    },
  });
};
```

### Auto-Refresh Component
```typescript
const TaskDeadline = memo(({ task }: { task: Task }) => {
  const [, setTick] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!task.deadline) return;
    
    const dateToMonitor = dayjs(task.deadline);
    
    const calculateInterval = (): number => {
      const diffMinutes = dateToMonitor.diff(dayjs(), 'minute');
      if (diffMinutes <= 1) return 5000;     // 5s refresh
      if (diffMinutes <= 5) return 10000;    // 10s refresh
      if (diffMinutes <= 60) return 30000;   // 30s refresh
      return 60000;                          // 1min refresh
    };
    
    const tick = () => {
      setTick(prev => prev + 1);
      timeoutRef.current = setTimeout(tick, calculateInterval());
    };
    
    timeoutRef.current = setTimeout(tick, calculateInterval());
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [task.deadline]);
  
  return <Text>{/* deadline display logic */}</Text>;
});
```

---

## 🎣 Hook Patterns

### System Overlay Hook
```typescript
interface UseSystemOverlayOptions {
  defaultOpacity?: number;
  autoHide?: boolean;
  checkPermissionOnMount?: boolean;
}

interface UseSystemOverlayReturn {
  isVisible: boolean;
  hasPermission: boolean | null;
  isLoading: boolean;
  opacity: number;
  showOverlay: (customOpacity?: number) => Promise<boolean>;
  hideOverlay: () => Promise<boolean>;
  toggleOverlay: (customOpacity?: number) => Promise<boolean>;
  updateOpacity: (newOpacity: number) => Promise<boolean>;
  checkPermission: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
}

export function useSystemOverlay(options: UseSystemOverlayOptions = {}): UseSystemOverlayReturn {
  const [isVisible, setIsVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [opacity, setOpacity] = useState(options.defaultOpacity ?? 0.8);
  
  // Implementation details...
  
  return {
    isVisible,
    hasPermission,
    isLoading,
    opacity,
    showOverlay,
    hideOverlay,
    toggleOverlay,
    updateOpacity,
    checkPermission,
    requestPermission,
  };
}
```

### Zustand Store Pattern
```typescript
type UnsavedStore = {
  unsaved: boolean;
  setUnsaved: (v: boolean) => void;
  reset: () => void;
};

export const useUnsavedStore = create<UnsavedStore>((set) => ({
  unsaved: false,
  setUnsaved: (v: boolean) => set({ unsaved: v }),
  reset: () => set({ unsaved: false }),
}));
```

### Custom Task Logic Hook
```typescript
export const useTasksScreenLogic = () => {
  const [tasks, setTasks] = useState<DisplayableTaskItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const taskRecords = await getAllTasks();
      const displayableTasks = taskRecords.map(task => ({
        ...task,
        keyId: `${task.id}-${Date.now()}`,
        displaySortDate: task.deadline ? dayjs(task.deadline) : null,
        isTaskFullyCompleted: !!task.completedAt,
      }));
      setTasks(displayableTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    tasks,
    selectedFolder,
    setSelectedFolder,
    isLoading,
    loadTasks,
  };
};
```

---

## 🔄 Context Patterns

### Provider Hierarchy (MUST follow this order)
```typescript
// app/_layout.tsx - NEVER change this order
export default function RootLayout() {
  return (
    <ThemeProvider>
      <FontSizeProvider>
        <GoogleCalendarProvider>
          <OverlayProvider>
            <PortalProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
            </PortalProvider>
          </OverlayProvider>
        </GoogleCalendarProvider>
      </FontSizeProvider>
    </ThemeProvider>
  );
}
```

### Context Creation Template
```typescript
// 1. Define context value interface
interface ThemeContextValue {
  themeChoice: ThemeChoice;
  setThemeChoice: (t: ThemeChoice) => void;
  colorScheme: 'light' | 'dark';
  subColor: string;
  setSubColor: (color: string) => void;
}

// 2. Create context with defaults
const ThemeContext = createContext<ThemeContextValue>({
  themeChoice: 'system',
  setThemeChoice: () => {},
  colorScheme: 'light',
  subColor: '#007AFF',
  setSubColor: () => {},
});

// 3. Provider with storage persistence
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeChoice, setThemeChoiceState] = useState<ThemeChoice>('system');
  const [subColor, setSubColorState] = useState('#007AFF');
  const colorScheme = useColorScheme() ?? 'light';
  
  // Load from storage on mount
  useEffect(() => {
    (async () => {
      const savedTheme = await getItem(THEME_STORAGE_KEY);
      const savedColor = await getItem(COLOR_STORAGE_KEY);
      if (savedTheme) setThemeChoiceState(savedTheme as ThemeChoice);
      if (savedColor) setSubColorState(savedColor);
    })();
  }, []);
  
  // Setter with storage persistence
  const setThemeChoice = useCallback(async (choice: ThemeChoice) => {
    setThemeChoiceState(choice);
    await setItem(THEME_STORAGE_KEY, choice);
  }, []);
  
  const setSubColor = useCallback(async (color: string) => {
    setSubColorState(color);
    await setItem(COLOR_STORAGE_KEY, color);
  }, []);
  
  return (
    <ThemeContext.Provider value={{
      themeChoice,
      setThemeChoice,
      colorScheme: themeChoice === 'system' ? colorScheme : themeChoice,
      subColor,
      setSubColor,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 4. Hook for consuming context
export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return { ...context, isDark: context.colorScheme === 'dark' };
}
```

---

## 🎬 Animation Patterns

### React Native Animated (Current - Reanimated Disabled)
```typescript
const FadeInView = ({ children, duration = 300 }: { children: ReactNode; duration?: number }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  return (
    <Animated.View style={{
      opacity,
      transform: [{ translateY }],
    }}>
      {children}
    </Animated.View>
  );
};
```

### Future Reanimated v3 Pattern (When Re-enabled)
```typescript
// Use this pattern when Reanimated is re-enabled
const ReanimatedComponent = () => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });
  
  const animateIn = () => {
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withTiming(0, { duration: 300 });
  };
  
  return <Animated.View style={animatedStyle} />;
};
```

---

## 🎨 Theme Patterns

### Theme Usage in Components
```typescript
const ThemedComponent = () => {
  const { colorScheme, isDark, subColor } = useAppTheme();
  const { fontSizeKey } = useFontSize();
  
  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderColor: isDark ? '#38383A' : '#C6C6C8',
    },
    text: {
      color: isDark ? '#FFFFFF' : '#000000',
      fontSize: fontSizes[fontSizeKey],
    },
    accent: {
      color: subColor,
    },
  }), [isDark, subColor, fontSizeKey]);
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Content</Text>
      <Text style={styles.accent}>Accent Text</Text>
    </View>
  );
};
```

### Font Size Management
```typescript
export type FontSizeKey = 'small' | 'normal' | 'medium' | 'large';

export const fontSizes = {
  small: 14,
  normal: 16,
  medium: 18,
  large: 20,
};

// Usage in components
const { fontSizeKey } = useFontSize();
const baseFontSize = fontSizes[fontSizeKey];
```

---

## 🛡️ Error Handling Patterns

### Progressive Fallback Strategy
```typescript
const trySystemFeature = async (): Promise<'success' | 'fallback' | 'failed'> => {
  try {
    // Primary approach
    await primaryApproach();
    return 'success';
  } catch (error) {
    console.warn('Primary approach failed, trying fallback:', error);
    try {
      // Fallback approach
      await fallbackApproach();
      return 'fallback';
    } catch (fallbackError) {
      console.error('All approaches failed:', fallbackError);
      return 'failed';
    }
  }
};
```

### Safe Storage Operations
```typescript
const safeStorageGet = async (key: string): Promise<string | null> => {
  try {
    return await getItem(key);
  } catch (error) {
    console.warn(`Storage get failed for key ${key}:`, error);
    return null;
  }
};

const safeStorageSet = async (key: string, value: string): Promise<boolean> => {
  try {
    await setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Storage set failed for key ${key}:`, error);
    return false;
  }
};
```

### Component Error Boundaries
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Component error caught:', error, errorInfo);
    // Log to CLAUDE_DEBUG.md if needed
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Something went wrong. Please try restarting the app.</Text>
        </View>
      );
    }
    
    return this.props.children;
  }
}
```

---

## 🔍 Common Anti-Patterns to Avoid

### ❌ Database Anti-Patterns
```typescript
// ❌ DON'T: Direct database access
await db.run('INSERT INTO tasks VALUES (?)', [task]);

// ❌ DON'T: Ignoring race conditions
const saveTasks = async (tasks: Task[]) => {
  for (const task of tasks) {
    await TasksDatabase.saveTask(task); // Race condition risk
  }
};

// ✅ DO: Use executeWithQueue
await executeWithQueue(() => db.run('INSERT INTO tasks VALUES (?)', [task]));
```

### ❌ Context Anti-Patterns
```typescript
// ❌ DON'T: Wrong provider order
<PortalProvider>
  <ThemeProvider>
    <App />
  </ThemeProvider>
</PortalProvider>

// ❌ DON'T: Missing null check
const theme = useContext(ThemeContext); // Can be null
```

### ❌ Styling Anti-Patterns
```typescript
// ❌ DON'T: Hardcoded colors
const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF' }
});

// ❌ DON'T: Direct color usage
<View style={{ backgroundColor: '#000000' }} />
```

---

## 📚 Smart Pattern Management

### 🔄 Auto-Evolution System
```
New Pattern Discovered → Auto-Analysis → Category Assignment → Integration → Validation
      ↓
Old Pattern Detected → Deprecation Notice → Migration Guide → Archive → Auto-Delete
```

### 🚀 Pattern Versioning
```typescript
// Example: Database pattern evolution
// v1.0 - Direct calls (DEPRECATED - Auto-removed 2024-10-15)
// v2.0 - executeWithQueue (CURRENT)
// v3.0 - Batch operations (PLANNED - When performance issues emerge)

interface PatternVersion {
  version: string;
  status: 'current' | 'deprecated' | 'planned' | 'experimental';
  deprecatedSince?: string;
  autoRemoveDate?: string;
  migrationGuide?: string;
}
```

### ⚡ Smart Cleanup Rules
- **Performance patterns**: Auto-benchmark and replace slower approaches
- **Deprecated APIs**: Auto-remove when dependencies update
- **Unused patterns**: Archive if not referenced in 6 months
- **Duplicate patterns**: Auto-consolidate similar approaches
- **Error-prone patterns**: Flag and suggest safer alternatives

### 🎯 Pattern Quality Metrics
- **Usage Frequency**: Track which patterns are actually used
- **Error Rate**: Flag patterns that frequently cause issues
- **Performance Impact**: Benchmark and rank by speed/memory
- **Maintenance Cost**: Track time spent fixing pattern-related issues

### 📊 Pattern Dashboard
| Pattern Category | Active | Deprecated | Success Rate | Last Updated |
|------------------|--------|------------|--------------|--------------|
| Database | 5 | 2 | 98% | 2024-12-19 |
| Components | 8 | 1 | 95% | 2024-12-19 |
| Hooks | 6 | 0 | 100% | 2024-12-19 |
| Context | 4 | 1 | 97% | 2024-12-19 |
| Animation | 3 | 5 | 90% | 2024-12-19 |

---

**📅 Last Updated:** 2024-12-19  
**🔄 Auto-maintained:** Patterns are automatically updated as the codebase evolves.

For errors and debugging, see [CLAUDE_DEBUG_LOG.md](./CLAUDE_DEBUG_LOG.md).  
For project overview, see [CLAUDE.md](./CLAUDE.md).