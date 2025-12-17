#!/bin/bash

# Script to update IDLs from bitquery/solana-idl-lib repo

REPO_OWNER="bitquery"
REPO_NAME="solana-idl-lib"
BASE_URL="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents"

echo "Fetching protocol directories from ${REPO_OWNER}/${REPO_NAME}..."

# Get list of directories
DIRS=$(curl -s "${BASE_URL}" | jq -r '.[] | select(.type=="dir") | .name' | grep -v "^\.idea$")

COUNT=0
UPDATED=0

for dir in $DIRS; do
    echo ""
    echo "Processing: $dir"

    # Get JSON files in this directory
    JSON_FILES=$(curl -s "${BASE_URL}/${dir}" | jq -r '.[] | select(.name | endswith(".json")) | .name')

    if [ -z "$JSON_FILES" ]; then
        echo "  No JSON files found in $dir"
        continue
    fi

    for file in $JSON_FILES; do
        COUNT=$((COUNT + 1))
        echo "  Downloading: $dir/$file"

        # Download the IDL
        RAW_URL="https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${dir}/${file}"

        # Determine target path
        # For protocols with single IDL, use protocol name
        # For protocols with multiple IDLs, use protocol-file pattern
        FILE_COUNT=$(echo "$JSON_FILES" | wc -l)

        if [ "$FILE_COUNT" -eq 1 ]; then
            # Single IDL - use simple protocol name
            TARGET="IDLs/${dir}IDL.json"
        else
            # Multiple IDLs - use protocol-filename pattern
            BASENAME=$(basename "$file" .json)
            TARGET="IDLs/${dir}-${BASENAME}IDL.json"
        fi

        # Download
        if curl -s "$RAW_URL" -o "$TARGET"; then
            # Validate JSON
            if jq empty "$TARGET" 2>/dev/null; then
                UPDATED=$((UPDATED + 1))
                echo "  ✓ Saved to $TARGET"
            else
                echo "  ✗ Invalid JSON, removing $TARGET"
                rm "$TARGET"
            fi
        else
            echo "  ✗ Failed to download $RAW_URL"
        fi
    done
done

echo ""
echo "================================================"
echo "Summary:"
echo "  Total files processed: $COUNT"
echo "  Successfully updated: $UPDATED"
echo "================================================"
