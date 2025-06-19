# TaskGarden - Claude Project Guide

**🎯 Purpose:** Essential guidance for Claude Code when working with this React Native/Expo codebase  
**📋 Quick Links:** [Patterns](./CLAUDE_PATTERNS.md) | [Debug](./CLAUDE_DEBUG.md) | [Commands](#quick-commands)

## ⚡ Quick Start

```bash
# Essential commands
npm start              # Start development server
npm run android        # Run on Android
npm run deps:clean     # Clean install dependencies
```

**⚠️ Critical Constraints:**
- ✅ ALWAYS use `executeWithQueue()` for database operations
- ✅ Follow provider hierarchy: Theme → FontSize → GoogleCalendar → Overlay → Portal
- ❌ NEVER use React Native Reanimated (currently disabled)
- ❌ NEVER hardcode colors (use theme context)

## 🏗️ Architecture Core

**Stack:** React Native 0.79.3 + Expo SDK ~53.0.11 + TypeScript + SQLite  
**Routing:** Expo Router (file-based)  
**State:** Zustand + React Context  
**Animation:** Animated API (Reanimated v3 disabled)  

**Provider Hierarchy** (MUST maintain order):
```
ThemeProvider
  └── FontSizeProvider
      └── GoogleCalendarProvider
          └── OverlayProvider
              └── PortalProvider
```

## 📁 Project Structure

```
/app/           # Expo Router navigation
/features/      # Feature modules (tasks, calendar, growth, add, settings, auth)
/lib/           # Core logic (TaskDatabase.ts, SystemOverlay.ts, i18n.ts)
/context/       # React Context providers
/hooks/         # Custom hooks
/components/    # Reusable UI components
/utils/         # Utility functions
```

## 🔧 Critical Patterns

**Database Operations:**
```typescript
// ✅ Required pattern
const result = await executeWithQueue(() => {
  return TasksDatabase.saveTask(task);
});
```

**Theme Usage:**
```typescript
// ✅ Always use theme context
const { colorScheme, isDark, subColor } = useAppTheme();
const styles = StyleSheet.create({
  container: { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }
});
```

## ⚠️ Implementation Requirements

- **Animations:** Use Animated API (Reanimated disabled)
- **Strings:** All UI text via `useTranslation()` hook
- **Imports:** Use `@/*` path aliasing
- **Permissions:** Android requires `SYSTEM_ALERT_WINDOW`
- **Calendar:** Google Calendar API with local caching

## 🚨 Error Prevention

**Before Modifying:**
1. Check [patterns](./CLAUDE_PATTERNS.md) for existing solutions
2. Review [debug log](./CLAUDE_DEBUG.md) for known issues
3. Verify alignment with critical constraints above

**After Errors:**
1. Document immediately in [CLAUDE_DEBUG.md](./CLAUDE_DEBUG.md)
2. Update patterns if new solution discovered
3. Test related functionality

## 📚 Reference Links

- **[CLAUDE_PATTERNS.md](./CLAUDE_PATTERNS.md)** - All implementation patterns and code examples
- **[CLAUDE_DEBUG.md](./CLAUDE_DEBUG.md)** - Error tracking and debugging workflows

## Quick Commands

```bash
# Development
npm start              # Start Expo development server
npm run android        # Run on Android device/emulator
npm run ios           # Run on iOS device/simulator
npm run web           # Run in web browser

# Dependencies
npm run deps:check    # Check for unused dependencies
npm run deps:fix      # Check and fix dependency issues
npm run deps:clean    # Clean install (remove node_modules and reinstall)

# Build
npx expo build:android    # Build Android APK
npx expo build:ios        # Build iOS IPA
```

---

**📅 Last Updated:** 2024-12-19  
**🔄 Auto-maintained:** This file is automatically updated when architectural changes occur.