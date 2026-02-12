/**
 * Bo-Blog UI 组件 - 手风琴折叠面板 (accordion)
 *
 * 功能：
 *   - 自动扫描页面中的 .boblog-accordion 容器
 *   - 为 .boblog-accordion-header 标题栏绑定点击事件
 *   - 点击时切换对应 .boblog-accordion-item 的展开/折叠
 *   - 同一容器内同时只展开一个项（手风琴互斥模式）
 *
 * HTML 结构约定：
 *   <div class="boblog-accordion">
 *       <div class="boblog-accordion-item active">
 *           <div class="boblog-accordion-header">标题 1</div>
 *           <div class="boblog-accordion-body">内容 1</div>
 *       </div>
 *       <div class="boblog-accordion-item">
 *           <div class="boblog-accordion-header">标题 2</div>
 *           <div class="boblog-accordion-body">内容 2</div>
 *       </div>
 *   </div>
 *
 * 公开 API：
 *   BoblogUI.accordion.init([container])  — 初始化指定容器（默认 document）内所有手风琴
 *
 * 依赖：
 *   - src/components/accordion.css（样式）
 */

(function () {
    'use strict';

    /* 确保全局命名空间存在 */
    window.BoblogUI = window.BoblogUI || {};

    /**
     * 初始化手风琴折叠面板
     *
     * 扫描 container 内所有 .boblog-accordion 容器，
     * 为每个容器的标题栏绑定点击切换逻辑。
     *
     * @param {HTMLElement} [container=document] — 扫描范围
     */
    function init(container) {
        var root = container || document;

        /* 获取所有手风琴容器 */
        var accordions = root.querySelectorAll('.boblog-accordion');

        accordions.forEach(function (accordionEl) {
            /* 跳过已初始化的容器，避免重复绑定 */
            if (accordionEl.dataset.bbAccordionInit) return;
            accordionEl.dataset.bbAccordionInit = '1';

            /* 获取所有折叠项（仅直接子级，避免嵌套手风琴干扰） */
            var items = [];
            var children = accordionEl.children;
            for (var i = 0; i < children.length; i++) {
                if (children[i].classList.contains('boblog-accordion-item')) {
                    items.push(children[i]);
                }
            }

            /* 为每个折叠项的标题栏绑定点击事件 */
            items.forEach(function (item) {
                var header = item.querySelector('.boblog-accordion-header');
                if (!header) return;

                header.addEventListener('click', function () {
                    /* 判断当前项是否已激活 */
                    var isActive = item.classList.contains('active');

                    /* 关闭同容器内所有已展开的项 */
                    items.forEach(function (otherItem) {
                        otherItem.classList.remove('active');
                    });

                    /* 如果当前项之前未激活，则展开它；否则保持全部关闭 */
                    if (!isActive) {
                        item.classList.add('active');
                    }
                });
            });
        });
    }

    /* 挂载到全局命名空间 */
    BoblogUI.accordion = {
        init: init
    };

    /* DOMContentLoaded 时自动初始化 */
    document.addEventListener('DOMContentLoaded', function () {
        init();
    });

})();
