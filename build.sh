#!/bin/bash
# Bo-Blog UI 构建脚本
# 按顺序合并所有 CSS 和 JS 源文件到 dist/ 目录
# 支持 CSS/SCSS 混合编译：src/ 下的 .scss 文件会自动编译为 .css 后参与合并

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="$SCRIPT_DIR/src"
DIST_DIR="$SCRIPT_DIR/dist"
SASS_BIN="$SCRIPT_DIR/bin/dart-sass/sass"   # Dart Sass 二进制路径

# 读取版本号和构建号
VERSION=$(cat "$SCRIPT_DIR/VERSION" | tr -d '[:space:]')
BUILD_NUM=$(cat "$SCRIPT_DIR/BUILD" | tr -d '[:space:]')

# 如果存在 BUILD_LOCAL，比较并使用较大的值
if [ -f "$SCRIPT_DIR/BUILD_LOCAL" ]; then
    BUILD_LOCAL=$(cat "$SCRIPT_DIR/BUILD_LOCAL" | tr -d '[:space:]')
    if [ "$BUILD_LOCAL" -gt "$BUILD_NUM" ]; then
        BUILD_NUM="$BUILD_LOCAL"
        echo "📌 Using BUILD_LOCAL: $BUILD_NUM"
    fi
    # 每次构建自动递增 BUILD_LOCAL
    BUILD_LOCAL=$((BUILD_LOCAL + 1))
    echo "$BUILD_LOCAL" > "$SCRIPT_DIR/BUILD_LOCAL"
fi

# 检查是否为发布构建
if [ "$1" = "--release" ]; then
    # 递增构建号
    BUILD_NUM=$((BUILD_NUM + 1))
    echo "$BUILD_NUM" > "$SCRIPT_DIR/BUILD"
    echo "🚀 Release build: build $BUILD_NUM"
fi

FULL_VERSION="${VERSION}-build.${BUILD_NUM}"

# 创建 dist 目录
mkdir -p "$DIST_DIR"

# 复制字体文件到 dist/fonts/
mkdir -p "$DIST_DIR/fonts"
cp -f "$SRC_DIR/fonts/"*.woff2 "$DIST_DIR/fonts/" 2>/dev/null || true

# 复制 vendor 文件到 dist/
cp -f "$SRC_DIR/vendor/marked.min.js" "$DIST_DIR/" 2>/dev/null || true

# ==================================================
# CSS 构建
# 通过 src/main.scss 统一编译（Dart Sass），支持跨文件 @extend
# 合并顺序由 main.scss 中的 @import 声明控制
# ==================================================
CSS_OUTPUT="$DIST_DIR/boblog-ui.css"
CSS_OUTPUT_MIN="$DIST_DIR/boblog-ui.min.css"
CSS_TMP="$DIST_DIR/.boblog-ui-raw.css"

echo "Building boblog-ui.css..."

# 检查 Dart Sass
if [ ! -x "$SASS_BIN" ]; then
    echo "ERROR: Dart Sass 未找到: $SASS_BIN"
    echo "  请确认 bin/dart-sass/ 目录存在且包含 sass 可执行文件"
    exit 1
fi

# Dart Sass 统一编译 main.scss → 临时文件
"$SASS_BIN" --no-source-map --no-charset --silence-deprecation=import "$SRC_DIR/main.scss" "$CSS_TMP"

# 写入文件头 + 编译结果
cat > "$CSS_OUTPUT" << EOF
/**
 * Bo-Blog UI v${FULL_VERSION}
 * 基于 Bo-Blog V2.1 Default Skin 的 UI 组件库
 * 蓝白配色 | 无圆角 | Tahoma 字体 | 12px 基础字号
 */

EOF
cat "$CSS_TMP" >> "$CSS_OUTPUT"
rm -f "$CSS_TMP"

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
    "$SRC_DIR/js/pinyin.js"
    "$SRC_DIR/js/date-picker.js"
    "$SRC_DIR/js/tree.js"
    "$SRC_DIR/js/image.js"
    "$SRC_DIR/js/slider.js"
    "$SRC_DIR/js/rating.js"
    "$SRC_DIR/js/editor.js"
    "$SRC_DIR/js/accordion.js"
    "$SRC_DIR/js/modal.js"
    "$SRC_DIR/js/form-validation.js"
    "$SRC_DIR/js/tag-input.js"
    "$SRC_DIR/js/tree-select.js"
    "$SRC_DIR/js/dropdown.js"
    "$SRC_DIR/js/upload-area.js"
)

JS_OUTPUT="$DIST_DIR/boblog-ui.js"
JS_OUTPUT_MIN="$DIST_DIR/boblog-ui.min.js"

echo ""
echo "Building boblog-ui.js..."

# 写入 JS 文件头
cat > "$JS_OUTPUT" << EOF
/**
 * Bo-Blog UI v${FULL_VERSION} - JavaScript 组件
 * Prism.js 语法高亮引擎 + 代码块（行号、复制）+ 浮动目录（生成、折叠、滚动高亮）+ Tab 切换面板 + 自定义下拉选择 + 文本域字符计数 + 表格排序 + 日期选择器格式化
 */

/* 版本信息 */
window.BoblogUI = window.BoblogUI || {};
window.BoblogUI.version = '${VERSION}';
window.BoblogUI.build = '${BUILD_NUM}';
window.BoblogUI.fullVersion = '${FULL_VERSION}';

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
