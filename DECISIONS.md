# Bo-Blog UI 架构决策记录

记录项目中的架构设计决策及其原因，供后续开发参考。

---

## 001 - 间距 CSS 变量不放在 size.scss

**日期**：2026-02-12

**决策**：`--boblog-spacing-*` 间距 CSS 变量保留在 `src/base/variables.css`，不移入 `src/base/size.scss`。

**原因**：
1. `variables.css` 是全局 CSS 变量的统一定义位置，所有 `--boblog-*` 变量（颜色、字体、圆角、间距等）集中管理在那里
2. `size.scss` 是工具类文件，负责生成 `.boblog-m-*` / `.boblog-p-*` 等可直接使用的 class
3. CSS 变量定义和工具类是不同层级：
   - 变量 = 被引用的值（定义在 `variables.css`）
   - 工具类 = 可直接使用的 class（定义在 `size.scss`）
4. 将间距变量拆出会破坏「所有变量集中管理」的一致性

**相关文件**：
- 间距变量定义：`src/base/variables.css`（第 119-126 行）
- 间距工具类：`src/base/size.scss`
