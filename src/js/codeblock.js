/**
 * Bo-Blog UI 组件 - 代码块 (codeblock.js)
 *
 * 功能：
 *   1. 语法高亮     - 调用 Prism.js 对 <code> 元素进行语法着色
 *   2. 行号显示     - 为 <pre> 元素左侧添加行号列
 *   3. 复制按钮     - 右上角一键复制代码内容
 *
 * 支持的语言（由 Prism.js 提供）：
 *   内置：HTML/XML (markup)、CSS、C-like、JavaScript
 *   扩展：PHP、Python、C#、Java、Go、SQL、Bash、JSON、
 *         TypeScript、Ruby、Rust、YAML、Markdown、Docker
 *
 * 使用方式：
 *   方式一（自动初始化）：
 *     引入此脚本后，DOMContentLoaded 时自动扫描所有 .boblog-codeblock 元素
 *
 *   方式二（手动调用）：
 *     BoblogUI.codeblock.init()           — 初始化页面所有代码块
 *     BoblogUI.codeblock.init(container)  — 只初始化指定容器内的代码块
 *
 * HTML 结构约定：
 *   <div class="boblog-codeblock">
 *       <pre><code class="language-css">代码内容</code></pre>
 *   </div>
 *
 * 语言指定：
 *   在 <code> 元素上添加 class="language-xxx" 指定语言，例如：
 *     language-html、language-css、language-javascript、language-php 等
 *   未指定 class 时不会进行语法高亮
 *
 * 可选属性：
 *   data-no-line-numbers  — 禁用行号
 *   data-no-copy          — 禁用复制按钮
 *   data-no-highlight     — 禁用语法高亮
 *
 * 依赖：
 *   - src/vendor/prism/prism.min.js（Prism.js 语法高亮引擎）
 *   - src/components/codeblock.css
 */

/* 全局命名空间 */
window.BoblogUI = window.BoblogUI || {};

(function () {
    'use strict';

    /* ======================================================================
       1. 语法高亮（基于 Prism.js）
       扫描 .boblog-codeblock 内的 <code> 元素，调用 Prism 进行语法着色
       ====================================================================== */

    /**
     * 禁用 Prism.js 的自动高亮功能
     * 由本组件统一控制高亮时机，避免 Prism 在加载时自动执行
     */
    if (window.Prism) {
        window.Prism.manual = true;
    }

    /**
     * 对指定容器内的代码块执行语法高亮
     * 遍历所有 .boblog-codeblock 内的 <code> 元素，调用 Prism.highlightElement()
     *
     * 高亮条件：
     *   1. <code> 元素需要有 class="language-xxx"（Prism 约定）
     *   2. 不在 data-no-highlight 标记的容器内
     *   3. Prism 全局对象存在
     *
     * @param {Element} [container=document] - 搜索范围
     */
    function highlightAll(container) {
        /* 检查 Prism 是否已加载 */
        if (typeof Prism === 'undefined') return;

        var root = container || document;
        var codeEls = root.querySelectorAll('.boblog-codeblock code');

        codeEls.forEach(function (codeEl) {
            /* 跳过已标记禁用高亮的代码块 */
            if (codeEl.closest('[data-no-highlight]')) return;

            /* 只对有 language-xxx 类名的 <code> 元素执行高亮 */
            if (!/\blanguage-\w+/.test(codeEl.className)) return;

            /* 调用 Prism 执行语法高亮 */
            Prism.highlightElement(codeEl);
        });
    }

    /**
     * HTML 特殊字符转义
     * 防止代码内容被浏览器解析为 HTML 标签
     *
     * @param {string} str - 原始字符串
     * @returns {string} 转义后的字符串
     */
    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }


    /* ======================================================================
       2. 行号显示
       为 .boblog-codeblock 内的 <pre> 添加行号列
       ====================================================================== */

    /**
     * 为指定容器内的代码块添加行号
     * @param {Element} [container=document] - 搜索范围
     */
    function addLineNumbers(container) {
        var root = container || document;
        var preEls = root.querySelectorAll('.boblog-codeblock pre');

        preEls.forEach(function (pre) {
            /* 跳过已标记禁用行号的代码块 */
            if (pre.closest('[data-no-line-numbers]')) return;

            /* 获取代码文本，按换行拆分计算行数 */
            var code = pre.querySelector('code');
            var text = code ? code.textContent : pre.textContent;
            if (!text) return;

            var lines = text.split('\n');
            /* 去掉末尾空行 */
            if (lines.length > 0 && lines[lines.length - 1].trim() === '') {
                lines.pop();
            }
            var lineCount = lines.length;
            if (lineCount === 0) return;

            /* 创建行号列元素 */
            var lineNums = document.createElement('div');
            lineNums.className = 'boblog-codeblock-lines';
            lineNums.setAttribute('aria-hidden', 'true');

            /* 生成行号文本: "1\n2\n3\n..." */
            var nums = [];
            for (var i = 1; i <= lineCount; i++) {
                nums.push(i);
            }
            lineNums.textContent = nums.join('\n');

            /* 创建 flex 包裹容器，将行号和 pre 并排排列 */
            var wrapper = document.createElement('div');
            wrapper.className = 'boblog-codeblock-wrapper';

            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(lineNums);
            wrapper.appendChild(pre);
        });
    }


    /* ======================================================================
       3. 复制按钮
       为 .boblog-codeblock 注入右上角「复制」按钮
       ====================================================================== */

    /**
     * 为指定容器内的代码块添加复制按钮
     * @param {Element} [container=document] - 搜索范围
     */
    function addCopyButtons(container) {
        var root = container || document;
        var codeBlocks = root.querySelectorAll('.boblog-codeblock');

        codeBlocks.forEach(function (block) {
            /* 跳过已标记禁用复制的代码块 */
            if (block.hasAttribute('data-no-copy')) return;

            /* 只对包含 <pre> 或 <code> 的代码块添加按钮 */
            var codeEl = block.querySelector('pre') || block.querySelector('code');
            if (!codeEl) return;

            /* 创建复制按钮 */
            var btn = document.createElement('button');
            btn.className = 'boblog-copy-btn';
            btn.textContent = '复制';
            btn.type = 'button';

            btn.addEventListener('click', function () {
                /* 获取纯文本内容（去掉 HTML 标签） */
                var text = codeEl.textContent || codeEl.innerText;

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    /* 现代浏览器 Clipboard API */
                    navigator.clipboard.writeText(text).then(function () {
                        showCopied(btn);
                    });
                } else {
                    /* 降级方案：textarea + execCommand */
                    var textarea = document.createElement('textarea');
                    textarea.value = text;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    showCopied(btn);
                }
            });

            block.appendChild(btn);
        });
    }

    /**
     * 复制成功后短暂显示「已复制」反馈
     * 1.5 秒后自动恢复为「复制」
     *
     * @param {HTMLButtonElement} btn - 复制按钮元素
     */
    function showCopied(btn) {
        btn.textContent = '已复制';
        btn.classList.add('copied');
        setTimeout(function () {
            btn.textContent = '复制';
            btn.classList.remove('copied');
        }, 1500);
    }


    /* ======================================================================
       公共 API
       ====================================================================== */

    /**
     * 初始化代码块组件
     * 按顺序执行：语法高亮 → 行号 → 复制按钮
     *
     * @param {Element} [container=document] - 可选，限定初始化范围
     */
    function init(container) {
        highlightAll(container);   /* 语法高亮必须在行号之前（行号依赖文本内容） */
        addLineNumbers(container); /* 行号在复制按钮之前（复制取 textContent 不受影响） */
        addCopyButtons(container);
    }

    /* 挂载到全局命名空间 */
    window.BoblogUI.codeblock = {
        init: init,
        highlightAll: highlightAll,
        addLineNumbers: addLineNumbers,
        addCopyButtons: addCopyButtons
    };

    /* DOMContentLoaded 自动初始化 */
    document.addEventListener('DOMContentLoaded', function () {
        init();
    });

})();
