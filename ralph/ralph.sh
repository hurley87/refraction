#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./ralph.sh [max_iterations]

set -e

MAX_ITERATIONS=${1:-10}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")
  
  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    # Archive the previous run
    DATE=$(date +%Y-%m-%d)
    # Strip "ralph/" prefix from branch name for folder
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"
    
    echo "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"
    
    # Reset progress file for new run
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

echo "Starting Ralph - Max iterations: $MAX_ITERATIONS"

# Show PRD summary
if [ -f "$PRD_FILE" ]; then
  TOTAL_STORIES=$(jq '.stories | length' "$PRD_FILE" 2>/dev/null || echo "0")
  COMPLETED=$(jq '[.stories[] | select(.passes == true)] | length' "$PRD_FILE" 2>/dev/null || echo "0")
  if [ "$TOTAL_STORIES" -gt 0 ] 2>/dev/null; then
    REMAINING=$((TOTAL_STORIES - COMPLETED))
    echo ""
    echo "📊 PRD Status: $COMPLETED/$TOTAL_STORIES stories complete ($REMAINING remaining)"
  else
    echo ""
    echo "📊 PRD Status: Unable to read story count"
  fi

  # Show next story to work on
  NEXT_STORY=$(jq -r '[.stories[] | select(.passes == false)] | sort_by(.priority) | .[0] | "\(.id): \(.title)"' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$NEXT_STORY" ] && [ "$NEXT_STORY" != "null: null" ]; then
    echo "📌 Next up: $NEXT_STORY"
  fi
fi

START_TIME=$(date +%s)

for i in $(seq 1 $MAX_ITERATIONS); do
  ITER_START=$(date +%s)
  ELAPSED=$((ITER_START - START_TIME))
  ELAPSED_MIN=$((ELAPSED / 60))
  ELAPSED_SEC=$((ELAPSED % 60))

  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  Ralph Iteration $i of $MAX_ITERATIONS"
  echo "  Started: $(date '+%H:%M:%S') | Total elapsed: ${ELAPSED_MIN}m ${ELAPSED_SEC}s"
  echo "═══════════════════════════════════════════════════════"

  # Run Claude Code with the ralph prompt
  PROMPT=$(cat "$SCRIPT_DIR/prompt.md")
  OUTPUT=$(claude -p "$PROMPT" --dangerously-skip-permissions 2>&1 | tee /dev/stderr) || true

  ITER_END=$(date +%s)
  ITER_DURATION=$((ITER_END - ITER_START))
  echo ""
  echo "⏱️  Iteration $i took ${ITER_DURATION}s"

  # Check for completion signal
  if echo "$OUTPUT" | grep -q "COMPLETE"; then
    TOTAL_TIME=$((ITER_END - START_TIME))
    TOTAL_MIN=$((TOTAL_TIME / 60))
    TOTAL_SEC=$((TOTAL_TIME % 60))
    echo ""
    echo "🎉 Ralph completed all tasks!"
    echo "   Finished at iteration $i of $MAX_ITERATIONS"
    echo "   Total time: ${TOTAL_MIN}m ${TOTAL_SEC}s"
    exit 0
  fi

  # Show updated status after iteration
  if [ -f "$PRD_FILE" ]; then
    COMPLETED=$(jq '[.stories[] | select(.passes == true)] | length' "$PRD_FILE" 2>/dev/null || echo "?")
    echo "📊 Progress: $COMPLETED/$TOTAL_STORIES stories complete"
  fi

  echo "Iteration $i complete. Starting next in 2s..."
  sleep 2
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."
exit 1