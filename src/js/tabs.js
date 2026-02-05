/**
 * Bo-Blog UI 组件 - Tab 切换面板 (tabs)
 *
 * 功能：
 *   - 自动扫描页面中的 .boblog-tabs 容器
 *   - 为 .boblog-tabs-btn 按钮绑定点击事件
 *   - 点击时切换对应 .boblog-tabs-panel 面板的显示/隐藏
 *
 * HTML 结构约定：
 *   <div class="boblog-tabs">
 *       <div class="boblog-tabs-bar">
 *           <button class="boblog-tabs-btn active">Tab 1</button>
 *           <button class="boblog-tabs-btn">Tab 2</button>
 *       </div>
 *       <div class="boblog-tabs-panel active">面板1</div>
 *       <div class="boblog-tabs-panel">面板2</div>
 *   </div>
 *
 * 公开 API：
 *   BoblogUI.tabs.init([container])  — 初始化指定容器（默认 document）内所有 Tab
 *
 * 依赖：
 *   - src/components/tabs.css（样式）
 */

(function () {
    'use strict';

    /* 确保全局命名空间存在 */
    window.BoblogUI = window.BoblogUI || {};

    /**
     * 初始化 Tab 切换
     *
     * 扫描 container 内所有 .boblog-tabs 容器，
     * 为每个容器的按钮绑定点击切换逻辑。
     *
     * @param {HTMLElement} [container=document] — 扫描范围
     */
    function init(container) {
        var root = container || document;

        /* 获取所有 Tab 容器 */
        var tabContainers = root.querySelectorAll('.boblog-tabs');

        tabContainers.forEach(function (tabsEl) {
            /* 跳过已初始化的容器，避免重复绑定 */
            if (tabsEl.dataset.bbTabsInit) return;
            tabsEl.dataset.bbTabsInit = '1';

            /* 获取按钮栏和面板（仅直接子级，避免嵌套 Tab 干扰） */
            var bar = null;
            var panels = [];
            var children = tabsEl.children;
            for (var i = 0; i < children.length; i++) {
                if (!bar && children[i].classList.contains('boblog-tabs-bar')) {
                    bar = children[i];
                } else if (children[i].classList.contains('boblog-tabs-panel')) {
                    panels.push(children[i]);
                }
            }
            if (!bar) return;
            var btns = bar.querySelectorAll('.boblog-tabs-btn');

            /* 为每个按钮绑定点击事件 */
            btns.forEach(function (btn, index) {
                btn.addEventListener('click', function () {
                    /* 移除所有按钮和面板的 active 状态 */
                    btns.forEach(function (b) { b.classList.remove('active'); });
                    panels.forEach(function (p) { p.classList.remove('active'); });

                    /* 激活当前按钮和对应面板 */
                    btn.classList.add('active');
                    if (panels[index]) {
                        panels[index].classList.add('active');
                    }
                });
            });
        });
    }

    /* 挂载到全局命名空间 */
    BoblogUI.tabs = {
        init: init
    };

    /* DOMContentLoaded 时自动初始化 */
    document.addEventListener('DOMContentLoaded', function () {
        init();
    });

})();
