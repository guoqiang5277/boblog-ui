Prism.js v1.29.0 — 语法高亮引擎
来源：https://prismjs.com/
许可：MIT License

文件说明：
  prism.js         — 非压缩版（可读源码，约 139KB）
  prism.min.js     — 压缩版（构建用，约 69KB）
  components/      — 各组件非压缩版（单独文件）
  components-min/  — 各组件压缩版（单独文件）

本目录为定制打包版本，包含以下组件：

核心（Core）：
  - prism-core — Prism 核心引擎

内置语言（4种）：
  - markup    — HTML / XML / SVG
  - css       — CSS
  - clike     — C-like（C / C++ / Java / C# 等的基础语法）
  - javascript — JavaScript

插件（1种）：
  - markup-templating — 模板语言支持（PHP 等模板语言的必要依赖）

扩展语言（16种）：
  - c          — C（依赖 clike）
  - cpp        — C++（依赖 c）
  - php        — PHP（依赖 markup + clike + markup-templating）
  - python     — Python
  - csharp     — C#（依赖 clike）
  - java       — Java（依赖 clike）
  - go         — Go（依赖 clike）
  - sql        — SQL
  - bash       — Bash / Shell
  - json       — JSON
  - typescript — TypeScript（依赖 javascript）
  - ruby       — Ruby
  - rust       — Rust
  - yaml       — YAML
  - markdown   — Markdown（依赖 markup）
  - docker     — Dockerfile

构建方式：
  从 cdnjs.cloudflare.com 下载各组件并按依赖顺序合并为单个文件。
  注意：core 已内置 markup/css/clike/javascript，无需单独下载这四种语言。

合并顺序：
  core（含 markup + css + clike + javascript）→ markup-templating →
  c → cpp → php → python → csharp → java → go → sql → bash →
  json → typescript → ruby → rust → yaml → markdown → docker

文件大小：
  prism.js     约 139KB（非压缩）
  prism.min.js 约 69KB（压缩）
