#!/bin/bash
# Read JSON input from stdin (contains file_path and edits)
input=$(cat)

# Extract the file path from the JSON
file_path=$(echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*: *"//;s/"$//')

# Only format supported file types
case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.md)
    npx prettier --write "$file_path" 2>/dev/null
    ;;
esac

exit 0
