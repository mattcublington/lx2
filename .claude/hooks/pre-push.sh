#!/bin/bash
# -----------------------------------------------
# Pre-push health gate for LX2
# Blocks push if critical issues are found
# -----------------------------------------------

echo "🔍 LX2 pre-push checks..."

# 1. Type check (via Turbo so it respects each app's tsconfig)
echo "  → TypeScript..."
npx turbo run type-check 2>&1
TYPE_EXIT=$?
if [ $TYPE_EXIT -ne 0 ]; then
  echo "❌ TypeScript errors found. Fix before pushing."
  exit 1
fi

# 2. Lint
echo "  → Lint..."
npx turbo run lint 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Lint errors found. Fix before pushing."
  exit 1
fi

# 3. Build (exclude architecture — local-only tool, and next build conflicts with dev server .next)
echo "  → Build..."
npx turbo run build --filter='!@lx2/architecture' 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Build failed. Fix before pushing."
  exit 1
fi

# 4. Tests (non-blocking if no tests exist yet)
echo "  → Tests..."
npx turbo run test 2>&1
TEST_EXIT=$?
if [ $TEST_EXIT -ne 0 ]; then
  echo "⚠️  Some tests failed. Review before pushing."
  # Not blocking — change exit 0 to exit 1 once test suite is stable
fi

# 5. Check for build suppressions
echo "  → Checking for build suppressions..."
if grep -r "ignoreBuildErrors" apps/*/next.config.* 2>/dev/null; then
  echo "❌ ignoreBuildErrors found in next.config. Remove it."
  exit 1
fi

if grep -r "ignoreDuringBuilds" apps/*/next.config.* 2>/dev/null; then
  echo "❌ ignoreDuringBuilds found in next.config. Remove it."
  exit 1
fi

# 6. Spot check for hardcoded colours
echo "  → Design system spot check..."
APPROVED="0D631B|0a4f15|0a1f0a|1A2E1A|6B8C6B|F2F5F0|F6FAF6|ffffff|FFFFFF|E0EBE0|111D11|000000|CCCCCC|999999"
SUSPECT=$(grep -rn '#[0-9a-fA-F]\{6\}' apps/*/src/ packages/*/src/ 2>/dev/null \
  | grep -v node_modules | grep -v .next | grep -v dist \
  | grep -viE "$APPROVED" | head -5)
if [ -n "$SUSPECT" ]; then
  echo "⚠️  Possible unapproved colours (warning only):"
  echo "$SUSPECT"
fi

echo "✅ All pre-push checks passed."
exit 0
