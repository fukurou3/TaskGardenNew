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
- ✅ USE React Native Reanimated v3 for Skia Canvas animations
- ❌ NEVER hardcode colors (use theme context)

## 🏗️ Architecture Core

**Stack:** React Native 0.79.3 + Expo SDK ~53.0.11 + TypeScript + SQLite  
**Routing:** Expo Router (file-based)  
**State:** Zustand + React Context  
**Animation:** Reanimated v3 + Skia Canvas (GPU-accelerated)  

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

- **Animations:** Use Reanimated v3 with Skia Canvas for drag&drop
- **Strings:** All UI text via `useTranslation()` hook
- **Imports:** Use `@/*` path aliasing
- **Permissions:** Android requires `SYSTEM_ALERT_WINDOW`
- **Calendar:** Google Calendar API with local caching

## 🚨 Smart Error Prevention

**🔍 Before ANY Code Change:**
```bash
# 30-second pre-flight check
1. Quick scan: Does this follow critical constraints above? (5s)
2. Pattern check: Is there existing solution in CLAUDE_PATTERNS.md? (10s)  
3. Recent errors: Any similar issues in CLAUDE_DEBUG_LOG.md? (10s)
4. Blast radius: What could break if this fails? (5s)
```

**⚡ After Errors (Auto-Learning):**
1. **Smart Documentation**: Claude auto-analyzes and categorizes error
2. **Pattern Evolution**: Successful fixes auto-update CLAUDE_PATTERNS.md
3. **Knowledge Cleanup**: Outdated error info auto-expires and gets removed
4. **Prevention Upgrade**: Error patterns become future prevention rules

**🎯 Decision Trees:**
```
Database change needed?
├─ YES → Use executeWithQueue() → Check TaskDatabase patterns
└─ NO → Continue

UI styling needed?  
├─ YES → Check isDark theme → Use dynamic styles pattern
└─ NO → Continue

Animation needed?
├─ YES → STOP! Use Animated API only (Reanimated disabled)
└─ NO → Continue

New Context needed?
├─ YES → Check provider hierarchy → Follow exact order
└─ NO → Continue
```

## 📚 Reference Links

- **[CLAUDE_PATTERNS.md](./CLAUDE_PATTERNS.md)** - All implementation patterns and code examples
- **[CLAUDE_DEBUG_LOG.md](./CLAUDE_DEBUG_LOG.md)** - Error tracking and debugging workflows  
- **[CLAUDE_QUICK_HELP.md](./CLAUDE_QUICK_HELP.md)** - ⚡ Instant solutions for common problems (NEW!)

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