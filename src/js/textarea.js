/**
 * Bo-Blog UI 组件 - 文本域字符计数 (textarea)
 *
 * 功能：
 *   - 自动扫描页面中的 .boblog-textarea-wrapper 容器
 *   - 实时统计 textarea 输入字符数，更新 .boblog-textarea-count 显示
 *   - 超过上限时自动添加 .limit-reached 类（红色加粗警告）
 *   - 支持 data-maxlength 属性指定字数上限
 *   - 支持手动调用 init() 初始化动态插入的容器
 *
 * HTML 结构约定：
 *   <div class="boblog-textarea-wrapper">
 *       <textarea class="boblog-textarea" data-maxlength="200"></textarea>
 *       <span class="boblog-textarea-count">0 / 200</span>
 *   </div>
 *
 *   - data-maxlength: 字数上限（必填，否则不启用计数）
 *   - .boblog-textarea-count: 计数显示元素（可选，不存在则自动创建）
 *
 * 依赖：无（纯 JS，不依赖其他模块）
 */
(function () {
    'use strict';

    /**
     * 初始化单个文本域的字符计数
     * @param {HTMLElement} wrapper - .boblog-textarea-wrapper 容器元素
     */
    function initTextareaCount(wrapper) {
        /* 已初始化则跳过 */
        if (wrapper.dataset.textareaInited) return;
        wrapper.dataset.textareaInited = 'true';

        var textarea = wrapper.querySelector('.boblog-textarea');
        if (!textarea) return;

        /* 读取字数上限：优先 data-maxlength，其次 maxlength 属性 */
        var maxLen = parseInt(textarea.getAttribute('data-maxlength'), 10)
                  || parseInt(textarea.getAttribute('maxlength'), 10)
                  || 0;

        /* 没有上限则不启用计数 */
        if (!maxLen) return;

        /* 查找或自动创建计数显示元素 */
        var countEl = wrapper.querySelector('.boblog-textarea-count');
        if (!countEl) {
            countEl = document.createElement('span');
            countEl.className = 'boblog-textarea-count';
            wrapper.appendChild(countEl);
        }

        /**
         * 更新计数显示
         * 当前字数 / 上限，超出时：
         *   - 计数元素添加 .limit-reached（红色加粗）
         *   - wrapper 添加 .limit-reached（触发边框变红 + 聚焦红底）
         */
        function updateCount() {
            var len = textarea.value.length;
            countEl.textContent = len + ' / ' + maxLen;

            if (len >= maxLen) {
                countEl.classList.add('limit-reached');
                wrapper.classList.add('limit-reached');
            } else {
                countEl.classList.remove('limit-reached');
                wrapper.classList.remove('limit-reached');
            }
        }

        /* 监听输入事件：input 覆盖键盘输入、粘贴、拖拽等所有场景 */
        textarea.addEventListener('input', updateCount);

        /* 初始化时立即更新一次（处理预填充内容） */
        updateCount();
    }

    /**
     * 批量初始化指定范围内的所有文本域计数
     * @param {HTMLElement} [root=document] - 扫描范围，默认整个文档
     */
    function init(root) {
        root = root || document;
        var wrappers = root.querySelectorAll('.boblog-textarea-wrapper');
        for (var i = 0; i < wrappers.length; i++) {
            initTextareaCount(wrappers[i]);
        }
    }

    /* DOMContentLoaded 自动初始化 */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { init(); });
    } else {
        init();
    }

    /* 挂载到全局命名空间，支持手动调用 */
    window.BoblogUI = window.BoblogUI || {};
    window.BoblogUI.textarea = {
        init: init
    };
})();
