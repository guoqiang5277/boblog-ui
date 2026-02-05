/**
 * Bo-Blog UI 组件 - 密码输入框 (input-password)
 *
 * 功能：
 *   - 自动扫描页面中的 .boblog-input-password 容器
 *   - 为密码输入框添加「显示/隐藏」切换按钮
 *   - 支持 data-visible 属性控制密码默认显示状态
 *   - 支持 data-toggle-password 属性控制切换按钮是否显示
 *   - 支持禁用状态（禁用时切换按钮不可点击）
 *
 * HTML 结构约定（转换前）：
 *   <div class="boblog-input-password">
 *       <input type="password" class="boblog-input" placeholder="请输入密码">
 *   </div>
 *
 *   可选：data-visible="true" 使密码默认明文显示
 *   <div class="boblog-input-password" data-visible="true">
 *       <input type="text" class="boblog-input" placeholder="请输入密码">
 *   </div>
 *
 *   可选：data-toggle-password="false" 隐藏切换按钮（纯密码输入框）
 *   <div class="boblog-input-password" data-toggle-password="false">
 *       <input type="password" class="boblog-input" placeholder="请输入密码">
 *   </div>
 *
 * 转换后生成：
 *   <div class="boblog-input-password">
 *       <input type="password" class="boblog-input" placeholder="请输入密码">
 *       <button type="button" class="boblog-input-password-toggle" title="显示密码">
 *           <svg>...</svg>  （闭眼 SVG 图标）
 *       </button>
 *   </div>
 *
 * 公开 API：
 *   BoblogUI.input.init([container])  — 初始化指定容器（默认 document）内所有密码输入框
 *
 * 依赖：
 *   - src/controls/input.css（密码输入框样式）
 */

(function () {
    'use strict';

    /* 确保全局命名空间存在 */
    window.BoblogUI = window.BoblogUI || {};

    /* ============ 常量 ============ */

    /**
     * 睁眼图标 SVG（密码可见时显示）
     * 16x16 尺寸，stroke 风格，currentColor 继承按钮文字颜色
     */
    var SVG_EYE_OPEN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>'
        + '<circle cx="12" cy="12" r="3"/>'
        + '</svg>';

    /**
     * 闭眼图标 SVG（密码隐藏时显示）
     * 16x16 尺寸，stroke 风格，带斜线表示不可见
     */
    var SVG_EYE_CLOSED = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>'
        + '<line x1="1" y1="1" x2="23" y2="23"/>'
        + '</svg>';

    /** 隐藏密码时的按钮提示文字 */
    var TITLE_SHOW = '显示密码';

    /** 显示密码时的按钮提示文字 */
    var TITLE_HIDE = '隐藏密码';

    /* ============ 核心逻辑 ============ */

    /**
     * 初始化单个密码输入框容器
     * @param {HTMLElement} container — .boblog-input-password 容器元素
     */
    function initOne(container) {
        /* 防止重复初始化 */
        if (container.dataset.pwInit === 'true') return;
        container.dataset.pwInit = 'true';

        var input = container.querySelector('.boblog-input');
        if (!input) return;

        /* 读取 data-visible 属性，决定默认是否明文显示 */
        var defaultVisible = container.getAttribute('data-visible') === 'true';

        /* 根据 data-visible 设置初始 type */
        if (defaultVisible) {
            input.type = 'text';
        } else {
            input.type = 'password';
        }

        /*
         * 读取 data-toggle-password 属性，决定是否显示切换按钮
         * 默认 true（显示），设为 "false" 时不生成按钮
         */
        var showToggle = container.getAttribute('data-toggle-password') !== 'false';
        if (!showToggle) return;

        /* 创建切换按钮 */
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'boblog-input-password-toggle';
        btn.innerHTML = defaultVisible ? SVG_EYE_OPEN : SVG_EYE_CLOSED;
        btn.title = defaultVisible ? TITLE_HIDE : TITLE_SHOW;

        /* 点击切换密码可见性 */
        btn.addEventListener('click', function () {
            /* 禁用状态不处理 */
            if (input.disabled) return;

            if (input.type === 'password') {
                /* 切换为明文 */
                input.type = 'text';
                btn.innerHTML = SVG_EYE_OPEN;
                btn.title = TITLE_HIDE;
            } else {
                /* 切换为密码 */
                input.type = 'password';
                btn.innerHTML = SVG_EYE_CLOSED;
                btn.title = TITLE_SHOW;
            }
        });

        /* 将切换按钮插入容器 */
        container.appendChild(btn);
    }

    /**
     * 初始化指定容器内所有密码输入框
     * @param {HTMLElement} [root=document] — 搜索范围
     */
    function init(root) {
        root = root || document;
        var containers = root.querySelectorAll('.boblog-input-password');
        for (var i = 0; i < containers.length; i++) {
            initOne(containers[i]);
        }
    }

    /* ============ 公开 API ============ */
    BoblogUI.input = {
        init: init
    };

    /* ============ 自动初始化 ============ */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { init(); });
    } else {
        init();
    }

})();
