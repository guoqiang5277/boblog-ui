/**
 * Bo-Blog UI 组件 - 树形选择器 JS (Tree Select)
 *
 * 通用的树形下拉选择器，支持：
 * - 展开/折叠树节点
 * - 搜索过滤（默认拼音匹配，支持首字母/完整拼音/直接文本）
 * - 单选节点
 * - 键盘操作（ESC 关闭面板）
 * - 点击外部区域关闭面板
 *
 * 使用方式：
 *   BoblogTreeSelect.create({
 *       container: document.getElementById('my-tree-select'),
 *       treeData: [{ id, name, slug?, description?, type?, articleCount?, children? }, ...],
 *       selectedId: null,
 *       onSelect: function(id, name, path) { ... },
 *       nodeMatches: function(node, search) { return true/false; }, // 可选：自定义搜索匹配（默认拼音匹配 name+slug）
 *       renderNodeExtra: function(node) { return ''; },            // 可选：自定义节点额外 HTML
 *       isSelectable: function(node) { return true; }              // 可选：节点是否可选（默认叶子节点可选）
 *   });
 *
 * DOM 结构要求（container 内部）：
 *   .boblog-tree-select-display     — 显示框
 *     [data-display-name]           — 显示选中名称的元素
 *     [data-display-path]           — 显示选中路径的元素（可选，showPath=true 时使用）
 *     .boblog-tree-select-arrow     — 下拉箭头
 *   .boblog-tree-select-dropdown    — 下拉面板
 *     .boblog-tree-select-search    — 搜索框区域
 *       input                       — 搜索输入框
 *     .boblog-tree-select-list      — 树节点容器
 *
 * 依赖：
 *   - src/components/tree-select.css
 *   - src/js/pinyin.js（BoblogUI.pinyin，用于默认拼音搜索）
 */
const BoblogTreeSelect = {

    /**
     * 创建树形选择器实例
     * @param {Object} config 配置项
     * @param {HTMLElement} config.container - 最外层 .boblog-tree-select 容器
     * @param {Array} config.treeData - 树形数据 [{ id, name, slug?, description?, type?, articleCount?, children? }]
     * @param {number|null} config.selectedId - 当前选中的节点 ID（null 表示未选）
     * @param {Function} config.onSelect - 选中回调 function(id, name, fullPath)
     * @param {Function} config.nodeMatches - 自定义搜索匹配 function(flatNode, search) → boolean（可选）
     * @param {Function} config.renderNodeExtra - 自定义节点额外 HTML function(flatNode) → string（可选）
     * @param {Function} config.isSelectable - 节点是否可选 function(flatNode) → boolean（可选）
     * @param {string} config.placeholder - 未选中时显示的占位文字（可选，默认 '请选择'）
     * @param {string} config.emptyOptionText - 空选项文字（可选，默认 null 不显示空选项）
     * @param {boolean} config.showPath - 选中后是否在显示框显示完整路径（可选，默认 false）
     * @returns {Object} 实例对象
     */
    create(config) {
        var instance = Object.create(this._proto);
        instance.container = config.container;
        instance.treeData = config.treeData || [];
        instance.selectedId = config.selectedId !== undefined ? config.selectedId : null;
        instance.onSelect = config.onSelect || function() {};
        instance.nodeMatches = config.nodeMatches || null;
        instance.renderNodeExtra = config.renderNodeExtra || null;
        /* 默认：有子节点的为目录，不可选；用户传入则覆盖 */
        instance.isSelectable = config.isSelectable !== undefined
            ? config.isSelectable
            : function(node) { return !node.hasChildren; };
        instance.placeholder = config.placeholder || '请选择';
        instance.emptyOptionText = config.emptyOptionText || null;
        /* 选中后是否在显示框下方显示完整路径 */
        instance.showPath = config.showPath || false;

        /* 内部状态 */
        instance.flatNodes = [];
        instance.expandedNodes = new Set();

        /* 查找 DOM 元素 */
        instance.display = instance.container.querySelector('.boblog-tree-select-display');
        instance.dropdown = instance.container.querySelector('.boblog-tree-select-dropdown');
        instance.searchInput = instance.container.querySelector('.boblog-tree-select-search input');
        instance.listContainer = instance.container.querySelector('.boblog-tree-select-list');

        /* 初始化 */
        instance._flattenTree(instance.treeData, 0, null, []);
        /* 默认展开所有有子节点的节点 */
        instance.flatNodes.forEach(function(node) {
            if (node.hasChildren) {
                instance.expandedNodes.add(node.id);
            }
        });
        instance._renderTree();
        instance._bindEvents();
        instance._setInitialSelection();
        return instance;
    },

    /* ========== 实例原型 ========== */
    _proto: {

        /* ---------- 公共方法 ---------- */

        /** 获取当前选中的节点 ID */
        getSelectedId() {
            return this.selectedId;
        },

        /** 程序化选中节点 */
        selectById(id) {
            var node = this.flatNodes.find(function(n) { return n.id === id; });
            if (node) {
                this._selectNode(id, node.name, node.fullPath);
            }
        },

        /** 刷新树数据 */
        refreshData(treeData) {
            this.treeData = treeData || [];
            this.flatNodes = [];
            this._flattenTree(this.treeData, 0, null, []);
            this._renderTree();
        },

        /* ---------- 扁平化 ---------- */

        _flattenTree(nodes, level, parentId, parentPath) {
            var self = this;
            nodes.forEach(function(node) {
                var currentPath = parentPath.concat([node.name]);
                self.flatNodes.push({
                    id: node.id,
                    name: node.name,
                    slug: node.slug || '',
                    description: node.description || '',
                    type: node.type || 'final',
                    parentId: parentId,
                    level: level,
                    articleCount: node.articleCount || 0,
                    hasChildren: !!(node.children && node.children.length > 0),
                    parentPath: parentPath.length > 0 ? parentPath.join(' > ') : null,
                    fullPath: currentPath.join(' > ')
                });
                if (node.children && node.children.length > 0) {
                    self._flattenTree(node.children, level + 1, node.id, currentPath);
                }
            });
        },

        /* ---------- 渲染 ---------- */

        _renderTree(searchTerm) {
            searchTerm = searchTerm || '';
            var trimmed = searchTerm.trim();
            var html = '';

            /* 空选项 */
            if (this.emptyOptionText) {
                html += '<div class="boblog-tree-select-item' + (this.selectedId === null ? ' selected' : '') + '"'
                    + ' data-id="" data-name="' + this._escapeHtml(this.emptyOptionText) + '" data-path="">'
                    + '<span class="tree-item-toggle invisible"></span>'
                    + '<div class="tree-item-content"><div class="tree-item-header">'
                    + '<span class="boblog-tree-select-name" style="color:var(--boblog-text-gray,#999);">-- ' + this._escapeHtml(this.emptyOptionText) + ' --</span>'
                    + '</div></div></div>';
            }

            if (trimmed) {
                html += this._renderFilteredTree(trimmed);
            } else {
                html += this._renderTreeLevel(this.treeData, 0, []);
            }

            this.listContainer.innerHTML = html;
            this._bindNodeEvents();
        },

        _renderTreeLevel(nodes, level, parentPath) {
            var self = this;
            var html = '';
            nodes.forEach(function(node) {
                var isExpanded = self.expandedNodes.has(node.id);
                var hasChildren = !!(node.children && node.children.length > 0);
                var currentPath = parentPath.concat([node.name]);
                var flatNode = self.flatNodes.find(function(n) { return n.id === node.id; }) || {};

                html += self._renderNodeHtml({
                    id: node.id,
                    name: node.name,
                    slug: flatNode.slug || node.slug || '',
                    description: flatNode.description || node.description || '',
                    type: flatNode.type || node.type || 'final',
                    level: level,
                    articleCount: node.articleCount || 0,
                    hasChildren: hasChildren,
                    fullPath: currentPath.join(' > ')
                }, node.name, !isExpanded && hasChildren);

                if (hasChildren && isExpanded) {
                    html += self._renderTreeLevel(node.children, level + 1, currentPath);
                }
            });
            return html;
        },

        _renderFilteredTree(searchTerm) {
            var self = this;
            var matchedIds = new Set();
            var ancestorIds = new Set();

            /* 找到匹配的节点和祖先 */
            this.flatNodes.forEach(function(node) {
                var matches = self.nodeMatches
                    ? self.nodeMatches(node, searchTerm)
                    : self._defaultNodeMatches(node, searchTerm);
                if (matches) {
                    matchedIds.add(node.id);
                    var currentParentId = node.parentId;
                    while (currentParentId !== null) {
                        ancestorIds.add(currentParentId);
                        var parentNode = self.flatNodes.find(function(n) { return n.id === currentParentId; });
                        currentParentId = parentNode ? parentNode.parentId : null;
                    }
                }
            });

            if (matchedIds.size === 0) {
                return '<div class="no-results-message">没有匹配的结果</div>';
            }

            return this._renderFilteredLevel(this.treeData, 0, [], matchedIds, ancestorIds, searchTerm);
        },

        _renderFilteredLevel(nodes, level, parentPath, matchedIds, ancestorIds, searchTerm) {
            var self = this;
            var html = '';
            nodes.forEach(function(node) {
                var isMatched = matchedIds.has(node.id);
                var isAncestor = ancestorIds.has(node.id);
                if (!isMatched && !isAncestor) return;

                var hasChildren = !!(node.children && node.children.length > 0);
                var currentPath = parentPath.concat([node.name]);
                var flatNode = self.flatNodes.find(function(n) { return n.id === node.id; }) || {};

                var displayName = isMatched
                    ? self._highlightText(node.name, searchTerm)
                    : self._escapeHtml(node.name);

                html += self._renderNodeHtml({
                    id: node.id,
                    name: node.name,
                    slug: flatNode.slug || node.slug || '',
                    description: flatNode.description || node.description || '',
                    type: flatNode.type || node.type || 'final',
                    level: level,
                    articleCount: node.articleCount || 0,
                    hasChildren: hasChildren,
                    fullPath: currentPath.join(' > ')
                }, displayName, false, isMatched);

                if (hasChildren) {
                    html += self._renderFilteredLevel(node.children, level + 1, currentPath, matchedIds, ancestorIds, searchTerm);
                }
            });
            return html;
        },

        _renderNodeHtml(node, displayName, isCollapsed, isMatched) {
            var isSelected = this.selectedId === node.id;
            var selectable = this.isSelectable ? this.isSelectable(node) : true;
            var toggleClass = node.hasChildren ? (isCollapsed ? 'collapsed' : '') : 'invisible';
            var dimClass = (isMatched === false) ? ' text-muted' : '';
            var notSelectableClass = selectable ? '' : ' directory-type';
            var indent = node.level * 16;

            var extraHtml = this.renderNodeExtra ? this.renderNodeExtra(node) : '';

            return '<div class="boblog-tree-select-item' + (isSelected ? ' selected' : '') + notSelectableClass + '"'
                + ' data-id="' + node.id + '"'
                + ' data-name="' + this._escapeHtml(node.name) + '"'
                + ' data-path="' + this._escapeHtml(node.fullPath || node.name) + '"'
                + ' data-type="' + (node.type || 'final') + '"'
                + ' data-level="' + node.level + '"'
                + ' style="padding-left:' + (10 + indent) + 'px;">'
                + '<span class="tree-item-toggle ' + toggleClass + '" data-node-id="' + node.id + '"'
                + (node.hasChildren ? '' : ' style="pointer-events:none;"') + '>&#9660;</span>'
                + '<div class="tree-item-content"><div class="tree-item-header">'
                + '<span class="boblog-tree-select-name' + dimClass + '">' + displayName + '</span>'
                + extraHtml
                + (node.slug ? '<span class="boblog-tree-select-slug">' + this._escapeHtml(node.slug) + '</span>' : '')
                + '<span class="boblog-tree-select-count' + (node.articleCount > 0 ? ' has-articles' : '') + '">' + (node.articleCount || 0) + '</span>'
                + '</div>'
                + (node.description ? '<div class="tree-item-desc">' + this._escapeHtml(node.description) + '</div>' : '')
                + '</div></div>';
        },

        /* ---------- 事件绑定 ---------- */

        _bindEvents() {
            var self = this;

            /* 点击显示框 — 打开/关闭面板 */
            this.display.addEventListener('click', function(e) {
                e.stopPropagation();
                if (self.dropdown.classList.contains('show')) {
                    self._closePanel();
                } else {
                    self._openPanel();
                }
            });

            /* 搜索输入 */
            if (this.searchInput) {
                this.searchInput.addEventListener('input', function() {
                    self._renderTree(self.searchInput.value);
                });
                this.searchInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape') self._closePanel();
                });
            }

            /* 点击外部区域关闭 */
            document.addEventListener('click', function(e) {
                if (!e.target.closest('.boblog-tree-select') || !self.container.contains(e.target)) {
                    self._closePanel();
                }
            });
        },

        _bindNodeEvents() {
            var self = this;
            this.listContainer.querySelectorAll('.boblog-tree-select-item').forEach(function(item) {
                item.addEventListener('click', function(e) {
                    /* 点击展开/折叠按钮 */
                    if (e.target.classList.contains('tree-item-toggle') && !e.target.classList.contains('invisible')) {
                        e.stopPropagation();
                        self._toggleNode(parseInt(e.target.dataset.nodeId));
                        return;
                    }
                    /* 检查是否可选 */
                    var nodeId = item.dataset.id;
                    if (self.isSelectable) {
                        var flatNode = self.flatNodes.find(function(n) { return n.id === parseInt(nodeId); });
                        if (flatNode && !self.isSelectable(flatNode)) return;
                    }
                    var id = nodeId ? parseInt(nodeId) : null;
                    var name = item.dataset.name;
                    var path = item.dataset.path || name;
                    self._selectNode(id, name, path);
                });
            });
        },

        /* ---------- 面板操作 ---------- */

        _openPanel() {
            this.display.classList.add('active');
            this.dropdown.classList.add('show');
            if (this.searchInput) {
                this.searchInput.value = '';
                this._renderTree();
                var input = this.searchInput;
                setTimeout(function() { input.focus(); }, 50);
            }
        },

        _closePanel() {
            this.display.classList.remove('active');
            this.dropdown.classList.remove('show');
        },

        /* ---------- 节点操作 ---------- */

        _toggleNode(nodeId) {
            if (this.expandedNodes.has(nodeId)) {
                this.expandedNodes.delete(nodeId);
            } else {
                this.expandedNodes.add(nodeId);
            }
            var searchValue = this.searchInput ? this.searchInput.value : '';
            this._renderTree(searchValue);
        },

        _selectNode(id, name, path) {
            this.selectedId = id;
            this._closePanel();

            /* 更新显示框文字 */
            var nameEl = this.display.querySelector('[data-display-name]');
            if (nameEl) {
                nameEl.textContent = name || this.placeholder;
            }

            /* 更新路径显示 */
            var pathEl = this.display.querySelector('[data-display-path]');
            if (pathEl) {
                if (this.showPath && id !== null && path && path !== name) {
                    pathEl.textContent = path;
                    pathEl.style.display = '';
                } else {
                    pathEl.textContent = '';
                    pathEl.style.display = 'none';
                }
            }

            /* 更新选中样式 */
            this.listContainer.querySelectorAll('.boblog-tree-select-item').forEach(function(item) {
                item.classList.remove('selected');
                var itemId = item.dataset.id;
                if ((itemId === '' && id === null) || (itemId && parseInt(itemId) === id)) {
                    item.classList.add('selected');
                }
            });

            this.onSelect(id, name, path);
        },

        _setInitialSelection() {
            if (this.selectedId !== null) {
                var node = this.flatNodes.find(function(n) { return n.id === this.selectedId; }.bind(this));
                if (node) {
                    var nameEl = this.display.querySelector('[data-display-name]');
                    if (nameEl) {
                        nameEl.textContent = node.name;
                    }
                    /* 初始化路径显示 */
                    var pathEl = this.display.querySelector('[data-display-path]');
                    if (pathEl && this.showPath && node.parentPath) {
                        pathEl.textContent = node.fullPath;
                        pathEl.style.display = '';
                    }
                }
            }
        },

        /* ---------- 工具方法 ---------- */

        /**
         * 默认搜索匹配：使用拼音模块匹配 name 和 slug
         * 如果 BoblogUI.pinyin 不可用，fallback 为简单 indexOf
         */
        _defaultNodeMatches(node, searchTerm) {
            var pinyin = window.BoblogUI && window.BoblogUI.pinyin;
            if (pinyin) {
                /* 拼音匹配：同时搜索 name 和 slug */
                return pinyin.matches(node.name, searchTerm)
                    || (node.slug && pinyin.matches(node.slug, searchTerm));
            }
            /* fallback：简单子串匹配 */
            var s = searchTerm.toLowerCase();
            return node.name.toLowerCase().indexOf(s) !== -1
                || (node.slug && node.slug.toLowerCase().indexOf(s) !== -1);
        },

        _escapeHtml(text) {
            var div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        },

        /**
         * 高亮匹配文字
         * 直接匹配时高亮匹配部分，拼音匹配时高亮整个文本
         */
        _highlightText(text, search) {
            if (!search || !text) return this._escapeHtml(text);
            var escapedText = this._escapeHtml(text);

            /* 先尝试直接文本匹配高亮 */
            var lowerText = text.toLowerCase();
            var lowerSearch = search.toLowerCase();
            if (lowerText.indexOf(lowerSearch) !== -1) {
                var escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return escapedText.replace(new RegExp('(' + escapedSearch + ')', 'gi'), '<span class="highlight">$1</span>');
            }

            /* 拼音匹配时：高亮整个文本 */
            var pinyin = window.BoblogUI && window.BoblogUI.pinyin;
            if (pinyin && pinyin.matches(text, search)) {
                return '<span class="highlight">' + escapedText + '</span>';
            }

            return escapedText;
        }
    }
};
