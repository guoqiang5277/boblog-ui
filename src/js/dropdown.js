/**
 * Bo-Blog UI 组件 - Dropdown 下拉菜单 (dropdown)
 *
 * 功能：
 *   - 自动扫描页面中的 .boblog-dropdown 容器（排除 .boblog-dropdown-auto）
 *   - 测量面板自然宽度，将其设为容器 min-width，实现按钮与面板等宽
 *   - 自适应模式（.boblog-dropdown-auto）的容器不做宽度锁定
 *
 * 等宽原理：
 *   1. 临时让面板 display:block + visibility:hidden（不可见但参与布局）
 *   2. 读取面板的 offsetWidth（包含 border + padding + 内容宽度）
 *   3. 将该宽度设为容器的 min-width
 *   4. 恢复面板为 display:none
 *   5. 按钮 width:100% 撑满容器，容器 min-width ≥ 面板宽度，实现等宽
 *
 * 公开 API：
 *   BoblogUI.dropdown.init([container])  — 初始化指定容器（默认 document）内所有 Dropdown
 *
 * 依赖：
 *   - src/components/dropdown.css（样式）
 */

(function () {
    'use strict';

    /* 确保全局命名空间存在 */
    window.BoblogUI = window.BoblogUI || {};

    /**
     * 初始化等宽下拉菜单
     * 遍历容器内所有 .boblog-dropdown（排除 .boblog-dropdown-auto），
     * 测量面板宽度并锁定容器 min-width
     *
     * @param {HTMLElement} [container=document] 搜索范围
     */
    function init(container) {
        container = container || document;

        /* 查找所有非自适应模式的下拉菜单容器 */
        var dropdowns = container.querySelectorAll('.boblog-dropdown:not(.boblog-dropdown-auto)');

        for (var i = 0; i < dropdowns.length; i++) {
            initOne(dropdowns[i]);
        }
    }

    /**
     * 初始化单个下拉菜单的等宽行为
     *
     * @param {HTMLElement} dropdown .boblog-dropdown 容器元素
     */
    function initOne(dropdown) {
        /* 跳过已初始化的容器 */
        if (dropdown.getAttribute('data-boblog-dropdown-init') === '1') {
            return;
        }

        var menu = dropdown.querySelector('.boblog-dropdown-menu');
        if (!menu) {
            return;
        }

        /* 临时显示面板以测量宽度（不可见，不影响用户体验） */
        var origDisplay = menu.style.display;
        var origVisibility = menu.style.visibility;
        var origPosition = menu.style.position;

        menu.style.display = 'block';
        menu.style.visibility = 'hidden';
        menu.style.position = 'absolute';

        /* 读取面板自然宽度（包含 border + padding + 内容） */
        var menuWidth = menu.offsetWidth;

        /* 恢复面板原始状态 */
        menu.style.display = origDisplay;
        menu.style.visibility = origVisibility;
        menu.style.position = origPosition;

        /* 将面板宽度设为容器 min-width，按钮 width:100% 会撑满容器 */
        if (menuWidth > 0) {
            dropdown.style.minWidth = menuWidth + 'px';
        }

        /* 标记已初始化 */
        dropdown.setAttribute('data-boblog-dropdown-init', '1');
    }

    /* 注册到全局命名空间 */
    BoblogUI.dropdown = {
        init: init
    };

    /* DOM 就绪后自动初始化 */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            init();
        });
    } else {
        init();
    }

})();
