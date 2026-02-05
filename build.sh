#!/bin/bash
# Bo-Blog UI 构建脚本
# 按顺序合并所有 CSS 和 JS 源文件到 dist/ 目录

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="$SCRIPT_DIR/src"
DIST_DIR="$SCRIPT_DIR/dist"

# 创建 dist 目录
mkdir -p "$DIST_DIR"

# 复制字体文件到 dist/fonts/
mkdir -p "$DIST_DIR/fonts"
cp -f "$SRC_DIR/fonts/"*.woff2 "$DIST_DIR/fonts/" 2>/dev/null || true

# 复制 vendor 文件到 dist/
cp -f "$SRC_DIR/vendor/marked.min.js" "$DIST_DIR/" 2>/dev/null || true

# ==================================================
# CSS 构建
# 合并顺序：base → controls → components → frontend → layout
# ==================================================
CSS_FILES=(
    # 基础层
    "$SRC_DIR/base/fonts.css"
    "$SRC_DIR/base/variables.css"
    "$SRC_DIR/base/reset.css"
    "$SRC_DIR/base/typography.css"

    # 控件层
    "$SRC_DIR/controls/button.css"
    "$SRC_DIR/controls/input.css"
    "$SRC_DIR/controls/select.css"
    "$SRC_DIR/controls/checkbox.css"
    "$SRC_DIR/controls/radio.css"
    "$SRC_DIR/controls/textarea.css"
    "$SRC_DIR/controls/image.css"
    "$SRC_DIR/controls/progress-bar.css"
    "$SRC_DIR/controls/border.css"

    # 组件层
    "$SRC_DIR/components/editor.css"
    "$SRC_DIR/components/date-picker.css"
    "$SRC_DIR/components/rating.css"
    "$SRC_DIR/components/slider.css"
    "$SRC_DIR/components/table.css"
    "$SRC_DIR/components/tree.css"
    "$SRC_DIR/components/badge.css"
    "$SRC_DIR/components/stat-card.css"
    "$SRC_DIR/components/timeline.css"
    "$SRC_DIR/components/codeblock.css"
    "$SRC_DIR/components/blockquote.css"
    "$SRC_DIR/components/tabs.css"
    "$SRC_DIR/components/toc.css"
    "$SRC_DIR/components/pagination.css"
    "$SRC_DIR/components/breadcrumb.css"
    "$SRC_DIR/components/modal.css"
    "$SRC_DIR/components/message.css"
    "$SRC_DIR/components/empty-state.css"
    "$SRC_DIR/components/panel.css"

    # 布局层
    "$SRC_DIR/layout/grid.css"
    "$SRC_DIR/layout/page-structure.css"
    "$SRC_DIR/layout/responsive.css"
    "$SRC_DIR/layout/form-layout.css"
    "$SRC_DIR/layout/doc-layout.css"
    "$SRC_DIR/layout/nav-menu.css"

    # 前台专属
    "$SRC_DIR/frontend/date-card.css"
    "$SRC_DIR/frontend/sidebar-panel.css"
    "$SRC_DIR/frontend/article-list.css"
    "$SRC_DIR/frontend/comment.css"
)

CSS_OUTPUT="$DIST_DIR/boblog-ui.css"
CSS_OUTPUT_MIN="$DIST_DIR/boblog-ui.min.css"

echo "Building boblog-ui.css..."

# 写入 CSS 文件头
cat > "$CSS_OUTPUT" << 'EOF'
/**
 * Bo-Blog UI v1.0.0
 * 基于 Bo-Blog V2.1 Default Skin 的 UI 组件库
 * 蓝白配色 | 无圆角 | Tahoma 字体 | 12px 基础字号
 */

EOF

# 按顺序合并 CSS 文件
for file in "${CSS_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "" >> "$CSS_OUTPUT"
        cat "$file" >> "$CSS_OUTPUT"
        echo "" >> "$CSS_OUTPUT"
    else
        echo "WARNING: $file not found, skipping."
    fi
done

echo "  → $CSS_OUTPUT ($(wc -c < "$CSS_OUTPUT" | tr -d ' ') bytes)"

# CSS 压缩版本
if command -v esbuild &> /dev/null; then
    echo "Minifying CSS..."
    esbuild --minify "$CSS_OUTPUT" --outfile="$CSS_OUTPUT_MIN"
    CSS_FULL_SIZE=$(wc -c < "$CSS_OUTPUT" | tr -d ' ')
    CSS_MIN_SIZE=$(wc -c < "$CSS_OUTPUT_MIN" | tr -d ' ')
    CSS_RATIO=$(( (CSS_FULL_SIZE - CSS_MIN_SIZE) * 100 / CSS_FULL_SIZE ))
    echo "  → $CSS_OUTPUT_MIN (${CSS_MIN_SIZE} bytes, ${CSS_RATIO}% smaller)"
else
    echo "WARNING: esbuild not found, skipping CSS minification."
fi


# ==================================================
# JS 构建
# 合并顺序：prism（语法高亮引擎）→ codeblock → toc → tabs → input（密码切换）→ select → textarea → table → lunar（农历/节气）→ date-picker
# ==================================================
JS_FILES=(
    "$SRC_DIR/vendor/prism/prism.min.js"
    "$SRC_DIR/vendor/prism/prism-markdown.min.js"
    "$SRC_DIR/js/codeblock.js"
    "$SRC_DIR/js/toc.js"
    "$SRC_DIR/js/tabs.js"
    "$SRC_DIR/js/input.js"
    "$SRC_DIR/js/select.js"
    "$SRC_DIR/js/textarea.js"
    "$SRC_DIR/js/table.js"
    "$SRC_DIR/js/lunar.js"
    "$SRC_DIR/js/date-picker.js"
    "$SRC_DIR/js/tree.js"
    "$SRC_DIR/js/image.js"
    "$SRC_DIR/js/slider.js"
    "$SRC_DIR/js/rating.js"
    "$SRC_DIR/js/editor.js"
)

JS_OUTPUT="$DIST_DIR/boblog-ui.js"
JS_OUTPUT_MIN="$DIST_DIR/boblog-ui.min.js"

echo ""
echo "Building boblog-ui.js..."

# 写入 JS 文件头
cat > "$JS_OUTPUT" << 'EOF'
/**
 * Bo-Blog UI v1.0.0 - JavaScript 组件
 * Prism.js 语法高亮引擎 + 代码块（行号、复制）+ 浮动目录（生成、折叠、滚动高亮）+ Tab 切换面板 + 自定义下拉选择 + 文本域字符计数 + 表格排序 + 日期选择器格式化
 */

/* 禁用 Prism.js 自动高亮，由 codeblock.js 统一控制高亮时机 */
window.Prism = window.Prism || {};
window.Prism.manual = true;

EOF

# 按顺序合并 JS 文件
for file in "${JS_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "" >> "$JS_OUTPUT"
        cat "$file" >> "$JS_OUTPUT"
        echo "" >> "$JS_OUTPUT"
    else
        echo "WARNING: $file not found, skipping."
    fi
done

echo "  → $JS_OUTPUT ($(wc -c < "$JS_OUTPUT" | tr -d ' ') bytes)"

# JS 压缩版本
if command -v esbuild &> /dev/null; then
    echo "Minifying JS..."
    esbuild --minify "$JS_OUTPUT" --outfile="$JS_OUTPUT_MIN"
    JS_FULL_SIZE=$(wc -c < "$JS_OUTPUT" | tr -d ' ')
    JS_MIN_SIZE=$(wc -c < "$JS_OUTPUT_MIN" | tr -d ' ')
    JS_RATIO=$(( (JS_FULL_SIZE - JS_MIN_SIZE) * 100 / JS_FULL_SIZE ))
    echo "  → $JS_OUTPUT_MIN (${JS_MIN_SIZE} bytes, ${JS_RATIO}% smaller)"
else
    echo "WARNING: esbuild not found, skipping JS minification."
fi

# ==================================================
# 文档构建
# ==================================================
echo ""
"$SCRIPT_DIR/build-docs.sh"

echo ""
echo "Build complete."
