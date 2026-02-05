/**
 * Bo-Blog UI 组件 - 浮动目录导航 (toc.js)
 *
 * 功能：
 *   1. 目录自动生成   - 扫描页面标题，自动填充目录列表
 *   2. 折叠/展开切换 - 注入切换按钮，支持收起/显示目录
 *   3. 滚动高亮       - 监听滚动，高亮当前可视章节对应的目录项
 *   4. 多级目录       - 支持 h2-h6 多级标题，嵌套结构，子级可折叠
 *
 * 使用方式：
 *   方式一（自动初始化）：
 *     引入此脚本后，DOMContentLoaded 时自动扫描 .boblog-toc 元素
 *
 *   方式二（手动调用）：
 *     BoblogUI.toc.init()           — 初始化页面所有目录
 *     BoblogUI.toc.init(container)  — 只初始化指定容器内的目录
 *
 * HTML 结构约定：
 *   <div class="boblog-toc">
 *       <h4>页面目录</h4>
 *       <ul id="tocList"></ul>
 *   </div>
 *
 * data-* 属性配置（均为可选，无属性时完全向后兼容）：
 *   data-toc-source    — 扫描标题的容器选择器（如 ".article-body"）
 *   data-toc-depth     — 标题深度 2-6（默认 2，仅 h2）
 *   data-toc-collapsed — 存在时子级目录默认折叠
 *   data-toc-numbered  — 存在时显示序号索引（1. / 1.1 / 1.1.1），纯 CSS 实现
 *   data-toc-float     — 面板浮动控制：
 *                          不设置或 "true" → 固定浮动在页面右上角（默认）
 *                          "false"         → 静态嵌入文档流，不浮动
 *   data-toc-width     — 面板宽度控制：
 *                          数字值（如 "200"）→ 固定 200px 宽度
 *                          "auto" 或不设置   → 自适应宽度（120px~50vw），
 *                            由最长条目（加粗状态）撑开后自动锁定，
 *                            窗口宽度变化时自动重算
 *
 * 默认扫描范围（无 data-toc-source 时）：
 *   - .doc-section h2      — 旧灰底模板章节
 *   - .component-section h2 — 旧白底模板组件区块
 *   - .boblog-doc-section h2   — 新文档布局组件章节
 *   - .boblog-toc-source h2    — 通用标记
 *
 * 自动排除区域（以下容器内的标题不会被收录）：
 *   - .boblog-tabs-panel       — Tab 切换面板（预览/源码内的模拟标题）
 *   - .boblog-codeblock        — 代码块
 *   - .boblog-doc-demo         — 演示预览区域
 *   - [data-toc-exclude]   — 任意容器加此属性即可排除其内标题（通用）
 *
 * 依赖：
 *   - src/components/toc.css
 */

/* 全局命名空间 */
window.BoblogUI = window.BoblogUI || {};

(function () {
    'use strict';

    /* ======================================================================
       0. 内部工具函数
       ====================================================================== */

    /** 默认扫描容器选择器（与老版本行为一致） */
    var DEFAULT_SOURCES = ['.doc-section', '.component-section', '.boblog-doc-section', '.boblog-toc-source'];

    /**
     * 根据 data-toc-source 和 data-toc-depth 构建标题选择器
     *
     * 示例：
     *   buildSelector(null, 2)
     *     → ".doc-section h2, .component-section h2, .boblog-toc-source h2"
     *
     *   buildSelector(".article-body", 3)
     *     → ".article-body h2, .article-body h3"
     *
     * @param {string|null} source  — data-toc-source 值，逗号分隔的容器选择器
     * @param {number}      maxDepth — 最大标题深度（2-6）
     * @return {string} CSS 选择器字符串
     */
    function buildSelector(source, maxDepth) {
        /* 生成标题标签列表：h2, h3, ..., hN */
        var tags = [];
        for (var i = 2; i <= maxDepth; i++) {
            tags.push('h' + i);
        }

        /* 确定扫描容器 */
        var sources;
        if (source) {
            /* 自定义源：按逗号分割并去空格 */
            sources = source.split(',').map(function (s) { return s.trim(); });
        } else {
            /* 默认源 */
            sources = DEFAULT_SOURCES;
        }

        /* 拼接选择器：每个容器 × 每个标题标签 */
        var parts = [];
        sources.forEach(function (prefix) {
            tags.forEach(function (tag) {
                parts.push(prefix + ' ' + tag);
            });
        });
        return parts.join(', ');
    }

    /** 内置排除选择器：这些容器内的标题不会被收录到目录中 */
    var BUILTIN_EXCLUDES = ['.boblog-tabs-panel', '.boblog-codeblock', '.boblog-doc-demo'];

    /**
     * 从 .boblog-toc 容器读取 data 属性配置
     *
     * @param {Element} tocList — 目录列表元素（#tocList 或 .boblog-toc-list）
     * @return {Object} { source, maxDepth, collapsed }
     */
    function readConfig(tocList) {
        var tocContainer = tocList.closest('.boblog-toc');
        var sourceAttr = tocContainer ? tocContainer.getAttribute('data-toc-source') : null;
        var depthAttr = tocContainer ? tocContainer.getAttribute('data-toc-depth') : null;
        var collapsedAttr = tocContainer ? tocContainer.hasAttribute('data-toc-collapsed') : false;

        /* 深度解析：限制在 2-6 范围，默认 2 */
        var maxDepth = 2;
        if (depthAttr) {
            maxDepth = Math.min(Math.max(parseInt(depthAttr, 10) || 2, 2), 6);
        }

        return {
            source: sourceAttr,
            maxDepth: maxDepth,
            collapsed: collapsedAttr
        };
    }

    /**
     * 判断标题是否在排除区域内
     *
     * 排除规则（满足任一即排除）：
     *   1. 标题位于内置排除容器内（BUILTIN_EXCLUDES）
     *   2. 标题的某个祖先元素带有 data-toc-exclude 属性
     *
     * @param {Element} heading — 标题元素
     * @return {boolean} true 表示应排除
     */
    function isExcluded(heading) {
        /* 检查内置排除选择器 */
        for (var i = 0; i < BUILTIN_EXCLUDES.length; i++) {
            if (heading.closest(BUILTIN_EXCLUDES[i])) return true;
        }
        /* 检查祖先是否带有 data-toc-exclude 属性 */
        if (heading.closest('[data-toc-exclude]')) return true;
        return false;
    }


    /* ======================================================================
       1. 目录折叠/展开切换
       为 .boblog-toc 注入切换按钮，支持折叠与展开（整个面板级）
       ====================================================================== */

    /**
     * 为目录面板添加折叠/展开功能
     * @param {Element} [container=document] - 搜索范围
     */
    function initToggle(container) {
        var root = container || document;
        var tocs = root.querySelectorAll('.boblog-toc');

        tocs.forEach(function (toc) {
            /* 避免重复初始化 */
            if (toc.querySelector('.boblog-toc-toggle')) return;

            /* 读取 data-toc-float 属性，控制面板浮动模式
               - 不设置或 "true" → 浮动覆盖（overlay），不影响页面布局
               - "push"           → 浮动推开，自动给 body 添加 padding-right 避让
               - "false"          → 静态嵌入文档流（position: static） */
            var floatAttr = toc.getAttribute('data-toc-float');
            if (floatAttr === 'false') {
                toc.classList.add('boblog-toc--static');
            }

            /* 读取 data-toc-width 属性，支持自定义面板宽度
               - 数字值（如 "200"）→ 设为固定像素宽度
               - "auto" 或不设置 → 使用 CSS 默认的自适应宽度 */
            var widthAttr = toc.getAttribute('data-toc-width');
            if (widthAttr && widthAttr !== 'auto') {
                var widthVal = parseInt(widthAttr, 10);
                if (!isNaN(widthVal) && widthVal > 0) {
                    toc.style.width = widthVal + 'px';
                    toc.style.minWidth = 'auto';
                    toc.style.maxWidth = 'none';
                }
            }

            /* 将原有内容包裹在 .boblog-toc-body 中 */
            var body = document.createElement('div');
            body.className = 'boblog-toc-body';

            /* 把 toc 的所有子节点移入 body */
            while (toc.firstChild) {
                body.appendChild(toc.firstChild);
            }

            /* 创建切换按钮 */
            var toggleBtn = document.createElement('button');
            toggleBtn.className = 'boblog-toc-toggle';
            toggleBtn.textContent = '收起目录';
            toggleBtn.type = 'button';

            toggleBtn.addEventListener('click', function () {
                toc.classList.toggle('collapsed');
                if (toc.classList.contains('collapsed')) {
                    toggleBtn.textContent = '显示目录';
                } else {
                    toggleBtn.textContent = '收起目录';
                }
            });

            /* 按钮在前，内容在后 */
            toc.appendChild(toggleBtn);
            toc.appendChild(body);
        });
    }


    /* ======================================================================
       2. 目录自动生成
       扫描页面标题，自动填充目录列表（支持扁平和树形两种模式）
       ====================================================================== */

    /**
     * 扁平模式：生成简单的 ul > li > a 列表
     * 与老版本行为完全一致，用于 depth=2 或单级标题
     *
     * @param {Element}  tocList  — 目录 <ul> 元素
     * @param {NodeList} headings — 扫描到的标题元素集合
     */
    function generateFlat(tocList, headings) {
        headings.forEach(function (heading) {
            /* 确保标题有 id，用于锚点跳转 */
            if (!heading.id) {
                heading.id = 'section-' + Math.random().toString(36).substr(2, 6);
            }

            /* 创建目录链接项 */
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = '#' + heading.id;
            a.textContent = heading.textContent;
            li.appendChild(a);
            tocList.appendChild(li);
        });
    }

    /**
     * 树形模式：生成嵌套的多级目录结构
     *
     * 算法：用栈维护当前层级链
     *   - 遇到更深标题 → 压栈，创建子 <ul>
     *   - 遇到更浅标题 → 弹栈，回退到对应层级
     *
     * 生成结构示例：
     *   <ul>
     *     <li class="boblog-toc-item boblog-toc-level-2">
     *       <div class="boblog-toc-node">
     *         <button class="boblog-toc-arrow">▼</button>
     *         <a href="#id">h2 标题</a>
     *       </div>
     *       <ul class="boblog-toc-children">
     *         <li class="boblog-toc-item boblog-toc-level-3">
     *           <div class="boblog-toc-node">
     *             <a href="#id">h3 标题</a>
     *           </div>
     *         </li>
     *       </ul>
     *     </li>
     *   </ul>
     *
     * @param {Element}  tocList          — 目录 <ul> 根元素
     * @param {NodeList} headings         — 扫描到的标题元素集合
     * @param {boolean}  defaultCollapsed — 子级是否默认折叠
     */
    function generateTree(tocList, headings, defaultCollapsed) {
        /* 第一步：收集所有标题的层级信息 */
        var items = [];
        headings.forEach(function (heading) {
            if (!heading.id) {
                heading.id = 'section-' + Math.random().toString(36).substr(2, 6);
            }
            /* 从标签名提取级别：h2→2, h3→3 ... */
            var level = parseInt(heading.tagName.charAt(1), 10);
            items.push({ id: heading.id, text: heading.textContent, level: level });
        });

        /* 第二步：预扫描，标记每个条目是否有子级 */
        var hasChildren = [];
        for (var i = 0; i < items.length; i++) {
            hasChildren[i] = (i + 1 < items.length && items[i + 1].level > items[i].level);
        }

        /* 第三步：用栈算法构建嵌套 DOM
         * 栈每层记录 { ul: <ul>元素, level: 当前层级 }
         * 虚拟根层级为 1，确保所有 h2 都能挂载 */
        var stack = [{ ul: tocList, level: 1 }];

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var top = stack[stack.length - 1];

            /* 回退到合适层级：当前标题级别 ≤ 栈顶级别时弹栈 */
            while (stack.length > 1 && item.level <= top.level) {
                stack.pop();
                top = stack[stack.length - 1];
            }

            /* 创建 <li> 条目 */
            var li = document.createElement('li');
            li.className = 'boblog-toc-item boblog-toc-level-' + item.level;

            /* 创建 .boblog-toc-node（箭头 + 链接同一行） */
            var node = document.createElement('div');
            node.className = 'boblog-toc-node';

            /* 有子级时添加折叠箭头按钮 */
            if (hasChildren[i]) {
                var arrow = document.createElement('button');
                arrow.className = 'boblog-toc-arrow';
                arrow.type = 'button';
                /* ▶ 折叠态 / ▼ 展开态 */
                arrow.textContent = defaultCollapsed ? '\u25B6' : '\u25BC';

                /* 点击箭头切换子级显示 */
                arrow.addEventListener('click', (function (liEl) {
                    return function () {
                        liEl.classList.toggle('boblog-toc-item--collapsed');
                        this.textContent = liEl.classList.contains('boblog-toc-item--collapsed')
                            ? '\u25B6' : '\u25BC';
                    };
                })(li));

                node.appendChild(arrow);

                /* 默认折叠时添加折叠类 */
                if (defaultCollapsed) {
                    li.classList.add('boblog-toc-item--collapsed');
                }
            }

            /* 创建链接 */
            var a = document.createElement('a');
            a.href = '#' + item.id;
            a.textContent = item.text;
            node.appendChild(a);
            li.appendChild(node);

            /* 挂载到当前栈顶的 <ul> */
            top.ul.appendChild(li);

            /* 有子级时创建子 <ul> 并压栈 */
            if (hasChildren[i]) {
                var childUl = document.createElement('ul');
                childUl.className = 'boblog-toc-children';
                li.appendChild(childUl);
                stack.push({ ul: childUl, level: item.level });
            }
        }
    }

    /**
     * 目录自动生成入口
     * 读取 data 属性配置，根据深度选择扁平或树形模式
     *
     * @param {Element} [container=document] - 搜索范围
     */
    function initGenerate(container) {
        var root = container || document;

        /* 查找目录列表容器 */
        var tocList = root.getElementById
            ? (root.getElementById('tocList') || root.querySelector('.boblog-toc-list'))
            : root.querySelector('.boblog-toc-list, #tocList');
        if (!tocList) return;

        /* 读取配置 */
        var config = readConfig(tocList);

        /* 构建选择器并扫描标题 */
        var selector = buildSelector(config.source, config.maxDepth);
        var allHeadings = document.querySelectorAll(selector);
        if (allHeadings.length === 0) return;

        /* 过滤：排除嵌套在排除区域内的标题
           排除区域 = 内置（.boblog-tabs-panel、.boblog-codeblock、.boblog-doc-demo）+ 用户自定义（data-toc-exclude） */
        var headings = [];
        for (var i = 0; i < allHeadings.length; i++) {
            var h = allHeadings[i];
            if (!isExcluded(h)) {
                headings.push(h);
            }
        }
        if (headings.length === 0) return;

        /* 根据深度选择生成模式 */
        if (config.maxDepth === 2) {
            /* 扁平模式：与老版本完全一致 */
            generateFlat(tocList, headings);
        } else {
            /* 树形模式：生成嵌套结构 */
            generateTree(tocList, headings, config.collapsed);
        }
    }


    /* ======================================================================
       3. 滚动高亮
       滚动时高亮当前可视章节对应的目录项
       ====================================================================== */

    /**
     * 监听页面滚动，自动高亮当前可见章节的目录链接
     *
     * 算法：基于滚动位置判断当前章节
     *   - 从后往前遍历所有标题，找到第一个 offsetTop ≤ 滚动位置 + 偏移量 的标题
     *   - 该标题即为当前章节，高亮其对应的目录链接
     *   - 同时为其所有父级 <li> 添加 .boblog-toc-item--ancestor 类（弱高亮）
     *
     * 相比 IntersectionObserver 的优势：
     *   - 不会因内容过短导致跳过（短内容区域也能正确命中）
     *   - 确定性高，每次滚动只产生一个高亮结果
     *
     * @param {Element} [container=document] - 搜索范围
     */
    function initScrollHighlight(container) {
        var root = container || document;

        /* 查找目录列表，读取配置以构建一致的选择器 */
        var tocList = root.getElementById
            ? (root.getElementById('tocList') || root.querySelector('.boblog-toc-list'))
            : root.querySelector('.boblog-toc-list, #tocList');
        if (!tocList) return;

        var config = readConfig(tocList);
        var selector = buildSelector(config.source, config.maxDepth);

        /* 获取所有需要监听的标题元素（排除排除区域内的标题） */
        var allHeadings = document.querySelectorAll(selector);
        if (allHeadings.length === 0) return;
        var headings = [];
        for (var i = 0; i < allHeadings.length; i++) {
            var h = allHeadings[i];
            if (!isExcluded(h)) {
                headings.push(h);
            }
        }
        if (headings.length === 0) return;

        /* 获取目录中的所有链接 */
        var tocLinks = root.querySelectorAll('.boblog-toc a');
        if (tocLinks.length === 0) return;

        /* 构建 href → 链接元素的映射，加速查找 */
        var linkMap = {};
        tocLinks.forEach(function (a) {
            linkMap[a.getAttribute('href')] = a;
        });

        /* 上一次高亮的链接，避免重复操作 DOM */
        var lastActiveLink = null;

        /**
         * 核心：根据当前滚动位置确定活跃章节并高亮
         *
         * 从最后一个标题开始向前遍历，找到第一个 offsetTop ≤ scrollY + offset 的标题。
         * 偏移量 60px 用于提前触发（标题进入视口上方 60px 时即视为"当前章节"）。
         */
        function updateHighlight() {
            var scrollY = window.pageYOffset || document.documentElement.scrollTop;
            var offset = 60; /* 触发偏移量（px），标题距视口顶部此距离内即激活 */
            var activeLink = null;

            /* 从后往前找：第一个 scrollY >= heading.offsetTop - offset 的标题 */
            for (var i = headings.length - 1; i >= 0; i--) {
                if (headings[i].offsetTop <= scrollY + offset) {
                    activeLink = linkMap['#' + headings[i].id] || null;
                    break;
                }
            }

            /* 页面在最顶部且没有命中任何标题时，高亮第一个 */
            if (!activeLink && headings.length > 0) {
                activeLink = linkMap['#' + headings[0].id] || null;
            }

            /* 与上次相同则跳过，避免无谓的 DOM 操作 */
            if (activeLink === lastActiveLink) return;
            lastActiveLink = activeLink;

            /* 清除所有高亮状态 */
            tocLinks.forEach(function (a) {
                a.classList.remove('active');
            });

            /* 清除所有父级祖先高亮 */
            var ancestors = tocList.querySelectorAll('.boblog-toc-item--ancestor');
            for (var j = 0; j < ancestors.length; j++) {
                ancestors[j].classList.remove('boblog-toc-item--ancestor');
            }

            /* 设置当前高亮 */
            if (activeLink) {
                activeLink.classList.add('active');

                /* 向上遍历 DOM，为所有父级 <li.boblog-toc-item> 添加祖先高亮类 */
                var parentLi = activeLink.closest('.boblog-toc-item');
                if (parentLi) {
                    parentLi = parentLi.parentElement ? parentLi.parentElement.closest('.boblog-toc-item') : null;
                }
                while (parentLi) {
                    parentLi.classList.add('boblog-toc-item--ancestor');
                    parentLi = parentLi.parentElement ? parentLi.parentElement.closest('.boblog-toc-item') : null;
                }
            }
        }

        /* 节流：限制滚动事件的触发频率（约 60fps） */
        var ticking = false;
        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(function () {
                    updateHighlight();
                    ticking = false;
                });
                ticking = true;
            }
        });

        /* 首次加载时立即执行一次高亮 */
        updateHighlight();
    }


    /* ======================================================================
       公共 API
       ====================================================================== */

    /**
     * 初始化目录导航组件
     * 按顺序执行：折叠切换 → 目录生成 → 滚动高亮
     *
     * @param {Element} [container=document] - 可选，限定初始化范围
     */
    function init(container) {
        initToggle(container);
        initGenerate(container);

        /* 目录生成完毕后锁定面板宽度，防止高亮状态变化（bold）导致面板抖动
           仅对未通过 data-toc-width 指定固定宽度的面板生效 */
        lockTocWidth(container);

        /* 滚动高亮必须在目录生成之后执行 */
        initScrollHighlight(container);

        /* 推开模式：data-toc-float="push" 时自动给 body 添加 padding-right */
        initPushMode(container);
    }

    /**
     * 锁定目录面板宽度
     *
     * 目录内容渲染完成后，读取当前实际宽度并设为固定值。
     * 这样后续高亮状态切换（font-weight 变化）不会导致面板宽度抖动。
     * 窗口 resize 时解锁重算，再重新锁定。
     *
     * @param {Element} [container=document] - 搜索范围
     */
    function lockTocWidth(container) {
        var root = container || document;
        var tocs = root.querySelectorAll('.boblog-toc');

        tocs.forEach(function (toc) {
            /* 已通过 data-toc-width 指定固定宽度的面板不需要锁定 */
            var widthAttr = toc.getAttribute('data-toc-width');
            if (widthAttr && widthAttr !== 'auto') return;

            /* 同步测量：临时将所有链接设为 bold，模拟高亮状态下的最大宽度
               （高亮时 font-weight: bold 会使文本变宽，必须按最宽状态锁定）
               注意：读取 offsetWidth 会强制浏览器同步布局（reflow），
               所以不需要 requestAnimationFrame，直接测量即可 */
            var links = toc.querySelectorAll('a');
            for (var i = 0; i < links.length; i++) {
                links[i].style.fontWeight = 'bold';
            }
            /* 读取 offsetWidth 触发同步 reflow，得到所有链接加粗后的面板宽度 */
            var computedWidth = toc.offsetWidth;
            /* 恢复原始 font-weight（清除 inline style，回退到 CSS 规则） */
            for (var i = 0; i < links.length; i++) {
                links[i].style.fontWeight = '';
            }
            /* 锁定宽度 */
            toc.style.width = computedWidth + 'px';

            /* 窗口 resize 时解锁重算
               仅在窗口宽度真正变化时触发（防止 DevTools 等面板引起的高度变化误触发） */
            var lastWindowWidth = window.innerWidth;
            var resizeTimer = null;
            window.addEventListener('resize', function () {
                var newWidth = window.innerWidth;
                if (newWidth === lastWindowWidth) return;
                lastWindowWidth = newWidth;
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function () {
                    /* 临时解锁：恢复 auto 让浏览器重新计算 */
                    toc.style.width = 'auto';
                    /* 临时全部加粗测最大宽度，再锁定 */
                    var rl = toc.querySelectorAll('a');
                    for (var j = 0; j < rl.length; j++) rl[j].style.fontWeight = 'bold';
                    toc.style.width = toc.offsetWidth + 'px';
                    for (var j = 0; j < rl.length; j++) rl[j].style.fontWeight = '';
                }, 150);
            });
        });
    }

    /**
     * 推开模式（push）：自动给 body 添加 padding-right + border-box
     *
     * 当 data-toc-float="push" 时，目录面板仍然 fixed 定位在右侧，
     * 但通过给 body 设置 box-sizing: border-box + padding-right 使页面
     * 内容不被目录遮挡。border-box 确保 padding 挤压内容区而非扩展总宽度。
     * padding-right = TOC 实际宽度 + 右侧间距（20px）+ 额外间隙（10px）
     *
     * 同时劫持折叠按钮的点击事件：
     *   - 收起时恢复原始 box-sizing 和 padding-right
     *   - 展开时重新设置推开
     *
     * @param {Element} [container=document] - 搜索范围
     */
    function initPushMode(container) {
        var root = container || document;
        var tocs = root.querySelectorAll('.boblog-toc');

        tocs.forEach(function (toc) {
            var floatAttr = toc.getAttribute('data-toc-float');
            if (floatAttr !== 'push') return;

            /* 计算需要的避让空间：面板宽度 + right(20px) + 间隙(10px)
               通过 padding-right + box-sizing: border-box 实现推开。
               border-box 让 padding 挤压内容区，而非扩展 body 总宽度 */
            var tocWidth = toc.offsetWidth;
            var rightOffset = 20;  /* 与 CSS 中 .boblog-toc { right: 20px } 对应 */
            var gap = 10;          /* 内容与面板之间的额外间隙 */
            var pushSpace = tocWidth + rightOffset + gap;

            /* 保存原始样式 */
            var cs = window.getComputedStyle(document.body);
            var originalBoxSizing = cs.boxSizing;
            var originalPaddingRight = cs.paddingRight;

            document.body.style.boxSizing = 'border-box';
            document.body.style.paddingRight = pushSpace + 'px';

            /* 劫持折叠按钮：收起时恢复，展开时推开 */
            var toggleBtn = toc.querySelector('.boblog-toc-toggle');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', function () {
                    if (toc.classList.contains('collapsed')) {
                        document.body.style.boxSizing = originalBoxSizing;
                        document.body.style.paddingRight = originalPaddingRight;
                    } else {
                        document.body.style.boxSizing = 'border-box';
                        document.body.style.paddingRight = pushSpace + 'px';
                    }
                });
            }

            /* 窗口 resize 时同步更新 */
            var lastWidth = window.innerWidth;
            window.addEventListener('resize', function () {
                var curWidth = window.innerWidth;
                if (curWidth === lastWidth) return;
                lastWidth = curWidth;
                setTimeout(function () {
                    if (!toc.classList.contains('collapsed')) {
                        var newTocWidth = toc.offsetWidth;
                        var newSpace = newTocWidth + rightOffset + gap;
                        document.body.style.paddingRight = newSpace + 'px';
                    }
                }, 200);
            });
        });
    }

    /* 挂载到全局命名空间 */
    window.BoblogUI.toc = {
        init: init,
        initToggle: initToggle,
        initGenerate: initGenerate,
        initScrollHighlight: initScrollHighlight
    };

    /* DOMContentLoaded 自动初始化 */
    document.addEventListener('DOMContentLoaded', function () {
        init();
    });

})();
