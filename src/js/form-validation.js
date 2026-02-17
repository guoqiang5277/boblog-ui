/**
 * Bo-Blog UI 组件 - 表单验证增强 (form-validation)
 *
 * 功能：
 *   - 自动扫描页面中所有包含验证规则的表单（含 required 或 data-val 属性的字段）
 *   - 提交时检查表单有效性，无效则阻止提交并添加 .boblog-form-validated 类
 *   - 输入时实时验证单个字段，动态添加 .boblog-input-error 或 .boblog-input-success 类
 *
 * 验证状态 CSS 类：
 *   - .boblog-form-validated   — 加在 <form> 上，触发 :valid / :invalid 伪类的样式
 *   - .boblog-input-error      — 加在输入框上，红色边框（验证失败）
 *   - .boblog-input-success    — 加在输入框上，绿色边框（验证通过）
 *
 * 公开 API：
 *   BoblogUI.FormValidation.init([container])  — 初始化指定容器内的表单验证
 *
 * 依赖：
 *   - src/controls/input.css（.boblog-input-error / .boblog-input-success 样式）
 *   - src/layout/form-layout.css（.boblog-form-validated 状态样式）
 */

(function () {
    'use strict';

    /* 确保全局命名空间存在 */
    window.BoblogUI = window.BoblogUI || {};

    /**
     * 初始化表单验证
     * 扫描 container 内所有表单，为包含验证规则的表单绑定提交和输入事件
     *
     * @param {HTMLElement} [container=document] — 扫描范围
     */
    function init(container) {
        var root = container || document;
        var forms = root.querySelectorAll('form');

        Array.from(forms).forEach(function (form) {
            /* 检查表单是否包含需要验证的字段 */
            var hasValidation = form.querySelector('[required], [data-val="true"]');
            if (!hasValidation) return;

            /* 跳过已绑定的表单 */
            if (form.dataset.boblogValidationBound) return;
            form.dataset.boblogValidationBound = 'true';

            /* 提交时验证：如果表单无效则阻止提交并添加验证样式 */
            form.addEventListener('submit', function (event) {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('boblog-form-validated');
            }, false);

            /* 输入时实时验证：根据字段有效性动态更新样式类 */
            var inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(function (input) {
                input.addEventListener('input', function () {
                    if (input.checkValidity()) {
                        input.classList.remove('boblog-input-error');
                        input.classList.add('boblog-input-success');
                    } else {
                        input.classList.remove('boblog-input-success');
                        input.classList.add('boblog-input-error');
                    }
                });
            });
        });
    }

    /* DOMContentLoaded 时自动初始化 */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { init(); });
    } else {
        init();
    }

    /* 挂载到全局命名空间 */
    window.BoblogUI.FormValidation = {
        init: init
    };
})();
