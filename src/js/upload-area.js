/**
 * Bo-Blog UI 组件 - Upload Area 上传区域 (upload-area)
 *
 * 功能：
 *   - 自动扫描页面中的 .boblog-upload-area 容器，绑定拖拽和点击上传交互
 *   - 拖拽文件进入时添加 .dragging 状态类，离开或放下时移除
 *   - 点击上传区域触发关联的 <input type="file"> 文件选择
 *   - 提供文件大小格式化、文件类型图标等通用工具函数
 *   - 提供 showMessage() 消息提示功能（基于 boblog-message 组件）
 *   - 提供文件列表容器显隐控制
 *
 * 自动初始化：
 *   页面加载后自动扫描 .boblog-upload-area，查找内部的 input[type="file"] 并绑定交互。
 *   如果 input 不在 .boblog-upload-area 内部，可通过 data-file-input 属性指定选择器。
 *
 * 手动初始化：
 *   BoblogUI.uploadArea.init(options) — 传入配置对象，指定各元素和回调
 *
 * HTML 结构：
 *   <div class="boblog-upload-area" data-file-input="#fileInput">
 *       <div class="boblog-icon-upload">📁</div>
 *       <div class="boblog-text-md">点击或拖拽文件到此处上传</div>
 *       <div class="boblog-text-xs boblog-text-gray">支持多种格式</div>
 *   </div>
 *   <input type="file" id="fileInput" multiple hidden />
 *
 * 公开 API：
 *   BoblogUI.uploadArea.init([options])      — 初始化上传区域
 *   BoblogUI.uploadArea.formatFileSize(bytes) — 格式化文件大小
 *   BoblogUI.uploadArea.getFileIcon(mimeType) — 根据 MIME 类型返回图标
 *   BoblogUI.uploadArea.getFileIconByType(fileType) — 根据文件类型字符串返回图标
 *   BoblogUI.uploadArea.showMessage(el, text, type) — 显示消息提示
 *   BoblogUI.uploadArea.updateListVisibility(containerEl, hasItems) — 列表容器显隐
 *
 * 依赖：
 *   - src/components/upload-area.scss（样式）
 *   - src/components/message.css（消息提示样式，可选）
 */

(function () {
    'use strict';

    /* 确保全局命名空间存在 */
    window.BoblogUI = window.BoblogUI || {};

    /* ========== 工具函数 ========== */

    /**
     * 格式化文件大小为人类可读字符串
     *
     * @param {number} bytes 文件大小（字节）
     * @returns {string} 格式化后的字符串，如 "1.5 MB"
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        var k = 1024;
        var sizes = ['B', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * 根据 MIME 类型返回对应的文件图标（emoji）
     *
     * @param {string} mimeType MIME 类型字符串，如 "image/png"
     * @returns {string} 图标 emoji
     */
    function getFileIcon(mimeType) {
        if (!mimeType) return '📎';
        if (mimeType.indexOf('image/') === 0) return '🖼️';
        if (mimeType.indexOf('video/') === 0) return '🎬';
        if (mimeType.indexOf('audio/') === 0) return '🎵';
        if (mimeType.indexOf('pdf') !== -1) return '📄';
        if (mimeType.indexOf('zip') !== -1 || mimeType.indexOf('rar') !== -1) return '📦';
        return '📎';
    }

    /**
     * 根据文件类型字符串返回对应的文件图标（emoji）
     * 用于服务端返回的 fileType 字段（image/video/audio/attachment）
     *
     * @param {string} fileType 文件类型字符串
     * @returns {string} 图标 emoji
     */
    function getFileIconByType(fileType) {
        switch (fileType) {
            case 'image': return '🖼️';
            case 'video': return '🎬';
            case 'audio': return '🎵';
            case 'attachment': return '📎';
            default: return '📎';
        }
    }

    /**
     * 在指定的消息容器中显示消息提示
     * 使用 boblog-message 组件的样式类
     *
     * @param {HTMLElement} messageEl 消息容器元素
     * @param {string} text 消息文本
     * @param {string} type 消息类型：'success' | 'error' | 'warning' | 'info'
     * @param {number} [duration=3000] 自动消失时间（毫秒），0 表示不自动消失
     */
    function showMessage(messageEl, text, type, duration) {
        if (!messageEl) return;

        /* 设置消息内容和样式 */
        messageEl.textContent = text;
        messageEl.className = 'boblog-message';
        if (type) {
            messageEl.className += ' boblog-message-' + type;
        }
        messageEl.style.display = 'block';

        /* 默认 3 秒后自动隐藏 */
        if (duration !== 0) {
            var hideDelay = duration || 3000;
            setTimeout(function () {
                messageEl.style.display = 'none';
            }, hideDelay);
        }
    }

    /**
     * 控制文件列表容器的显示/隐藏
     *
     * @param {HTMLElement} containerEl 列表容器元素
     * @param {boolean} hasItems 是否有文件项
     */
    function updateListVisibility(containerEl, hasItems) {
        if (!containerEl) return;
        containerEl.style.display = hasItems ? 'block' : 'none';
    }

    /* ========== 核心初始化 ========== */

    /**
     * 为单个上传区域绑定拖拽和点击交互
     *
     * @param {HTMLElement} uploadAreaEl 上传区域元素（.boblog-upload-area）
     * @param {HTMLInputElement} fileInputEl 关联的文件输入元素
     * @param {Function} [onFilesSelected] 文件选择后的回调，参数为 FileList
     */
    function bindUploadArea(uploadAreaEl, fileInputEl, onFilesSelected) {
        if (!uploadAreaEl || !fileInputEl) return;

        /* 跳过已初始化的元素 */
        if (uploadAreaEl.getAttribute('data-boblog-upload-init') === '1') return;

        /* 点击上传区域 → 触发文件选择 */
        uploadAreaEl.addEventListener('click', function () {
            fileInputEl.click();
        });

        /* 文件选择事件 */
        fileInputEl.addEventListener('change', function (e) {
            if (e.target.files && e.target.files.length > 0) {
                if (onFilesSelected) {
                    onFilesSelected(e.target.files);
                }
            }
        });

        /* 拖拽进入：添加 dragging 状态 */
        uploadAreaEl.addEventListener('dragover', function (e) {
            e.preventDefault();
            uploadAreaEl.classList.add('dragging');
        });

        /* 拖拽离开：移除 dragging 状态 */
        uploadAreaEl.addEventListener('dragleave', function () {
            uploadAreaEl.classList.remove('dragging');
        });

        /* 拖拽放下：移除 dragging 状态，处理文件 */
        uploadAreaEl.addEventListener('drop', function (e) {
            e.preventDefault();
            uploadAreaEl.classList.remove('dragging');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                if (onFilesSelected) {
                    onFilesSelected(e.dataTransfer.files);
                }
            }
        });

        /* 标记已初始化 */
        uploadAreaEl.setAttribute('data-boblog-upload-init', '1');
    }

    /**
     * 初始化上传区域
     *
     * 两种使用方式：
     * 1. 无参数调用：自动扫描页面中所有 .boblog-upload-area
     * 2. 传入 options 对象：手动指定各元素和回调
     *
     * @param {Object} [options] 配置对象
     * @param {string|HTMLElement} [options.uploadAreaEl] 上传区域元素或选择器
     * @param {string|HTMLElement} [options.fileInputEl] 文件输入元素或选择器
     * @param {Function} [options.onFilesSelected] 文件选择后的回调
     */
    function init(options) {
        if (options) {
            /* 手动模式：使用 options 指定的元素 */
            var areaEl = typeof options.uploadAreaEl === 'string'
                ? document.querySelector(options.uploadAreaEl) : options.uploadAreaEl;
            var inputEl = typeof options.fileInputEl === 'string'
                ? document.querySelector(options.fileInputEl) : options.fileInputEl;

            bindUploadArea(areaEl, inputEl, options.onFilesSelected);
        } else {
            /* 自动模式：扫描页面中所有 .boblog-upload-area */
            var areas = document.querySelectorAll('.boblog-upload-area');
            for (var i = 0; i < areas.length; i++) {
                var area = areas[i];
                /* 查找关联的文件输入框 */
                var input = null;

                /* 优先使用 data-file-input 属性指定的选择器 */
                var inputSelector = area.getAttribute('data-file-input');
                if (inputSelector) {
                    input = document.querySelector(inputSelector);
                }

                /* 其次查找内部的 input[type="file"] */
                if (!input) {
                    input = area.querySelector('input[type="file"]');
                }

                if (input) {
                    bindUploadArea(area, input, null);
                }
            }
        }
    }

    /* ========== 注册到全局命名空间 ========== */

    BoblogUI.uploadArea = {
        init: init,
        formatFileSize: formatFileSize,
        getFileIcon: getFileIcon,
        getFileIconByType: getFileIconByType,
        showMessage: showMessage,
        updateListVisibility: updateListVisibility
    };

    /* DOM 就绪后自动初始化（无参数，扫描模式） */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            init();
        });
    } else {
        init();
    }

})();
