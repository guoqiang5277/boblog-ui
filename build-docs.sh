#!/bin/bash
# 文档构建脚本
# 将 md 文件内容注入到 HTML 文档中

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCS_DIR="$SCRIPT_DIR/docs"

echo "Building docs..."

# 注入目录结构.md 到 naming.html
if [ -f "$DOCS_DIR/目录结构.md" ] && [ -f "$DOCS_DIR/naming.html" ]; then
    # 找到 dirStructureCode 所在行号
    START_LINE=$(grep -n '<code id="dirStructureCode"' "$DOCS_DIR/naming.html" | cut -d: -f1)
    # 找到对应的 </code></pre> 行号
    END_LINE=$(grep -n '</code></pre>' "$DOCS_DIR/naming.html" | head -1 | cut -d: -f1)
    if [ -n "$START_LINE" ] && [ -n "$END_LINE" ]; then
        {
            # 头部（保留 code 开标签及其属性）
            head -n "$START_LINE" "$DOCS_DIR/naming.html" | sed '$ s/\(<code id="dirStructureCode"[^>]*>\).*/\1/'
            # md 内容
            cat "$DOCS_DIR/目录结构.md"
            # 闭标签及尾部（跳过原 </code></pre> 行，重新输出）
            echo '</code></pre>'
            tail -n +"$((END_LINE + 1))" "$DOCS_DIR/naming.html"
        } > "$DOCS_DIR/naming.html.tmp" && mv "$DOCS_DIR/naming.html.tmp" "$DOCS_DIR/naming.html"
        echo "  → naming.html (目录结构.md 已注入)"
    else
        echo "  WARNING: <code id=\"dirStructureCode\"> or </code></pre> not found in naming.html"
    fi
fi
