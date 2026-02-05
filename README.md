# Bo-Blog UI

**版本：v1.0.0**

基于 Bo-Blog V2.1 Default Skin 的 UI 组件库。蓝白配色，无圆角，Tahoma 字体，12px 基础字号。

## 目录结构

```
boblog-ui/
├── src/              源文件
│   ├── base/         基础层（变量、重置、排版）
│   ├── controls/     控件层（按钮、输入框、选择框等）
│   ├── components/   组件层（表格、表单、分页、导航等）
│   ├── frontend/     前台专属（日期卡片、文章列表、评论等）
│   ├── layout/       布局层（网格、页面结构、响应式）
│   ├── js/           JavaScript 组件
│   ├── fonts/        字体文件
│   └── vendor/       第三方 JS 库（Prism、Marked 等）
├── lib/              第三方库（TinyMCE 等）
├── dist/             构建产物
├── docs/             HTML 活文档（规范说明 + 效果演示 + 源码）
├── build.sh          构建脚本
└── build-docs.sh     文档构建脚本
```

## 编译

- **必需**：bash、perl（macOS/Linux 自带）
- **推荐**：[esbuild](https://esbuild.github.io/)（Go，极快，支持 CSS/JS 压缩，压缩率 ~45-55%）
- **富文本编辑器**：TinyMCE 7.x（需自行下载并放置到 `lib/tinymce/` 目录）

```bash
# macOS
brew install esbuild

# Linux（下载预编译二进制）
curl -fsSL https://esbuild.github.io/dl/latest | sh
# 或通过包管理器
# Arch: pacman -S esbuild
# Alpine: apk add esbuild

# Windows
# Scoop: scoop install esbuild
# Chocolatey: choco install esbuild

# 通用（需要 Go 环境）
go install github.com/evanw/esbuild/cmd/esbuild@latest
```

## 构建

```bash
# 构建 CSS 和 JS
./build.sh
```

构建产物：
- `dist/boblog-ui.css` - CSS 完整版
- `dist/boblog-ui.min.css` - CSS 压缩版
- `dist/boblog-ui.js` - JS 完整版
- `dist/boblog-ui.min.js` - JS 压缩版
- `dist/fonts/` - 内嵌字体文件
- `dist/marked.min.js` - Markdown 解析器

压缩需要 esbuild，未安装则跳过压缩步骤。

## 使用

项目中引入 CSS 和 JS 文件：

```html
<link rel="stylesheet" href="/path/to/dist/boblog-ui.css">
<script src="/path/to/dist/boblog-ui.js"></script>
```

所有 CSS 类名使用 `boblog-` 前缀，JS 组件挂载在 `window.BoblogUI` 命名空间下。

基础示例：

```html
<!-- 按钮 -->
<button class="boblog-btn boblog-btn-primary">主要按钮</button>

<!-- 表格 -->
<table class="boblog-table boblog-table-bordered">...</table>

<!-- 表单 -->
<input type="text" class="boblog-input" placeholder="请输入">
```

更多组件和完整示例，请查看 `docs/index.html` 文档。

## 文档

打开 `docs/index.html` 查看完整的设计规范和交互演示。

## 色彩体系

| 变量名 | 色值 | 用途 |
|--------|------|------|
| `--boblog-blue-primary` | `#0D80BD` | 主题蓝，标题/链接 |
| `--boblog-blue-header` | `#2E93C9` | 头部蓝，日期月份背景 |
| `--boblog-blue-border` | `#6BAED6` | 主要边框 |
| `--boblog-blue-border-light` | `#7DBEE0` | 次要边框 |
| `--boblog-blue-border-list` | `#A8CCE8` | 列表分隔线 |
| `--boblog-bg-content` | `#E8F4FC` | 内容区浅蓝背景 |
| `--boblog-bg-panel` | `#EAF3FB` | 面板背景 |
| `--boblog-text-dark` | `#222222` | 主文字 |
| `--boblog-text-gray` | `#666666` | 辅助文字 |

## 第三方依赖

本项目使用了以下第三方库：

### 必需（需自行下载）
- **[TinyMCE 7.x](https://www.tiny.cloud/)** - 富文本编辑器
  - 许可证：LGPL-2.1（开源版本）
  - 放置位置：`lib/tinymce/`

### 已内置
- **[Prism.js](https://prismjs.com/)** - 代码高亮
  - 许可证：MIT
  - 位置：`src/vendor/prism/`

- **[Marked](https://marked.js.org/)** - Markdown 解析器
  - 许可证：MIT
  - 位置：`src/vendor/marked.min.js`

### 字体
- FiraCode、JetBrains Mono、Source Code Pro、Cascadia Code
  - 位置：`src/fonts/`
  - 用途：代码显示

## 链接

- [GitHub 仓库](https://github.com/guoqiang5277/boblog-ui)
