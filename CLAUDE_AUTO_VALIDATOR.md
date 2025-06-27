# Claude Auto-Validator - Self-Checking System

**🎯 Purpose:** Automatically validate and cleanup Claude documentation and patterns  
**🔄 Auto-runs:** Before any major code generation or when triggered

## ✅ Validation Checks

### 📋 Documentation Health Check
```markdown
□ All links working? (CLAUDE.md ↔ CLAUDE_PATTERNS.md ↔ CLAUDE_DEBUG_LOG.md)
□ No broken cross-references?
□ Pattern examples actually work?
□ Error log not cluttered with old entries?
□ Quick help examples up to date?
```

### 🧹 Auto-Cleanup Rules

#### Stale Error Removal
```javascript
// Automatically remove errors older than:
const cleanupRules = {
  resolvedErrors: '90 days',      // Move to archive
  archivedErrors: '1 year',       // Delete completely  
  duplicateErrors: 'immediate',   // Consolidate into pattern
  outdatedTechErrors: 'immediate' // Remove when deps change
};
```

#### Pattern Freshness Check
```javascript
// Automatically flag patterns that:
const patternChecks = {
  unusedFor6Months: 'archive',           // Move to deprecated
  causingErrors: 'flag for review',      // Add warning
  hasNewerAlternative: 'deprecate',      // Add migration guide
  performancePoor: 'benchmark and flag' // Compare with alternatives
};
```

### 🔍 Code Quality Validation

#### Critical Constraint Compliance
```typescript
// Auto-scan for violations:
const violations = [
  // Database operations
  /await db\.run\(/g,              // ❌ Missing executeWithQueue
  /await.*Database\.[^(]*\(/g,     // ❌ Direct database calls
  
  // Hardcoded colors  
  /#[0-9A-Fa-f]{6}/g,             // ❌ Hex colors in styles
  /backgroundColor:\s*['"][^'")]/g, // ❌ Static background colors
  
  // Reanimated usage (disabled)
  /react-native-reanimated/g,      // ❌ Reanimated imports
  /useSharedValue|useAnimatedStyle/g, // ❌ Reanimated hooks
  
  // Provider hierarchy
  /<(?!Theme).*Provider>/g,        // ❌ Wrong provider order
];
```

#### Performance Anti-Patterns
```typescript
// Flag performance issues:
const performanceFlags = [
  /new Date\(\)/g,                 // Use dayjs instead
  /\.map\(.*\.map\(/g,            // Nested maps
  /useEffect\(\(\) => {[^}]*setState/, // State in useEffect
  /console\.log/g,                 // Console logs in production
];
```

## 🚀 Auto-Improvement Suggestions

### Smart Pattern Evolution
```typescript
interface PatternEvolution {
  // Track pattern usage and suggest improvements
  usageCount: number;
  errorRate: number;
  performanceScore: number;
  suggestionForImprovement?: string;
  
  // Auto-generate better version when:
  autoUpgrade: {
    errorRateOver: 5,        // 5% error rate → suggest review
    performanceUnder: 80,    // Below 80% score → benchmark alternatives
    unusedFor: '6 months',   // Archive if not used
  };
}
```

### Knowledge Freshness Score
```typescript
// Rate documentation freshness
const freshnessScore = {
  patterns: calculateFreshness(lastUpdated, usageFrequency),
  errors: calculateRelevance(errorAge, resolutionSuccess),
  examples: validateCodeExamples(syntaxCheck, compileCheck),
  
  // Auto-actions based on score:
  score_90_100: 'excellent',      // No action needed
  score_70_89: 'refresh_examples', // Update code examples  
  score_50_69: 'review_patterns',  // Flag for human review
  score_below_50: 'auto_archive',  // Move to deprecated
};
```

## 🔧 Maintenance Automation

### Daily Auto-Tasks
```bash
#!/bin/bash
# Auto-run maintenance (can be triggered manually)

# 1. Check all documentation links
echo "🔗 Validating cross-references..."

# 2. Scan for code violations  
echo "🔍 Scanning for critical constraint violations..."

# 3. Update pattern usage statistics
echo "📊 Updating pattern metrics..."

# 4. Clean up old errors
echo "🧹 Cleaning up stale errors..."

# 5. Generate freshness report
echo "📈 Generating documentation health report..."
```

### Auto-Archive System
```typescript
// Automatically move outdated content
const archiveSystem = {
  errors: {
    resolved_90_days: () => moveToArchive('CLAUDE_DEBUG_LOG.md'),
    archived_1_year: () => deleteFromArchive(),
  },
  
  patterns: {
    unused_6_months: () => deprecatePattern(),
    error_prone: () => flagForReview(),
    superseded: () => addMigrationGuide(),
  },
  
  examples: {
    syntax_error: () => flagForUpdate(),
    deprecated_api: () => autoUpdateIfPossible(),
  }
};
```

## 📊 Health Dashboard

### Current Documentation Health
```
📋 Documentation Links: ✅ 100% working
🔗 Cross-references: ✅ All valid  
💻 Code Examples: ✅ All syntactically correct
🧹 Error Log: ✅ No stale entries
⚡ Quick Help: ✅ Up to date
📈 Pattern Usage: ✅ All patterns active
```

### Auto-Improvement Opportunities
```
🎯 Identified 0 patterns for optimization
🗑️ Found 0 stale errors for cleanup  
🔄 0 deprecated patterns need migration guides
⚡ 0 performance improvements suggested
📚 Documentation freshness: 100%
```

## 🚨 Alert System

### Automatic Flags
```typescript
// When to alert for human intervention:
const alertConditions = {
  critical: [
    'major_api_breaking_change',
    'security_vulnerability_in_pattern',  
    'documentation_inconsistency_detected'
  ],
  
  warning: [
    'pattern_error_rate_above_5_percent',
    'documentation_older_than_6_months',
    'broken_links_detected'
  ],
  
  info: [
    'new_pattern_suggestion_available',
    'performance_improvement_opportunity',
    'unused_pattern_cleanup_ready'
  ]
};
```

### Human Review Triggers
```markdown
🚨 **REQUIRES HUMAN REVIEW:**
- [ ] New React Native version released (check compatibility)
- [ ] Major dependency update (validate all patterns)  
- [ ] Error rate spike detected (investigate root cause)
- [ ] Performance regression (benchmark and fix)
- [ ] Documentation drift detected (realign with codebase)
```

## 🔄 Version Control Integration

### Auto-Git Integration
```bash
# Automatically commit documentation updates
git add CLAUDE*.md
git commit -m "docs: auto-update documentation health

- Cleaned up stale errors  
- Updated pattern metrics
- Validated all cross-references
- Freshness score: 95%

🤖 Auto-generated by Claude Validator"
```

### Change Detection
```typescript
// Track what changed and why
interface DocumentationChange {
  file: string;
  changeType: 'cleanup' | 'update' | 'deprecation' | 'new_pattern';
  reason: string;
  impactLevel: 'low' | 'medium' | 'high';
  autoApproved: boolean;
}
```

---

**🎯 Goal:** Keep Claude documentation lean, accurate, and automatically improving  
**📅 Last Validation:** 2024-12-19  
**🔄 Next Auto-Check:** Triggered on next major code generation

*This validator ensures Claude documentation stays fresh and effective without manual maintenance overhead.*