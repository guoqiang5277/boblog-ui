/**
 * Bo-Blog UI 组件 - 对话框 (dialog)
 *
 * 功能：
 *   - 基于 BoblogUI.Modal 封装 alert / confirm / prompt 三类对话框
 *   - 自动创建全局唯一宿主，避免业务项目重复维护弹框 DOM
 *   - 统一处理确认、取消、关闭按钮、遮罩点击、ESC 关闭的 Promise 返回值
 *   - 提供声明式确认绑定，便于 form / a / button 快速替换浏览器原生 confirm
 *
 * 公开 API：
 *   BoblogUI.Dialog.alert(message, options)
 *   BoblogUI.Dialog.confirm(message, options)
 *   BoblogUI.Dialog.prompt(message, options)
 *   BoblogUI.Dialog.init([container])
 *
 * 依赖：
 *   - BoblogUI.Modal
 *   - src/components/modal.css
 *   - src/components/dialog.css
 *   - src/components/message.css
 *   - src/controls/button.css
 *   - src/controls/input.css
 */

(function () {
    'use strict';

    window.BoblogUI = window.BoblogUI || {};

    var HOST_ID = 'boblogDialogHost';
    var currentDialog = null;

    /**
     * 判断值是否为字符串
     *
     * @param {*} value - 待判断值
     * @returns {boolean}
     */
    function isString(value) {
        return typeof value === 'string' || value instanceof String;
    }

    /**
     * 将各种 truthy/falsy 配置统一转成布尔值
     *
     * @param {*} value - 原始配置值
     * @param {boolean} defaultValue - 默认布尔值
     * @returns {boolean}
     */
    function toBoolean(value, defaultValue) {
        if (value === undefined || value === null || value === '') {
            return defaultValue;
        }

        if (typeof value === 'boolean') {
            return value;
        }

        if (isString(value)) {
            return value.toLowerCase() !== 'false';
        }

        return !!value;
    }

    /**
     * 读取元素上的确认配置
     *
     * @param {HTMLElement} element - 触发元素
     * @returns {Object}
     */
    function getConfirmOptionsFromElement(element) {
        return {
            title: element.getAttribute('data-boblog-confirm-title') || '确认操作',
            confirmText: element.getAttribute('data-boblog-confirm-confirm-text') || '确认',
            cancelText: element.getAttribute('data-boblog-confirm-cancel-text') || '取消',
            danger: toBoolean(element.getAttribute('data-boblog-confirm-danger'), false),
            closeOnMask: toBoolean(element.getAttribute('data-boblog-confirm-close-on-mask'), true),
            closeOnEsc: toBoolean(element.getAttribute('data-boblog-confirm-close-on-esc'), true)
        };
    }

    /**
     * 创建全局宿主并缓存关键节点
     *
     * @returns {Object}
     */
    function ensureHost() {
        var backdrop = document.getElementById(HOST_ID);
        if (backdrop) {
            return getHostReferences(backdrop);
        }

        backdrop = document.createElement('div');
        backdrop.id = HOST_ID;
        backdrop.className = 'boblog-modal-backdrop boblog-dialog-host';
        backdrop.setAttribute('aria-hidden', 'true');
        backdrop.innerHTML = [
            '<div class="boblog-modal boblog-dialog-modal" role="dialog" aria-modal="true" aria-labelledby="boblogDialogTitle">',
            '  <div class="boblog-modal-header">',
            '    <h3 class="boblog-modal-title" id="boblogDialogTitle">提示</h3>',
            '    <button type="button" class="boblog-modal-close" aria-label="关闭">×</button>',
            '  </div>',
            '  <div class="boblog-modal-body">',
            '    <p class="boblog-dialog-message"></p>',
            '    <div class="boblog-dialog-input-wrap boblog-hidden">',
            '      <input type="text" class="boblog-input boblog-dialog-input" />',
            '    </div>',
            '    <div class="boblog-message boblog-message-error boblog-dialog-error boblog-hidden"></div>',
            '  </div>',
            '  <div class="boblog-modal-footer">',
            '    <button type="button" class="boblog-btn boblog-dialog-cancel">取消</button>',
            '    <button type="button" class="boblog-btn boblog-btn-primary boblog-dialog-confirm">确认</button>',
            '  </div>',
            '</div>'
        ].join('');

        document.body.appendChild(backdrop);
        if (window.BoblogUI.Modal && typeof window.BoblogUI.Modal.init === 'function') {
            window.BoblogUI.Modal.init(backdrop);
        }

        bindHostEvents(backdrop);
        return getHostReferences(backdrop);
    }

    /**
     * 从宿主节点提取常用引用，避免反复 querySelector
     *
     * @param {HTMLElement} backdrop - 宿主遮罩元素
     * @returns {Object}
     */
    function getHostReferences(backdrop) {
        return {
            backdrop: backdrop,
            title: backdrop.querySelector('.boblog-modal-title'),
            message: backdrop.querySelector('.boblog-dialog-message'),
            inputWrap: backdrop.querySelector('.boblog-dialog-input-wrap'),
            input: backdrop.querySelector('.boblog-dialog-input'),
            error: backdrop.querySelector('.boblog-dialog-error'),
            cancel: backdrop.querySelector('.boblog-dialog-cancel'),
            confirm: backdrop.querySelector('.boblog-dialog-confirm')
        };
    }

    /**
     * 绑定宿主级事件
     *
     * @param {HTMLElement} backdrop - 宿主遮罩元素
     */
    function bindHostEvents(backdrop) {
        var refs = getHostReferences(backdrop);

        refs.confirm.addEventListener('click', function () {
            handleConfirm();
        });

        refs.cancel.addEventListener('click', function () {
            resolveDialog(getDefaultCloseResult());
        });

        refs.input.addEventListener('input', function () {
            clearError();
        });

        refs.input.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.keyCode === 13) {
                event.preventDefault();
                handleConfirm();
            }
        });

        backdrop.addEventListener('boblog:modal:hide', function () {
            if (!currentDialog || currentDialog.id !== HOST_ID || currentDialog.done) {
                return;
            }

            currentDialog.done = true;
            var pending = currentDialog;
            currentDialog = null;
            clearHostState();
            pending.resolve(getDefaultCloseResult(pending.type));
        });
    }

    /**
     * 清理宿主显示状态，避免上一次弹框残留配置污染下一次调用
     */
    function clearHostState() {
        var refs = ensureHost();
        refs.backdrop.dataset.boblogCloseOnMask = 'true';
        refs.backdrop.dataset.boblogCloseOnEsc = 'true';
        refs.backdrop.setAttribute('aria-hidden', 'true');
        refs.message.textContent = '';
        refs.inputWrap.classList.add('boblog-hidden');
        refs.input.value = '';
        refs.input.removeAttribute('placeholder');
        refs.input.classList.remove('boblog-input-error');
        refs.cancel.classList.remove('boblog-hidden');
        refs.confirm.classList.remove('boblog-btn-danger');
        refs.confirm.classList.add('boblog-btn-primary');
        clearError();
    }

    /**
     * 显示错误信息
     *
     * @param {string} message - 错误文案
     */
    function showError(message) {
        var refs = ensureHost();
        refs.error.textContent = message;
        refs.error.classList.remove('boblog-hidden');
        refs.input.classList.add('boblog-input-error');
    }

    /**
     * 清空错误信息
     */
    function clearError() {
        var refs = ensureHost();
        refs.error.textContent = '';
        refs.error.classList.add('boblog-hidden');
        refs.input.classList.remove('boblog-input-error');
    }

    /**
     * 读取当前弹框在“关闭/取消”时应返回的默认结果
     *
     * @param {string} [type] - 弹框类型
     * @returns {*}
     */
    function getDefaultCloseResult(type) {
        var dialogType = type || (currentDialog && currentDialog.type) || 'alert';
        if (dialogType === 'confirm') {
            return false;
        }
        if (dialogType === 'prompt') {
            return null;
        }
        return undefined;
    }

    /**
     * 处理“确认”按钮点击
     */
    function handleConfirm() {
        if (!currentDialog) {
            return;
        }

        if (currentDialog.type === 'prompt') {
            var refs = ensureHost();
            var rawValue = refs.input.value || '';
            var value = rawValue.trim();
            if (currentDialog.options.required && !value) {
                showError(currentDialog.options.errorMessage);
                refs.input.focus();
                return;
            }

            resolveDialog(value);
            return;
        }

        if (currentDialog.type === 'confirm') {
            resolveDialog(true);
            return;
        }

        resolveDialog(undefined);
    }

    /**
     * 关闭弹框并 resolve Promise
     *
     * @param {*} result - 返回结果
     */
    function resolveDialog(result) {
        if (!currentDialog || currentDialog.done) {
            return;
        }

        var pending = currentDialog;
        currentDialog.done = true;
        currentDialog = null;
        clearHostState();
        window.BoblogUI.Modal.hide(HOST_ID);
        pending.resolve(result);
    }

    /**
     * 规范化弹框配置
     *
     * @param {string} type - 弹框类型
     * @param {Object} options - 调用方配置
     * @returns {Object}
     */
    function normalizeOptions(type, options) {
        var source = options || {};
        var defaults = {
            title: '提示',
            confirmText: '确认',
            cancelText: '取消',
            placeholder: '',
            defaultValue: '',
            required: false,
            errorMessage: '请输入内容',
            danger: false,
            closeOnMask: true,
            closeOnEsc: true
        };

        if (type === 'alert') {
            defaults.confirmText = '我知道了';
        }

        if (type === 'confirm') {
            defaults.title = '确认操作';
        }

        if (type === 'prompt') {
            defaults.title = '请输入内容';
        }

        return {
            title: source.title || defaults.title,
            confirmText: source.confirmText || defaults.confirmText,
            cancelText: source.cancelText || defaults.cancelText,
            placeholder: source.placeholder || defaults.placeholder,
            defaultValue: source.defaultValue !== undefined ? String(source.defaultValue) : defaults.defaultValue,
            required: toBoolean(source.required, defaults.required),
            errorMessage: source.errorMessage || defaults.errorMessage,
            danger: toBoolean(source.danger, defaults.danger),
            closeOnMask: toBoolean(source.closeOnMask, defaults.closeOnMask),
            closeOnEsc: toBoolean(source.closeOnEsc, defaults.closeOnEsc)
        };
    }

    /**
     * 打开指定类型的弹框
     *
     * @param {string} type - 弹框类型
     * @param {string} message - 主文案
     * @param {Object} options - 配置
     * @returns {Promise<*>}
     */
    function open(type, message, options) {
        if (currentDialog && !currentDialog.done) {
            resolveDialog(getDefaultCloseResult(currentDialog.type));
        }

        var refs = ensureHost();
        var finalOptions = normalizeOptions(type, options);
        clearHostState();

        refs.backdrop.dataset.boblogCloseOnMask = finalOptions.closeOnMask ? 'true' : 'false';
        refs.backdrop.dataset.boblogCloseOnEsc = finalOptions.closeOnEsc ? 'true' : 'false';
        refs.title.textContent = finalOptions.title;
        refs.message.textContent = message || '';
        refs.confirm.textContent = finalOptions.confirmText;
        refs.cancel.textContent = finalOptions.cancelText;
        refs.backdrop.setAttribute('aria-hidden', 'false');

        if (finalOptions.danger) {
            refs.confirm.classList.remove('boblog-btn-primary');
            refs.confirm.classList.add('boblog-btn-danger');
        }

        if (type === 'alert') {
            refs.cancel.classList.add('boblog-hidden');
        }

        if (type === 'prompt') {
            refs.inputWrap.classList.remove('boblog-hidden');
            refs.input.value = finalOptions.defaultValue;
            refs.input.setAttribute('placeholder', finalOptions.placeholder);
        }

        return new Promise(function (resolve) {
            currentDialog = {
                id: HOST_ID,
                type: type,
                options: finalOptions,
                resolve: resolve,
                done: false
            };

            window.BoblogUI.Modal.show(HOST_ID);

            if (type === 'prompt') {
                window.setTimeout(function () {
                    refs.input.focus();
                    refs.input.select();
                }, 0);
            } else {
                window.setTimeout(function () {
                    refs.confirm.focus();
                }, 0);
            }
        });
    }

    /**
     * 声明式绑定 form / a / button 的确认行为
     *
     * 约定：
     *   - form[data-boblog-confirm]
     *   - a[data-boblog-confirm]
     *   - button[data-boblog-confirm]
     *   - input[type=submit][data-boblog-confirm]
     *
     * @param {HTMLElement} [container] - 绑定范围
     */
    function init(container) {
        var root = container || document;

        root.querySelectorAll('form[data-boblog-confirm]').forEach(function (form) {
            if (form.dataset.boblogDialogBound === 'true') {
                return;
            }

            form.dataset.boblogDialogBound = 'true';
            form.addEventListener('submit', async function (event) {
                if (form.dataset.boblogDialogSubmitting === 'true') {
                    return;
                }

                event.preventDefault();
                var ok = await open('confirm', form.getAttribute('data-boblog-confirm') || '确认继续吗？', getConfirmOptionsFromElement(form));
                if (!ok) {
                    return;
                }

                form.dataset.boblogDialogSubmitting = 'true';
                form.submit();
            });
        });

        root.querySelectorAll('a[data-boblog-confirm], button[data-boblog-confirm], input[type="submit"][data-boblog-confirm]').forEach(function (element) {
            if (element.dataset.boblogDialogBound === 'true') {
                return;
            }

            element.dataset.boblogDialogBound = 'true';
            element.addEventListener('click', async function (event) {
                if (element.dataset.boblogDialogConfirmed === 'true') {
                    element.dataset.boblogDialogConfirmed = 'false';
                    return;
                }

                event.preventDefault();

                var ok = await open('confirm', element.getAttribute('data-boblog-confirm') || '确认继续吗？', getConfirmOptionsFromElement(element));
                if (!ok) {
                    return;
                }

                if (element.tagName === 'A' && element.href) {
                    window.location.href = element.href;
                    return;
                }

                var form = element.form || element.closest('form');
                if (form) {
                    element.dataset.boblogDialogConfirmed = 'true';
                    if (typeof form.requestSubmit === 'function' && element.tagName !== 'A') {
                        form.requestSubmit(element);
                    } else {
                        form.submit();
                    }
                    return;
                }

                element.dataset.boblogDialogConfirmed = 'true';
                element.click();
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            ensureHost();
            init(document);
        });
    } else {
        ensureHost();
        init(document);
    }

    window.BoblogUI.Dialog = {
        alert: function (message, options) {
            return open('alert', message, options);
        },
        confirm: function (message, options) {
            return open('confirm', message, options);
        },
        prompt: function (message, options) {
            return open('prompt', message, options);
        },
        init: init
    };
})();
