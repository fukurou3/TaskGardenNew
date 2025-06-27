# Claude Quick Help - Instant Solutions

**🚀 Purpose:** Lightning-fast answers for common development scenarios  
**⏱️ Target:** Get solution in under 10 seconds

## 🆘 Emergency Fixes

### App Won't Start?
```bash
# 30-second fix sequence
npm run deps:clean     # Clears node_modules (15s)
npm start             # Starts dev server (15s)
```

### Database Error?
```typescript
// Always wrap in executeWithQueue
await executeWithQueue(() => {
  // Your database operation here
});
```

### UI Looks Wrong?
```typescript
// Check theme usage
const { isDark } = useAppTheme();
// Never hardcode colors!
backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF'
```

### Animation Not Working?
```typescript
// Use Animated API (NOT Reanimated)
import { Animated } from 'react-native';
const opacity = useRef(new Animated.Value(0)).current;
```

---

## 🎯 Context-Aware Help

### When Working With...

#### 📱 **Components**
- Need styling? → Use `useAppTheme()` + dynamic styles
- Need memoization? → `memo()` + `useMemo()` for expensive calcs
- Need performance? → Check re-renders with React DevTools

#### 🗄️ **Database**  
- Saving data? → `executeWithQueue(() => TasksDatabase.saveTask())`
- Loading data? → `executeWithQueue(() => TasksDatabase.getAllTasks())`
- Schema change? → Update types + migration logic

#### 🎣 **Hooks**
- Need state? → `useState()` for local, Context for global
- Need effect? → `useEffect()` with proper cleanup
- Need callback? → `useCallback()` with correct dependencies

#### 🔄 **Context**
- New provider? → Follow hierarchy: Theme → FontSize → GoogleCalendar → Overlay → Portal
- Provider error? → Check if hook used inside provider
- Context null? → Add null check and error handling

---

## 💡 Smart Suggestions

### Based on Current Task...

#### If file contains "Database" or "Task":
```typescript
// Quick database template
const operation = async () => {
  return executeWithQueue(async () => {
    // Your operation here
  });
};
```

#### If file contains "Component" or "Screen":
```typescript
// Quick component template  
const Component = memo(() => {
  const { isDark, subColor } = useAppTheme();
  const { fontSizeKey } = useFontSize();
  
  const styles = useMemo(() => createStyles(isDark, subColor, fontSizeKey), 
    [isDark, subColor, fontSizeKey]);
  
  return <View style={styles.container} />;
});
```

#### If file contains "Hook" or "use":
```typescript
// Quick hook template
export const useCustomHook = () => {
  const [state, setState] = useState(initialValue);
  
  const action = useCallback(() => {
    // Action logic
  }, [dependencies]);
  
  return { state, action };
};
```

---

## 🔍 Diagnostic Helpers

### Quick Health Check
```bash
# Run this when something feels off
npm run deps:check     # Check dependencies
git status            # Check uncommitted changes  
npm run android       # Test build
```

### Performance Debug
```typescript
// Add these for performance debugging
console.time('operation');
// Your code here
console.timeEnd('operation');

// Check re-renders
console.log('Component rendered');
```

### Error Boundary Quick Setup
```typescript
// Wrap components that might crash
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

---

## 📚 Instant References

### Common Import Patterns
```typescript
// Theme & Font
import { useAppTheme } from '@/hooks/ThemeContext';
import { useFontSize } from '@/hooks/FontSizeContext';

// Database
import { executeWithQueue } from '@/lib/TaskDatabase';

// Components
import { memo, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';

// Navigation
import { useRouter } from 'expo-router';
```

### Essential Constants
```typescript
// Colors (use theme instead!)
const THEME_COLORS = {
  dark: { bg: '#1C1C1E', text: '#FFFFFF' },
  light: { bg: '#FFFFFF', text: '#000000' }
};

// Font sizes
const FONT_SIZES = { small: 14, normal: 16, medium: 18, large: 20 };

// Common animations
const ANIMATION_DURATION = 300;
const EASING = Easing.bezier(0.25, 0.1, 0.25, 1);
```

---

## 🚨 Red Flags - Stop Immediately If You See

- ❌ `import { useSharedValue } from 'react-native-reanimated'`
- ❌ `backgroundColor: '#FFFFFF'` (hardcoded colors)
- ❌ `await db.run()` (missing executeWithQueue)
- ❌ Provider order different from: Theme → FontSize → GoogleCalendar → Overlay → Portal

---

## 🎮 Keyboard Shortcuts for Speed

### In Code Editor:
- `Ctrl+Shift+F` → Search entire project
- `Ctrl+P` → Quick file open  
- `F12` → Go to definition
- `Shift+F12` → Find all references

### Common File Paths:
- Theme: `/hooks/ThemeContext.tsx`
- Database: `/lib/TaskDatabase.ts` 
- Main Layout: `/app/_layout.tsx`
- Patterns: `./CLAUDE_PATTERNS.md`

---

**⚡ Pro Tip:** Bookmark this file for instant access during development!

**📅 Last Updated:** 2024-12-19  
**🔄 Auto-updated:** Based on most common help requests and error patterns.