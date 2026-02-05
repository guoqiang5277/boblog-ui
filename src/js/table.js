/**
 * Bo-Blog UI 组件 - 表格排序与分页 (table)
 *
 * 功能：
 *   【排序】
 *   - 自动扫描页面中带 .boblog-th-sortable 的表头单元格
 *   - 点击表头切换排序方向：无序 → 升序(asc) → 降序(desc) → 无序
 *   - 自动识别数据类型：数字、日期(YYYY-MM-DD)、字符串
 *   - 排序时自动更新 CSS 类名（.boblog-sort-asc / .boblog-sort-desc）
 *   - 同一表格同时只有一列处于排序状态
 *
 *   【分页】
 *   - 自动扫描带 data-page-size 属性的 .boblog-table 表格
 *   - 根据每页条数自动分页，隐藏非当前页的行
 *   - 在表格下方自动生成分页导航栏（使用 .boblog-pagination 样式）
 *   - 排序后自动跳回第一页，保持排序与分页联动
 *
 * HTML 结构约定：
 *   <!-- 排序 + 分页 -->
 *   <table class="boblog-table" data-page-size="5">
 *       <thead>
 *           <tr>
 *               <th class="boblog-th-sortable">可排序列</th>
 *               <th>普通列</th>
 *           </tr>
 *       </thead>
 *       <tbody>...</tbody>
 *   </table>
 *
 *   - .boblog-th-sortable: 标记该列可排序
 *   - data-page-size="N": 每页显示 N 条（不设置则不分页）
 *   - .boblog-sort-asc / .boblog-sort-desc: JS 自动管理
 *   - 分页导航栏自动插入到 table 后面
 *
 * 依赖：pagination.css（分页导航样式）
 */
(function () {
    'use strict';

    /* ==================================================
     * 工具函数
     * ================================================== */

    /**
     * 判断字符串是否为数字（含整数、小数、负数）
     * @param {string} str - 待判断的字符串
     * @returns {boolean}
     */
    function isNumeric(str) {
        return !isNaN(parseFloat(str)) && isFinite(str);
    }

    /**
     * 判断字符串是否为日期格式（YYYY-MM-DD 或 YYYY-MM-DD HH:MM）
     * @param {string} str - 待判断的字符串
     * @returns {boolean}
     */
    function isDate(str) {
        return /^\d{4}-\d{2}-\d{2}/.test(str);
    }

    /**
     * 获取单元格的纯文本内容（去除首尾空白）
     * @param {HTMLElement} cell - td 元素
     * @returns {string}
     */
    function getCellText(cell) {
        return (cell.textContent || cell.innerText || '').trim();
    }

    /**
     * 比较函数：根据数据类型自动选择比较方式
     * - 数字：按数值大小排序
     * - 日期：按时间戳排序
     * - 字符串：按 localeCompare 排序（支持中文）
     *
     * @param {string} a - 第一个值
     * @param {string} b - 第二个值
     * @param {string} direction - 排序方向 'asc' 或 'desc'
     * @returns {number} 比较结果（负数、0、正数）
     */
    function compare(a, b, direction) {
        var result;

        /* 数字比较 */
        if (isNumeric(a) && isNumeric(b)) {
            result = parseFloat(a) - parseFloat(b);
        }
        /* 日期比较 */
        else if (isDate(a) && isDate(b)) {
            result = new Date(a).getTime() - new Date(b).getTime();
        }
        /* 字符串比较（支持中文拼音排序） */
        else {
            result = a.localeCompare(b, 'zh-CN');
        }

        /* 降序时反转结果 */
        return direction === 'desc' ? -result : result;
    }

    /* ==================================================
     * 排序功能
     * ================================================== */

    /**
     * 对表格按指定列排序（操作 allRows 数组，不直接操作 DOM）
     * @param {Array} rows - 所有行的数组
     * @param {number} colIndex - 排序列的索引（从 0 开始）
     * @param {string} direction - 排序方向 'asc' 或 'desc'
     * @returns {Array} 排序后的行数组
     */
    function sortRows(rows, colIndex, direction) {
        return rows.slice().sort(function (rowA, rowB) {
            var cellA = rowA.cells[colIndex];
            var cellB = rowB.cells[colIndex];
            if (!cellA || !cellB) return 0;
            return compare(getCellText(cellA), getCellText(cellB), direction);
        });
    }

    /**
     * 清除同一表头行中所有排序列的排序状态
     * @param {HTMLElement} headerRow - thead 中的 tr 元素
     */
    function clearSortStates(headerRow) {
        var sortables = headerRow.querySelectorAll('.boblog-th-sortable');
        for (var i = 0; i < sortables.length; i++) {
            sortables[i].classList.remove('boblog-sort-asc');
            sortables[i].classList.remove('boblog-sort-desc');
        }
    }

    /**
     * 获取表头单元格当前的排序方向
     * @param {HTMLElement} th - 表头单元格
     * @returns {string} 'asc'、'desc' 或 'none'
     */
    function getCurrentDirection(th) {
        if (th.classList.contains('boblog-sort-asc')) return 'asc';
        if (th.classList.contains('boblog-sort-desc')) return 'desc';
        return 'none';
    }

    /**
     * 计算下一个排序方向（三态循环：none → asc → desc → none）
     * @param {string} current - 当前方向
     * @returns {string} 下一个方向
     */
    function getNextDirection(current) {
        if (current === 'none') return 'asc';
        if (current === 'asc') return 'desc';
        return 'none';
    }

    /* ==================================================
     * 分页功能
     * ================================================== */

    /**
     * 渲染表格的当前页
     * 根据 tableState 中记录的当前页码和排序后的行，
     * 控制 tbody 中行的显示/隐藏
     *
     * @param {object} state - 表格状态对象
     *   - table: HTMLTableElement
     *   - allRows: 所有行（排序后的顺序）
     *   - pageSize: 每页条数
     *   - currentPage: 当前页码（从 1 开始）
     *   - paginationEl: 分页导航 DOM 元素
     */
    function renderPage(state) {
        var tbody = state.table.querySelector('tbody');
        if (!tbody) return;

        var totalRows = state.allRows.length;
        var totalPages = Math.ceil(totalRows / state.pageSize) || 1;

        /* 确保当前页在有效范围内 */
        if (state.currentPage < 1) state.currentPage = 1;
        if (state.currentPage > totalPages) state.currentPage = totalPages;

        var startIndex = (state.currentPage - 1) * state.pageSize;
        var endIndex = startIndex + state.pageSize;

        /* 先清空 tbody，再按排序顺序插入当前页的行 */
        /* 隐藏所有行 */
        for (var i = 0; i < state.allRows.length; i++) {
            state.allRows[i].style.display = 'none';
            /* 确保行在 tbody 中（排序可能改变了顺序） */
            tbody.appendChild(state.allRows[i]);
        }

        /* 显示当前页的行 */
        for (var j = startIndex; j < endIndex && j < totalRows; j++) {
            state.allRows[j].style.display = '';
        }

        /* 更新分页导航 */
        renderPagination(state, totalPages);
    }

    /**
     * 生成分页导航 HTML
     * 使用 .boblog-pagination 样式，与 pagination.css 配合
     *
     * @param {object} state - 表格状态对象
     * @param {number} totalPages - 总页数
     */
    function renderPagination(state, totalPages) {
        if (!state.paginationEl) return;

        var current = state.currentPage;
        var html = '';

        /* 上一页按钮 */
        if (current <= 1) {
            html += '<span class="boblog-page-link boblog-page-prev boblog-page-disabled">&laquo; 上一页</span>';
        } else {
            html += '<a class="boblog-page-link boblog-page-prev" href="#" data-page="' + (current - 1) + '">&laquo; 上一页</a>';
        }

        /* 页码按钮（最多显示 7 个页码，超出用省略号） */
        var pages = calcPageNumbers(current, totalPages, 7);
        for (var i = 0; i < pages.length; i++) {
            var p = pages[i];
            if (p === '...') {
                html += '<span class="boblog-page-ellipsis">...</span>';
            } else if (p === current) {
                html += '<span class="boblog-page-current">' + p + '</span>';
            } else {
                html += '<a class="boblog-page-link" href="#" data-page="' + p + '">' + p + '</a>';
            }
        }

        /* 下一页按钮 */
        if (current >= totalPages) {
            html += '<span class="boblog-page-link boblog-page-next boblog-page-disabled">下一页 &raquo;</span>';
        } else {
            html += '<a class="boblog-page-link boblog-page-next" href="#" data-page="' + (current + 1) + '">下一页 &raquo;</a>';
        }

        /* 页码信息 */
        var totalRows = state.allRows.length;
        html += '<span class="boblog-page-info">共 ' + totalRows + ' 条，第 ' + current + '/' + totalPages + ' 页</span>';

        state.paginationEl.innerHTML = html;

        /* 绑定页码点击事件 */
        var links = state.paginationEl.querySelectorAll('a[data-page]');
        for (var j = 0; j < links.length; j++) {
            links[j].addEventListener('click', function (e) {
                e.preventDefault();
                var page = parseInt(this.getAttribute('data-page'), 10);
                if (page && page !== state.currentPage) {
                    state.currentPage = page;
                    renderPage(state);
                }
            });
        }
    }

    /**
     * 计算要显示的页码数组
     * 超出范围时用 '...' 表示省略
     *
     * 例如：current=5, total=20, maxVisible=7
     * 结果：[1, '...', 4, 5, 6, '...', 20]
     *
     * @param {number} current - 当前页码
     * @param {number} total - 总页数
     * @param {number} maxVisible - 最多显示的页码数
     * @returns {Array} 页码数组（数字或 '...'）
     */
    function calcPageNumbers(current, total, maxVisible) {
        /* 总页数 <= maxVisible 时，全部显示 */
        if (total <= maxVisible) {
            var all = [];
            for (var i = 1; i <= total; i++) all.push(i);
            return all;
        }

        var pages = [];
        /* 始终显示第一页 */
        pages.push(1);

        /* 计算中间区域的起止页码 */
        var half = Math.floor((maxVisible - 2) / 2);
        var start = Math.max(2, current - half);
        var end = Math.min(total - 1, current + half);

        /* 调整：确保中间区域有足够的页码 */
        if (current - half < 2) {
            end = Math.min(total - 1, maxVisible - 1);
        }
        if (current + half > total - 1) {
            start = Math.max(2, total - maxVisible + 2);
        }

        /* 左侧省略号 */
        if (start > 2) {
            pages.push('...');
        }

        /* 中间页码 */
        for (var j = start; j <= end; j++) {
            pages.push(j);
        }

        /* 右侧省略号 */
        if (end < total - 1) {
            pages.push('...');
        }

        /* 始终显示最后一页 */
        pages.push(total);

        return pages;
    }

    /**
     * 为表格创建分页导航容器
     * 插入到 table 元素的后面
     *
     * @param {HTMLTableElement} table - 表格元素
     * @returns {HTMLElement} 分页导航 div 元素
     */
    function createPaginationEl(table) {
        var div = document.createElement('div');
        div.className = 'boblog-pagination';
        div.style.marginTop = '10px';
        /* 插入到 table 后面 */
        table.parentNode.insertBefore(div, table.nextSibling);
        return div;
    }

    /* ==================================================
     * 初始化逻辑
     * ================================================== */

    /**
     * 存储每个表格的状态
     * key: table 元素的 data-table-id
     * value: state 对象
     */
    var tableStates = {};
    var tableIdCounter = 0;

    /**
     * 获取或创建表格的状态对象
     * @param {HTMLTableElement} table - 表格元素
     * @returns {object|null} 状态对象，非分页表格返回 null
     */
    function getTableState(table) {
        var id = table.dataset.tableId;
        if (id && tableStates[id]) return tableStates[id];
        return null;
    }

    /**
     * 记录表格行的原始顺序（用于恢复初始排序）
     * @param {HTMLTableElement} table - 表格元素
     */
    function saveOriginalOrder(table) {
        if (table.dataset.orderSaved) return;
        table.dataset.orderSaved = 'true';

        var tbody = table.querySelector('tbody');
        if (!tbody) return;

        var rows = tbody.querySelectorAll('tr');
        for (var i = 0; i < rows.length; i++) {
            rows[i].dataset.originalIndex = i;
        }
    }

    /**
     * 初始化单个可排序表头的点击事件
     * @param {HTMLElement} th - .boblog-th-sortable 表头单元格
     */
    function initSortableHeader(th) {
        /* 已初始化则跳过，防止重复绑定 */
        if (th.dataset.sortInited) return;
        th.dataset.sortInited = 'true';

        th.addEventListener('click', function () {
            /* 找到所属的 table 元素 */
            var table = th.closest('table');
            if (!table) return;

            /* 找到表头行 */
            var headerRow = th.parentElement;

            /* 获取当前列索引 */
            var colIndex = Array.prototype.indexOf.call(headerRow.cells, th);

            /* 计算下一个排序方向 */
            var currentDir = getCurrentDirection(th);
            var nextDir = getNextDirection(currentDir);

            /* 清除所有列的排序状态 */
            clearSortStates(headerRow);

            /* 获取表格状态（分页模式） */
            var state = getTableState(table);

            if (nextDir !== 'none') {
                /* 设置排序样式 */
                th.classList.add('boblog-sort-' + nextDir);

                if (state) {
                    /* 分页模式：排序 allRows，跳回第 1 页 */
                    state.allRows = sortRows(state.originalRows, colIndex, nextDir);
                    state.currentPage = 1;
                    renderPage(state);
                } else {
                    /* 非分页模式：直接排序 DOM */
                    var tbody = table.querySelector('tbody');
                    if (!tbody) return;
                    var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
                    var sorted = sortRows(rows, colIndex, nextDir);
                    for (var i = 0; i < sorted.length; i++) {
                        tbody.appendChild(sorted[i]);
                    }
                }
            } else {
                /* 恢复原始顺序 */
                if (state) {
                    /* 分页模式：恢复原始行序，跳回第 1 页 */
                    state.allRows = state.originalRows.slice();
                    state.currentPage = 1;
                    renderPage(state);
                } else {
                    /* 非分页模式：按 data-original-index 恢复 */
                    var tbody2 = table.querySelector('tbody');
                    if (tbody2) {
                        var rows2 = Array.prototype.slice.call(tbody2.querySelectorAll('tr'));
                        rows2.sort(function (a, b) {
                            return (parseInt(a.dataset.originalIndex, 10) || 0)
                                 - (parseInt(b.dataset.originalIndex, 10) || 0);
                        });
                        for (var k = 0; k < rows2.length; k++) {
                            tbody2.appendChild(rows2[k]);
                        }
                    }
                }
            }
        });
    }

    /**
     * 初始化单个表格的分页
     * @param {HTMLTableElement} table - 带 data-page-size 属性的表格
     */
    function initTablePagination(table) {
        /* 已初始化则跳过 */
        if (table.dataset.tableId) return;

        var pageSize = parseInt(table.getAttribute('data-page-size'), 10);
        if (!pageSize || pageSize <= 0) return;

        var tbody = table.querySelector('tbody');
        if (!tbody) return;

        /* 分配唯一 ID */
        var id = 'boblog-table-' + (++tableIdCounter);
        table.dataset.tableId = id;

        /* 获取所有行（保留原始顺序的副本） */
        var allRows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
        if (allRows.length === 0) return;

        /* 如果总行数不超过 pageSize，无需分页 */
        if (allRows.length <= pageSize) return;

        /* 创建分页导航 */
        var paginationEl = createPaginationEl(table);

        /* 创建状态对象 */
        var state = {
            table: table,
            allRows: allRows.slice(),           /* 当前排序后的行（初始与原始相同） */
            originalRows: allRows.slice(),       /* 原始行序（永不改变） */
            pageSize: pageSize,
            currentPage: 1,
            paginationEl: paginationEl
        };

        tableStates[id] = state;

        /* 渲染第一页 */
        renderPage(state);
    }

    /**
     * 批量初始化指定范围内的所有可排序表头和分页表格
     * @param {HTMLElement} [root=document] - 扫描范围，默认整个文档
     */
    function init(root) {
        root = root || document;

        /* 找到所有含可排序表头的表格，记录原始行序 */
        var tables = root.querySelectorAll('table');
        for (var i = 0; i < tables.length; i++) {
            if (tables[i].querySelector('.boblog-th-sortable')) {
                saveOriginalOrder(tables[i]);
            }
        }

        /* 为所有可排序表头绑定点击事件 */
        var sortables = root.querySelectorAll('.boblog-th-sortable');
        for (var j = 0; j < sortables.length; j++) {
            initSortableHeader(sortables[j]);
        }

        /* 初始化所有分页表格 */
        var pageTables = root.querySelectorAll('table[data-page-size]');
        for (var k = 0; k < pageTables.length; k++) {
            initTablePagination(pageTables[k]);
        }
    }

    /* DOMContentLoaded 自动初始化 */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { init(); });
    } else {
        init();
    }

    /* ==================================================
     * 手动斑马纹（适用于合并单元格）
     * ================================================== */

    /**
     * 为带 .boblog-table-striped-manual 的表格自动添加斑马纹
     * 只有当行中有第一列（有 rowspan 的行）时才计数
     */
    function initManualStriped() {
        var tables = document.querySelectorAll('.boblog-table-striped-manual');
        for (var i = 0; i < tables.length; i++) {
            var tbody = tables[i].querySelector('tbody');
            if (!tbody) continue;

            var rows = tbody.querySelectorAll('tr');

            /* 获取表格列数 */
            var headerRow = tables[i].querySelector('thead tr');
            var totalCols = headerRow ? headerRow.cells.length : 0;

            var visualRowIndex = 0;

            for (var j = 0; j < rows.length; j++) {
                var row = rows[j];
                var cellCount = row.cells.length;

                /* 如果当前行有第一列（单元格数 = 总列数），这是一个新的视觉行组 */
                if (cellCount === totalCols) {
                    /* 奇数索引（1, 3, 5...）添加灰色 */
                    if (visualRowIndex % 2 === 1) {
                        row.classList.add('boblog-row-even');
                    } else {
                        row.classList.remove('boblog-row-even');
                    }
                    visualRowIndex++;
                } else {
                    /* 当前行被上面的 rowspan 覆盖，应该和上一个有第一列的行颜色一致 */
                    if ((visualRowIndex - 1) % 2 === 1) {
                        row.classList.add('boblog-row-even');
                    } else {
                        row.classList.remove('boblog-row-even');
                    }
                }
            }
        }
    }

    /* 在 init 中调用手动斑马纹初始化 */
    var originalInit = init;
    init = function (root) {
        originalInit(root);
        initManualStriped();
    };

    /* 挂载到全局命名空间，支持手动调用 */
    window.BoblogUI = window.BoblogUI || {};
    window.BoblogUI.table = {
        init: init,
        initManualStriped: initManualStriped
    };
})();
