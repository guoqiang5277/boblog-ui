/**
 * Bo-Blog UI 组件 - 自定义下拉选择 (select)
 *
 * 功能：
 *   - 自动扫描页面中的 .boblog-select 容器
 *   - 将原生 <select> 转换为可自定义样式的下拉面板
 *   - 支持键盘操作（上下箭头、Enter、Escape）
 *   - 支持禁用状态、错误状态
 *   - 点击外部自动关闭
 *
 * HTML 结构约定（转换前）：
 *   <div class="boblog-select">
 *       <select>
 *           <option>请选择...</option>
 *           <option value="1">选项 1</option>
 *           <option value="2" disabled>选项 2（禁用）</option>
 *       </select>
 *   </div>
 *
 * 转换后生成：
 *   <div class="boblog-select boblog-select-custom">
 *       <select style="display:none">...</select>           ← 隐藏的原生 select（保持表单提交）
 *       <div class="boblog-select-display">当前选中文字</div> ← 显示区域
 *       <div class="boblog-select-dropdown">                 ← 下拉面板
 *           <div class="boblog-select-option" data-value="">请选择...</div>
 *           <div class="boblog-select-option" data-value="1">选项 1</div>
 *           <div class="boblog-select-option disabled" data-value="2">选项 2（禁用）</div>
 *       </div>
 *   </div>
 *
 * 公开 API：
 *   BoblogUI.select.init([container])  — 初始化指定容器（默认 document）内所有下拉
 *
 * 参数（HTML data 属性）：
 *   data-fixed-width="false"  — 禁用自动宽度固定，容器宽度由 CSS/style 控制
 *                               默认行为：自动计算所有选项最大宽度并固定容器宽度，
 *                               防止切换选项时宽度跳动
 *
 * 依赖：
 *   - src/controls/select.css（基础样式）
 */

(function () {
    'use strict';

    /* 确保全局命名空间存在 */
    window.BoblogUI = window.BoblogUI || {};

    /* ============ 工具函数 ============ */

    /**
     * 判断 select 是否处于禁用状态
     * 支持原生 disabled 属性和 .disabled 类名两种方式
     */
    function isDisabled(container) {
        var sel = container.querySelector('select');
        return (sel && sel.disabled) || container.classList.contains('disabled');
    }

    /**
     * 关闭所有已打开的下拉面板
     * @param {HTMLElement} [except] — 排除不关闭的容器
     */
    function closeAll(except) {
        var allOpen = document.querySelectorAll('.boblog-select-custom.open');
        for (var i = 0; i < allOpen.length; i++) {
            if (allOpen[i] !== except) {
                allOpen[i].classList.remove('open');
            }
        }
    }

    /* ============ 核心：转换单个 select ============ */

    /**
     * 将一个 .boblog-select 容器内的原生 select 转换为自定义下拉
     * @param {HTMLElement} container — .boblog-select 容器元素
     */
    function transformSelect(container) {
        var nativeSelect = container.querySelector('select');
        if (!nativeSelect) return;

        /* 多选下拉框不转换，保留原生渲染 */
        if (nativeSelect.multiple) return;

        /* 标记为自定义模式 */
        container.classList.add('boblog-select-custom');

        /* 隐藏原生 select（保留在 DOM 中以便表单提交） */
        nativeSelect.style.display = 'none';

        /* ---------- 创建显示区域 ---------- */
        var display = document.createElement('div');
        display.className = 'boblog-select-display';
        /* 显示当前选中项的文字 */
        var selectedOption = nativeSelect.options[nativeSelect.selectedIndex];
        display.textContent = selectedOption ? selectedOption.textContent : '';
        container.appendChild(display);

        /* ---------- 固定容器宽度为所有选项最大宽度 ---------- */
        /* 默认开启，可通过 data-fixed-width="false" 禁用 */
        if (container.dataset.fixedWidth !== 'false') {
            /* 将 display 元素临时设为 visibility:hidden + white-space:nowrap，
               逐一填入每个选项文字，用 offsetWidth 测量实际渲染宽度（含 padding/箭头），
               取最大值后固定容器宽度 */
            var origVisibility = display.style.visibility;
            var origWhiteSpace = display.style.whiteSpace;
            display.style.visibility = 'hidden';
            display.style.whiteSpace = 'nowrap';
            var maxW = 0;
            for (var j = 0; j < nativeSelect.options.length; j++) {
                display.textContent = nativeSelect.options[j].textContent;
                var w = display.offsetWidth;
                if (w > maxW) maxW = w;
            }
            /* 还原显示文字 */
            display.textContent = selectedOption ? selectedOption.textContent : '';
            display.style.visibility = origVisibility;
            display.style.whiteSpace = origWhiteSpace;
            if (maxW > 0) container.style.width = maxW + 'px';
        }

        /* ---------- 创建下拉面板 ---------- */
        var dropdown = document.createElement('div');
        dropdown.className = 'boblog-select-dropdown';

        /* 遍历所有 option，生成自定义选项 */
        var options = nativeSelect.options;
        for (var i = 0; i < options.length; i++) {
            var opt = options[i];
            var item = document.createElement('div');
            item.className = 'boblog-select-option';
            item.setAttribute('data-value', opt.value);
            item.setAttribute('data-index', i);
            item.textContent = opt.textContent;

            /* 禁用选项 */
            if (opt.disabled) {
                item.classList.add('disabled');
            }

            /* 当前选中项高亮 */
            if (i === nativeSelect.selectedIndex) {
                item.classList.add('selected');
            }

            dropdown.appendChild(item);
        }
        container.appendChild(dropdown);

        /* ---------- 事件：点击显示区域，切换下拉 ---------- */
        display.addEventListener('click', function (e) {
            e.stopPropagation();
            /* 禁用状态不响应 */
            if (isDisabled(container)) return;

            /* 关闭其他已打开的下拉 */
            closeAll(container);
            /* 切换当前下拉 */
            container.classList.toggle('open');
        });

        /* ---------- 事件：点击选项，选中并关闭 ---------- */
        dropdown.addEventListener('click', function (e) {
            var target = e.target;
            /* 确保点击的是选项元素 */
            if (!target.classList.contains('boblog-select-option')) return;
            /* 禁用选项不响应 */
            if (target.classList.contains('disabled')) return;

            var index = parseInt(target.getAttribute('data-index'), 10);

            /* 更新原生 select 的值 */
            nativeSelect.selectedIndex = index;

            /* 触发 change 事件，确保外部监听器能感知变化 */
            var changeEvent = new Event('change', { bubbles: true });
            nativeSelect.dispatchEvent(changeEvent);

            /* 更新显示文字 */
            display.textContent = target.textContent;

            /* 更新选中高亮 */
            var allItems = dropdown.querySelectorAll('.boblog-select-option');
            for (var j = 0; j < allItems.length; j++) {
                allItems[j].classList.remove('selected');
            }
            target.classList.add('selected');

            /* 关闭下拉 */
            container.classList.remove('open');
        });

        /* ---------- 事件：键盘操作 ---------- */
        display.setAttribute('tabindex', '0');
        display.addEventListener('keydown', function (e) {
            if (isDisabled(container)) return;

            var isOpen = container.classList.contains('open');
            var allItems = dropdown.querySelectorAll('.boblog-select-option:not(.disabled)');
            var currentIndex = -1;

            /* 找到当前高亮项 */
            for (var k = 0; k < allItems.length; k++) {
                if (allItems[k].classList.contains('selected')) {
                    currentIndex = k;
                    break;
                }
            }

            switch (e.key) {
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (!isOpen) {
                        closeAll(container);
                        container.classList.add('open');
                    } else {
                        /* 确认选中当前高亮项 */
                        if (currentIndex >= 0) {
                            allItems[currentIndex].click();
                        }
                    }
                    break;

                case 'Escape':
                    e.preventDefault();
                    container.classList.remove('open');
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    if (!isOpen) {
                        closeAll(container);
                        container.classList.add('open');
                    } else {
                        /* 向下移动高亮 */
                        var nextIndex = (currentIndex + 1) % allItems.length;
                        for (var m = 0; m < allItems.length; m++) {
                            allItems[m].classList.remove('selected');
                        }
                        allItems[nextIndex].classList.add('selected');
                        /* 滚动到可见区域 */
                        allItems[nextIndex].scrollIntoView({ block: 'nearest' });
                    }
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    if (isOpen) {
                        /* 向上移动高亮 */
                        var prevIndex = (currentIndex - 1 + allItems.length) % allItems.length;
                        for (var n = 0; n < allItems.length; n++) {
                            allItems[n].classList.remove('selected');
                        }
                        allItems[prevIndex].classList.add('selected');
                        allItems[prevIndex].scrollIntoView({ block: 'nearest' });
                    }
                    break;
            }
        });
    }

    /* ============ 初始化入口 ============ */

    /**
     * 初始化自定义下拉选择
     * 扫描 container 内所有 .boblog-select 容器，
     * 将原生 select 转换为自定义下拉组件。
     *
     * @param {HTMLElement} [container=document] — 扫描范围
     */
    function init(container) {
        var root = container || document;

        var selectContainers = root.querySelectorAll('.boblog-select');

        selectContainers.forEach(function (el) {
            /* 跳过已初始化的容器 */
            if (el.dataset.bbSelectInit) return;
            el.dataset.bbSelectInit = '1';

            transformSelect(el);
        });
    }

    /* ============ 全局事件：点击外部关闭所有下拉 ============ */
    document.addEventListener('click', function () {
        closeAll();
    });

    /* 挂载到全局命名空间 */
    BoblogUI.select = {
        init: init
    };

    /* DOMContentLoaded 时自动初始化 */
    document.addEventListener('DOMContentLoaded', function () {
        init();
    });

})();
