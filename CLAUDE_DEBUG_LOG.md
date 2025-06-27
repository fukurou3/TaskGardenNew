# Claude Debug & Error Tracking

**🎯 Purpose:** Track and resolve errors from Claude modifications  
**📋 Quick Links:** [Main Guide](./CLAUDE.md) | [Patterns](./CLAUDE_PATTERNS.md)

**🚨 Quick Error Checklist:**
- [ ] Database operation uses `executeWithQueue()`?
- [ ] Provider hierarchy maintained?
- [ ] No Reanimated usage?
- [ ] Theme context used instead of hardcoded colors?

## ⚡ Quick Error Template

```markdown
## [YYYY-MM-DD] Error Name

**Error:** [Full error message]
**File:** [file_path:line_number]
**Cause:** [Root cause]
**Fix:** [Solution applied]
**Prevention:** [How to avoid in future]

#tag #category
```

## 🔍 Common Error Categories

### Database Issues
```typescript
// ❌ Problem: Direct SQLite access
const saveTask = async (task: Task) => {
  await db.run('INSERT INTO tasks VALUES (?)', [JSON.stringify(task)]);
};

// ✅ Solution: Use executeWithQueue
const saveTask = async (task: Task) => {
  await executeWithQueue(async () => {
    await db.run('INSERT INTO tasks VALUES (?)', [JSON.stringify(task)]);
  });
};
```

### Context Provider Issues
```typescript
// ❌ Problem: Wrong provider order
<PortalProvider>
  <ThemeProvider>
    <App />
  </ThemeProvider>
</PortalProvider>

// ✅ Solution: Correct hierarchy
<ThemeProvider>
  <FontSizeProvider>
    <GoogleCalendarProvider>
      <OverlayProvider>
        <PortalProvider>
          <App />
        </PortalProvider>
      </OverlayProvider>
    </GoogleCalendarProvider>
  </FontSizeProvider>
</ThemeProvider>
```

### Animation Issues
```typescript
// ❌ Problem: Using Reanimated (disabled)
import { useSharedValue } from 'react-native-reanimated';

// ✅ Solution: Use Animated API
import { Animated } from 'react-native';
const opacity = useRef(new Animated.Value(0)).current;
```

### Theme Issues
```typescript
// ❌ Problem: Hardcoded colors
const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF' }
});

// ✅ Solution: Use theme context
const { isDark } = useAppTheme();
const styles = StyleSheet.create({
  container: { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }
});
```

## 📋 Active Error Log

### 🟢 Recent Errors (Last 30 days)
*Recent errors will be automatically tracked here*

### 🔄 Auto-Cleanup Rules
- **Resolved errors older than 90 days**: Auto-archived
- **Duplicate errors**: Consolidated into patterns
- **Outdated tech stack errors**: Auto-removed when dependencies change
- **Fixed pattern errors**: Moved to CLAUDE_PATTERNS.md as anti-patterns

### 📦 Archived Errors
*Resolved errors are moved here after 90 days, then deleted after 1 year*

---

## 📊 Smart Statistics

| Category | Active | Resolved This Month | Success Rate |
|----------|--------|-------------------|--------------|
| Database | 0 | 0 | 100% |
| Context | 0 | 0 | 100% |
| Animation | 0 | 0 | 100% |
| Theme | 0 | 0 | 100% |
| TypeScript | 0 | 0 | 100% |

### 🎯 Learning Metrics
- **Error Prevention Score**: 100% (No recent repeats)
- **Pattern Compliance**: 100% (All patterns followed)
- **Knowledge Freshness**: 100% (No stale errors)

## 🔧 Debug Workflow

### When Error Occurs:
1. **Copy full error message**
2. **Check [patterns](./CLAUDE_PATTERNS.md) for known solutions**
3. **Run quick checklist above**
4. **Document error here**

### Common Fixes:
```bash
# Database issues
npm run deps:clean

# Context issues  
# Check provider hierarchy in app/_layout.tsx

# Animation issues
# Remove any Reanimated imports

# Theme issues
# Replace hardcoded colors with theme context
```

## ✅ Best Practices

### Before Modifying:
- Check [CLAUDE_PATTERNS.md](./CLAUDE_PATTERNS.md) first
- Review recent errors in this file
- Run quick checklist above

### After Errors:
- Document immediately using template
- Update patterns if new solution found
- Test related functionality

### Prevention:
- Follow existing patterns strictly
- Use theme context always
- Database operations through executeWithQueue
- Maintain provider hierarchy

## 📚 Reference Links

- **[CLAUDE.md](./CLAUDE.md)** - Project overview and critical constraints
- **[CLAUDE_PATTERNS.md](./CLAUDE_PATTERNS.md)** - Implementation patterns and examples
- **React Native:** https://reactnative.dev/
- **Expo:** https://docs.expo.dev/
- **TypeScript:** https://www.typescriptlang.org/

---

---

**📅 Last Updated:** 2024-12-19  
**🔄 Auto-maintained:** This file is automatically updated when errors occur or are resolved.