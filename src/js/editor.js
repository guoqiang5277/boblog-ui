/**
 * Bo-Blog UI - Editor / 富文本编辑器组件 (TinyMCE 封装层)
 *
 * 为 .boblog-editor 提供基于 TinyMCE 7 的富文本编辑功能
 *
 * HTML 结构约定（简化版）:
 *   <div class="boblog-editor"
 *        data-toolbar="full"
 *        data-height="500"
 *        data-upload-url="/api/upload/file"
 *        data-base-url="/lib/tinymce"
 *        data-language="zh_CN"
 *        data-menubar="true">
 *       <textarea class="boblog-editor-content"></textarea>
 *   </div>
 *
 * data 属性说明:
 *   - data-toolbar: 工具栏预设 (basic/simple/standard/full)，默认 full
 *   - data-height: 编辑器高度（像素），默认 500
 *   - data-upload-url: 图片上传URL（可选）
 *   - data-base-url: TinyMCE base_url（可选，不设置则自动推断）
 *   - data-language: 语言代码，默认 zh_CN
 *   - data-menubar: 是否显示菜单栏，默认 true，设为 "false" 隐藏
 *
 * 公开 API:
 *   BoblogUI.editor.init([container])            - 初始化指定容器（默认 document）内所有编辑器
 *   BoblogUI.editor.destroy(container)           - 销毁编辑器
 *   BoblogUI.editor.getContent(container)        - 获取内容
 *   BoblogUI.editor.setContent(container, html)  - 设置内容
 *
 * 依赖:
 *   - TinyMCE 7+ (需要先引入 tinymce.min.js)
 *   - src/controls/editor.css (编辑器容器样式)
 */
(function () {
    'use strict';

    /* 确保全局命名空间存在 */
    window.BoblogUI = window.BoblogUI || {};

    /* ============ 工具栏预设配置 ============ */
    var TOOLBAR_PRESETS = {
        /* 基础款：撤销重做、基础格式、列表、链接 */
        basic: 'undo redo | bold italic underline strikethrough | bullist numlist | link',
        /* 简洁款：覆盖12项功能需求，紧凑单行工具栏 */
        simple: 'bold italic underline strikethrough | blocks bullist numlist blockquote | link codesample | forecolor backcolor fontfamily fontsize lineheight removeformat',
        /* 标准款：含对齐、图片 */
        standard: 'undo redo | formatselect | bold italic underline strikethrough | alignleft aligncenter alignright | bullist numlist | link image | removeformat',
        /* 完整款：4行工具栏，全部功能 */
        full: [
            'bold italic underline strikethrough blockquote alignleft aligncenter alignright alignnone ltr rtl visualblocks visualchars fullscreen restoredraft save cancel',
            'bullist numlist indent outdent undo redo link unlink anchor image code codesample emoticons media',
            'styles fontfamily fontsize fontsizeinput insertdatetime wordcount',
            'forecolor backcolor hr removeformat table subscript superscript charmap searchreplace preview uploader'
        ]
    };

    /* ============ 预设对应的插件配置 ============ */
    /* 每个预设使用的插件列表，与 TOOLBAR_PRESETS 一一对应 */
    var PRESET_PLUGINS = {
        /* 基础款：列表、链接 */
        basic: 'lists link',
        /* 简洁款：列表、链接、代码高亮 */
        simple: 'lists link codesample',
        /* 标准款：列表、链接、图片 */
        standard: 'lists link image',
        /* 完整款：全部插件 */
        full: 'lists advlist anchor autolink autosave directionality fullscreen help preview save code charmap codesample emoticons link media insertdatetime table searchreplace image visualblocks visualchars wordcount uploader'
    };

    /* ============ 按钮到插件的映射表 ============ */
    /*
     * 用于自定义工具栏时动态推断所需插件
     * 键：工具栏按钮名称
     * 值：该按钮依赖的插件名称（null 表示内置功能，无需额外插件）
     */
    var BUTTON_PLUGINS = {
        /* 列表相关 - 需要 lists 插件 */
        'bullist': 'lists',
        'numlist': 'lists',
        /* 高级列表 - 需要 advlist 插件（依赖 lists） */
        'indent': 'advlist',
        'outdent': 'advlist',
        /* 链接相关 - 需要 link 插件 */
        'link': 'link',
        'unlink': 'link',
        /* 锚点 - 需要 anchor 插件 */
        'anchor': 'anchor',
        /* 图片 - 需要 image 插件 */
        'image': 'image',
        /* 代码视图 - 需要 code 插件 */
        'code': 'code',
        /* 代码高亮块 - 需要 codesample 插件 */
        'codesample': 'codesample',
        /* 表情 - 需要 emoticons 插件 */
        'emoticons': 'emoticons',
        /* 媒体嵌入 - 需要 media 插件 */
        'media': 'media',
        /* 表格 - 需要 table 插件 */
        'table': 'table',
        /* 查找替换 - 需要 searchreplace 插件 */
        'searchreplace': 'searchreplace',
        /* 插入日期时间 - 需要 insertdatetime 插件 */
        'insertdatetime': 'insertdatetime',
        /* 特殊字符 - 需要 charmap 插件 */
        'charmap': 'charmap',
        /* 全屏 - 需要 fullscreen 插件 */
        'fullscreen': 'fullscreen',
        /* 预览 - 需要 preview 插件 */
        'preview': 'preview',
        /* 帮助 - 需要 help 插件 */
        'help': 'help',
        /* 保存/取消 - 需要 save 插件 */
        'save': 'save',
        'cancel': 'save',
        /* 恢复草稿 - 需要 autosave 插件 */
        'restoredraft': 'autosave',
        /* 文本方向 - 需要 directionality 插件 */
        'ltr': 'directionality',
        'rtl': 'directionality',
        /* 可视块/可视字符 - 需要对应插件 */
        'visualblocks': 'visualblocks',
        'visualchars': 'visualchars',
        /* 字数统计 - 需要 wordcount 插件 */
        'wordcount': 'wordcount',
        /* 自定义附件上传 - 需要 uploader 插件 */
        'uploader': 'uploader',
        /* 以下为 TinyMCE 内置功能，无需额外插件 */
        'undo': null,
        'redo': null,
        'bold': null,
        'italic': null,
        'underline': null,
        'strikethrough': null,
        'subscript': null,
        'superscript': null,
        'blockquote': null,
        'alignleft': null,
        'aligncenter': null,
        'alignright': null,
        'alignjustify': null,
        'alignnone': null,
        'forecolor': null,
        'backcolor': null,
        'fontfamily': null,
        'fontsize': null,
        'fontsizeinput': null,
        'lineheight': null,
        'removeformat': null,
        'hr': null,
        'blocks': null,
        'styles': null,
        'formatselect': null
    };

    /**
     * 根据工具栏配置动态推断所需插件列表
     * @param {string|string[]} toolbar - 工具栏配置（字符串或数组）
     * @returns {string} 插件列表字符串（空格分隔）
     */
    function inferPlugins(toolbar) {
        /* 将工具栏转为统一的字符串 */
        var toolbarStr = Array.isArray(toolbar) ? toolbar.join(' ') : toolbar;

        /* 提取所有按钮名称（按空格和竖线分割） */
        var buttons = toolbarStr.split(/[\s|]+/).filter(function(btn) {
            return btn.length > 0;
        });

        /* 收集所需插件（使用对象去重） */
        var pluginsMap = {};

        /* autolink 总是需要（自动识别链接） */
        pluginsMap['autolink'] = true;

        buttons.forEach(function(button) {
            var plugin = BUTTON_PLUGINS[button];
            if (plugin) {
                pluginsMap[plugin] = true;
                /* advlist 依赖 lists */
                if (plugin === 'advlist') {
                    pluginsMap['lists'] = true;
                }
            }
        });

        /* 返回空格分隔的插件列表 */
        return Object.keys(pluginsMap).join(' ');
    }

    /* 代码语言列表（同 tinymce7-editor.js） */
    var CODE_LANGUAGES = [
        {text: 'HTML/XML', value: 'markup'},
        {text: 'JavaScript', value: 'javascript'},
        {text: 'CSS', value: 'css'},
        {text: 'PHP', value: 'php'},
        {text: 'Python', value: 'python'},
        {text: 'Java', value: 'java'},
        {text: 'C', value: 'c'},
        {text: 'C#', value: 'csharp'},
        {text: 'C++', value: 'cpp'},
        {text: 'SQL', value: 'sql'},
        {text: 'Swift', value: 'swift'},
        {text: 'XML', value: 'xml'},
        {text: 'Markdown', value: 'markdown'},
        {text: 'Plain text', value: 'text'}
    ];

    /* 时间格式预设（同 tinymce7-editor.js） */
    var DATETIME_FORMATS = [
        "%Y年%m月%d日 %H点%M分%S秒",
        "%H点%M分%S秒",
        "%Y年%m月%d日",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%H:%M:%S"
    ];

    /**
     * 自动推断 TinyMCE base_url
     * 从页面中 <script src="...tinymce.min.js"> 或 <script src="...tinymce.js"> 标签推断
     * 只匹配主入口文件，排除 TinyMCE 动态加载的其他脚本（如 theme.min.js）
     * @returns {string|null} base_url 或 null
     */
    function inferBaseUrl() {
        var scripts = document.querySelectorAll('script[src]');
        for (var i = 0; i < scripts.length; i++) {
            var src = scripts[i].src;
            /* 只匹配 tinymce.min.js 或 tinymce.js 结尾的路径 */
            if (/\/tinymce(\.min)?\.js(\?.*)?$/.test(src)) {
                return src.replace(/\/tinymce(\.min)?\.js(\?.*)?$/, '');
            }
        }
        return null;
    }

    /**
     * 创建图片上传处理器
     * @param {string} uploadUrl - 上传 URL
     * @returns {Function} 上传处理函数
     */
    function createUploadHandler(uploadUrl) {
        return function (blobInfo, progress) {
            return new Promise(function (resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.withCredentials = true;

                /* 进度回调 */
                xhr.upload.onprogress = function (e) {
                    progress(e.loaded / e.total * 100);
                };

                /* 完成回调 */
                xhr.onload = function () {
                    if (xhr.status === 403) {
                        reject({ message: '未授权：图片上传失败', remove: true });
                        return;
                    }
                    if (xhr.status < 200 || xhr.status >= 300) {
                        reject('HTTP错误: ' + xhr.status);
                        return;
                    }

                    var json = JSON.parse(xhr.responseText);
                    if (!json || typeof json.location !== 'string') {
                        reject('返回格式错误: ' + xhr.responseText);
                        return;
                    }

                    resolve(json.location);
                };

                /* 错误回调 */
                xhr.onerror = function () {
                    reject('图片上传失败: ' + xhr.status);
                };

                /* 构造表单数据 */
                var formData = new FormData();
                formData.append('file', blobInfo.blob(), blobInfo.filename());
                formData.append('fileType', 'Images');

                xhr.open('POST', uploadUrl);
                xhr.send(formData);
            });
        };
    }

    /**
     * 初始化单个富文本编辑器
     * @param {HTMLElement} editor - .boblog-editor 容器
     */
    function initOne(editor) {
        /* 检查 TinyMCE 是否存在 */
        if (typeof tinymce === 'undefined') {
            console.error('[BoblogUI.editor] TinyMCE 未加载，请先引入 tinymce.min.js');
            return;
        }

        /* 防止重复初始化 */
        if (editor.getAttribute('data-editor-init')) return;
        editor.setAttribute('data-editor-init', '1');

        /* 查找 textarea */
        var textarea = editor.querySelector('.boblog-editor-content');
        if (!textarea) {
            console.error('[BoblogUI.editor] 未找到 .boblog-editor-content textarea');
            return;
        }

        /* 给 textarea 设置唯一 ID（用于 TinyMCE selector） */
        var editorId = 'boblog-editor-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        textarea.id = editorId;

        /* 读取 data 属性配置 */
        var toolbarType = editor.getAttribute('data-toolbar') || 'basic';
        var height = parseInt(editor.getAttribute('data-height'), 10) || 500;
        var uploadUrl = editor.getAttribute('data-upload-url') || null;
        var baseUrl = editor.getAttribute('data-base-url') || inferBaseUrl() || '/lib/tinymce';
        var language = editor.getAttribute('data-language') || 'zh_CN';
        var menubar = editor.getAttribute('data-menubar') !== 'false'; // 默认显示，设为 "false" 则隐藏

        /* 获取工具栏配置：预设名优先，否则视为自定义工具栏字符串 */
        var toolbar = TOOLBAR_PRESETS[toolbarType] || toolbarType;

        /*
         * 动态推断插件列表：
         * 1. 如果是预设名称，使用 PRESET_PLUGINS 中的预定义插件列表
         * 2. 如果是自定义工具栏字符串，通过 BUTTON_PLUGINS 映射表动态推断
         */
        var plugins = PRESET_PLUGINS[toolbarType] || inferPlugins(toolbar);

        /* simple 预设添加紧凑样式类 */
        if (toolbarType === 'simple') {
            editor.classList.add('boblog-editor--compact');
        }

        /* 检查禁用状态 */
        var isDisabled = editor.classList.contains('disabled');

        /* 构建 TinyMCE 配置 */
        var tinyConfig = {
            selector: '#' + editorId,
            height: height,
            language: language,
            base_url: baseUrl,
            language_url: baseUrl + '/langs/' + language + '.js',
            skin: 'bobo',
            menubar: menubar,
            promotion: false,      // 去掉右上角升级按钮
            branding: false,       // 去掉右下角官方链接
            readonly: isDisabled,  // 禁用状态设为只读

            /* 插件列表（根据工具栏动态推断） */
            plugins: plugins,

            /* 工具栏 */
            toolbar: toolbar,

            /* 图片高级选项卡 */
            image_advtab: true,

            /* 时间格式 */
            insertdatetime_formats: DATETIME_FORMATS,

            /* 代码语言列表 */
            codesample_languages: CODE_LANGUAGES,

            /* 内容样式 */
            content_style: 'body { font-family: Tahoma, Arial, sans-serif; font-size: 14px; }',

            /* 粘贴与上传配置 */
            paste_data_images: false,
            automatic_uploads: true,
            relative_urls: false,
            remove_script_host: false,
            convert_urls: true,

            /* 图片上传配置（如果提供了 uploadUrl） */
            images_upload_url: uploadUrl ? uploadUrl + '?fileType=Images' : null,
            images_upload_credentials: true,
            images_upload_handler: uploadUrl ? createUploadHandler(uploadUrl) : null,

            /* 自动保存配置（默认禁用） */
            autosave_ask_before_unload: false,
            autosave_interval: '30s',
            autosave_prefix: 'boblog-editor-autosave-{path}{query}-{id}-',
            autosave_restore_when_empty: false
        };

        /* 初始化 TinyMCE */
        tinymce.init(tinyConfig);

        /* 工具栏粘性定位（聚焦时固定在顶部） */
        setTimeout(function () {
            var instance = tinymce.get(editorId);
            if (instance) {
                instance.on('focus', function () {
                    var toolbar = instance.getContainer().querySelector('.tox-editor-header');
                    if (toolbar) {
                        toolbar.style.position = 'sticky';
                        toolbar.style.top = '0';
                        toolbar.style.zIndex = '1000';
                        toolbar.style.backgroundColor = '#fff';
                    }
                });

                instance.on('blur', function () {
                    var toolbar = instance.getContainer().querySelector('.tox-editor-header');
                    if (toolbar) {
                        toolbar.style.position = 'static';
                    }
                });
            }
        }, 1000);

        /* 保存编辑器 ID 到容器（用于后续 API 调用） */
        editor.setAttribute('data-editor-id', editorId);
    }

    /**
     * 初始化指定容器内所有富文本编辑器
     * @param {HTMLElement} [container] - 搜索范围，默认 document
     */
    function init(container) {
        var root = container || document;
        var editors = root.querySelectorAll('.boblog-editor');
        for (var i = 0; i < editors.length; i++) {
            initOne(editors[i]);
        }
    }

    /**
     * 销毁编辑器
     * @param {HTMLElement} container - .boblog-editor 容器
     */
    function destroy(container) {
        if (typeof tinymce === 'undefined') return;

        var editorId = container.getAttribute('data-editor-id');
        if (editorId) {
            var instance = tinymce.get(editorId);
            if (instance) {
                instance.remove();
            }
            container.removeAttribute('data-editor-id');
            container.removeAttribute('data-editor-init');
        }
    }

    /**
     * 获取编辑器内容
     * @param {HTMLElement} container - .boblog-editor 容器
     * @returns {string} HTML 内容
     */
    function getContent(container) {
        if (typeof tinymce === 'undefined') return '';

        var editorId = container.getAttribute('data-editor-id');
        if (editorId) {
            var instance = tinymce.get(editorId);
            if (instance) {
                return instance.getContent();
            }
        }
        return '';
    }

    /**
     * 设置编辑器内容
     * @param {HTMLElement} container - .boblog-editor 容器
     * @param {string} html - HTML 内容
     */
    function setContent(container, html) {
        if (typeof tinymce === 'undefined') return;

        var editorId = container.getAttribute('data-editor-id');
        if (editorId) {
            var instance = tinymce.get(editorId);
            if (instance) {
                instance.setContent(html);
            }
        }
    }

    /* ============ 公开 API ============ */
    BoblogUI.editor = {
        init: init,
        destroy: destroy,
        getContent: getContent,
        setContent: setContent
    };

    /* ============ 自动初始化 ============ */
    document.addEventListener('DOMContentLoaded', function () {
        init();
    });
})();
