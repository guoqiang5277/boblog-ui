/**
 * Bo-Blog UI 组件 - 模态框 (modal)
 *
 * 功能：
 *   - 自动扫描页面中的 .boblog-modal-close 关闭按钮，绑定点击关闭事件
 *   - 点击遮罩层空白区域（.boblog-modal-backdrop 但非 .boblog-modal 内部）自动关闭
 *   - ESC 键关闭当前打开的模态框
 *   - 打开时禁止 body 滚动，关闭后恢复
 *
 * HTML 结构约定：
 *   <div class="boblog-modal-backdrop" id="myModal">
 *       <div class="boblog-modal">
 *           <div class="boblog-modal-header">
 *               <h3 class="boblog-modal-title">标题</h3>
 *               <button class="boblog-modal-close">×</button>
 *           </div>
 *           <div class="boblog-modal-body">内容</div>
 *           <div class="boblog-modal-footer">
 *               <button class="boblog-btn">取消</button>
 *               <button class="boblog-btn boblog-btn-primary">确定</button>
 *           </div>
 *       </div>
 *   </div>
 *
 * 公开 API：
 *   BoblogUI.Modal.show(id)    — 显示指定 ID 的模态框
 *   BoblogUI.Modal.hide(id)    — 隐藏指定 ID 的模态框
 *   BoblogUI.Modal.toggle(id)  — 切换指定 ID 模态框的显示/隐藏
 *   BoblogUI.Modal.init([container])  — 初始化指定容器内的模态框事件
 *
 * 依赖：
 *   - src/components/modal.css（样式）
 */

(function () {
    'use strict';

    /* 确保全局命名空间存在 */
    window.BoblogUI = window.BoblogUI || {};

    /**
     * 显示模态框
     * 给 backdrop 元素添加 .boblog-modal-open 类，并禁止 body 滚动
     *
     * @param {string} id — 模态框 backdrop 元素的 ID
     */
    function show(id) {
        var backdrop = document.getElementById(id);
        if (!backdrop) return;
        backdrop.classList.add('boblog-modal-open');
        document.body.style.overflow = 'hidden';
    }

    /**
     * 隐藏模态框
     * 移除 backdrop 元素的 .boblog-modal-open 类，恢复 body 滚动
     *
     * @param {string} id — 模态框 backdrop 元素的 ID
     */
    function hide(id) {
        var backdrop = document.getElementById(id);
        if (!backdrop) return;
        backdrop.classList.remove('boblog-modal-open');

        /* 检查是否还有其他打开的模态框，如果没有则恢复 body 滚动 */
        var openModals = document.querySelectorAll('.boblog-modal-backdrop.boblog-modal-open');
        if (openModals.length === 0) {
            document.body.style.overflow = '';
        }
    }

    /**
     * 切换模态框的显示/隐藏状态
     *
     * @param {string} id — 模态框 backdrop 元素的 ID
     */
    function toggle(id) {
        var backdrop = document.getElementById(id);
        if (!backdrop) return;
        if (backdrop.classList.contains('boblog-modal-open')) {
            hide(id);
        } else {
            show(id);
        }
    }

    /**
     * 关闭指定 backdrop 元素对应的模态框
     * 内部辅助函数，直接操作 DOM 元素而非 ID
     *
     * @param {HTMLElement} backdrop — backdrop 元素
     */
    function hideByElement(backdrop) {
        if (!backdrop) return;
        backdrop.classList.remove('boblog-modal-open');

        /* 检查是否还有其他打开的模态框 */
        var openModals = document.querySelectorAll('.boblog-modal-backdrop.boblog-modal-open');
        if (openModals.length === 0) {
            document.body.style.overflow = '';
        }
    }

    /**
     * 初始化模态框事件绑定
     * 为关闭按钮、遮罩层空白区域绑定点击关闭事件
     *
     * @param {HTMLElement} [container=document] — 扫描范围
     */
    function init(container) {
        var root = container || document;

        /* 绑定关闭按钮点击事件 */
        var closeButtons = root.querySelectorAll('.boblog-modal-close');
        closeButtons.forEach(function (btn) {
            /* 跳过已绑定的按钮 */
            if (btn.dataset.boblogModalBound) return;
            btn.dataset.boblogModalBound = 'true';

            btn.addEventListener('click', function () {
                /* 向上查找最近的 .boblog-modal-backdrop 祖先元素 */
                var backdrop = btn.closest('.boblog-modal-backdrop');
                hideByElement(backdrop);
            });
        });

        /* 绑定遮罩层空白区域点击事件（点击 backdrop 但不是 modal 内部） */
        var backdrops = root.querySelectorAll('.boblog-modal-backdrop');
        backdrops.forEach(function (backdrop) {
            /* 跳过已绑定的 backdrop */
            if (backdrop.dataset.boblogBackdropBound) return;
            backdrop.dataset.boblogBackdropBound = 'true';

            backdrop.addEventListener('click', function (e) {
                /* 仅在直接点击 backdrop 本身时关闭（不是点击 modal 内部元素） */
                if (e.target === backdrop) {
                    hideByElement(backdrop);
                }
            });
        });
    }

    /* ESC 键关闭当前打开的模态框 */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            /* 查找所有打开的模态框，关闭最后一个（最上层的） */
            var openModals = document.querySelectorAll('.boblog-modal-backdrop.boblog-modal-open');
            if (openModals.length > 0) {
                hideByElement(openModals[openModals.length - 1]);
            }
        }
    });

    /* DOMContentLoaded 时自动初始化 */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { init(); });
    } else {
        init();
    }

    /* 挂载到全局命名空间 */
    window.BoblogUI.Modal = {
        show: show,
        hide: hide,
        toggle: toggle,
        init: init
    };
})();
