/**
 * Bo-Blog UI 组件 - 标签输入器 JS (Tag Input)
 *
 * 通用的标签输入组件，支持：
 * - 输入标签名，回车或逗号确认添加
 * - 下拉建议列表，支持键盘上下导航
 * - 点击 × 删除已选标签
 * - Backspace 删除最后一个标签
 * - ESC 关闭建议面板
 * - 点击外部区域关闭建议面板
 *
 * 使用方式：
 *   BoblogTagInput.create({
 *       container: document.getElementById('my-tag-input'),
 *       availableTags: [{ id: 1, name: '标签1', categoryName: '分类', articleCount: 5 }, ...],
 *       selectedTags: [{ id: 1, name: '标签1' }, ...],
 *       onTagsChange: function(tags) { ... }
 *   });
 *
 * DOM 结构要求（container 内部）：
 *   .boblog-tag-input-wrapper    — 输入区域
 *     .boblog-tag-input-tags     — 已选标签容器（id 或 class 均可）
 *     .boblog-tag-input-field    — 文本输入框
 *   .boblog-tag-input-suggestions — 下拉建议面板
 *
 * 依赖：
 *   - src/components/tag-input.css
 */
const BoblogTagInput = {

    /**
     * 创建标签输入器实例
     * @param {Object} config 配置项
     * @param {HTMLElement} config.container - 最外层 .boblog-tag-input 容器
     * @param {Array} config.availableTags - 可用标签列表 [{ id, name, categoryName?, articleCount? }]
     * @param {Array} config.selectedTags - 已选标签列表 [{ id?, name }]（可选）
     * @param {Function} config.onTagsChange - 标签变化回调 function(selectedTags)
     * @param {Function} config.renderOption - 自定义渲染建议项 function(tag, inputValue) → HTML string（可选）
     * @returns {Object} 实例对象，包含 addTag / removeTag / getSelectedTags 等方法
     */
    create(config) {
        const instance = Object.create(this._proto);
        instance.container = config.container;
        instance.availableTags = config.availableTags || [];
        instance.selectedTags = (config.selectedTags || []).slice();
        instance.onTagsChange = config.onTagsChange || function() {};
        instance.renderOption = config.renderOption || null;

        /* 查找 DOM 元素 */
        instance.wrapper = instance.container.querySelector('.boblog-tag-input-wrapper');
        instance.tagsDisplay = instance.container.querySelector('.boblog-tag-input-tags');
        instance.input = instance.container.querySelector('.boblog-tag-input-field');
        instance.suggestions = instance.container.querySelector('.boblog-tag-input-suggestions');

        instance._bindEvents();
        instance._updateDisplay();
        return instance;
    },

    /* ========== 实例原型 ========== */
    _proto: {

        /* ---------- 公共方法 ---------- */

        /** 添加标签 */
        addTag(name, id) {
            name = (name || '').trim();
            if (!name) return;
            /* 去重 */
            if (this.selectedTags.some(t => t.name === name)) return;
            this.selectedTags.push({ id: id || null, name: name });
            this._updateDisplay();
            this.onTagsChange(this.selectedTags);
            this.input.value = '';
            this.input.focus();
        },

        /** 删除标签 */
        removeTag(name) {
            this.selectedTags = this.selectedTags.filter(t => t.name !== name);
            this._updateDisplay();
            this.onTagsChange(this.selectedTags);
        },

        /** 获取当前已选标签 */
        getSelectedTags() {
            return this.selectedTags.slice();
        },

        /* ---------- 事件绑定 ---------- */

        _bindEvents() {
            const self = this;

            /* 点击 wrapper 聚焦输入框 */
            this.wrapper.addEventListener('click', function(e) {
                if (e.target === self.wrapper || e.target === self.tagsDisplay) {
                    self.input.focus();
                }
            });

            /* 输入事件 — 实时搜索建议 */
            this.input.addEventListener('input', function() {
                self._handleInput(self.input.value);
            });

            /* 键盘事件 */
            this.input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    var activeItem = self.suggestions.querySelector('.boblog-tag-input-option.active');
                    if (activeItem) {
                        activeItem.click();
                    } else if (self.input.value.trim()) {
                        self.addTag(self.input.value.trim());
                        self._hideSuggestions();
                    }
                } else if (e.key === ',' || e.key === '\uff0c') {
                    /* 英文逗号或中文逗号 */
                    e.preventDefault();
                    var tagName = self.input.value.replace(/[,\uff0c]$/, '').trim();
                    if (tagName) {
                        self.addTag(tagName);
                        self._hideSuggestions();
                    }
                } else if (e.key === 'Escape') {
                    self._hideSuggestions();
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    self._navigateSuggestions(e.key === 'ArrowDown' ? 1 : -1);
                } else if (e.key === 'Backspace' && !self.input.value && self.selectedTags.length > 0) {
                    /* 输入框为空时 Backspace 删除最后一个标签 */
                    var lastTag = self.selectedTags[self.selectedTags.length - 1];
                    self.removeTag(lastTag.name);
                }
            });

            /* 点击外部区域关闭建议面板 */
            document.addEventListener('click', function(e) {
                if (!e.target.closest('.boblog-tag-input') || !self.container.contains(e.target)) {
                    self._hideSuggestions();
                }
            });
        },

        /* ---------- 搜索与建议 ---------- */

        _handleInput(value) {
            if (value.length > 0) {
                var self = this;
                var filtered = this.availableTags.filter(function(tag) {
                    return tag.name.toLowerCase().indexOf(value.toLowerCase()) !== -1 &&
                           !self.selectedTags.some(function(s) { return s.name === tag.name; });
                });
                this._showSuggestions(filtered, value);
            } else {
                this._hideSuggestions();
            }
        },

        _showSuggestions(tags, inputValue) {
            var self = this;
            var html = '';

            if (tags.length > 0) {
                tags.forEach(function(tag) {
                    if (self.renderOption) {
                        html += self.renderOption(tag, inputValue);
                    } else {
                        var escapedName = self._escapeHtml(tag.name);
                        var categoryHtml = tag.categoryName
                            ? '<span class="boblog-badge boblog-bg-light boblog-text-gray" style="margin-right:6px; font-size:11px;">' + self._escapeHtml(tag.categoryName) + '</span>'
                            : '';
                        var countHtml = tag.articleCount !== undefined
                            ? '<span class="boblog-tag-input-count">' + tag.articleCount + ' 篇文章</span>'
                            : '';
                        html += '<div class="boblog-tag-input-option" data-tag-id="' + (tag.id || '') + '" data-tag-name="' + escapedName + '">'
                            + '<span class="boblog-tag-input-name">' + categoryHtml + escapedName + '</span>'
                            + countHtml
                            + '</div>';
                    }
                });
            }

            /* 如果输入不完全匹配任何现有标签，提供创建选项 */
            var exactMatch = tags.some(function(tag) {
                return tag.name.toLowerCase() === inputValue.toLowerCase();
            });
            if (!exactMatch) {
                html += '<div class="boblog-tag-input-option" data-tag-id="" data-tag-name="' + self._escapeHtml(inputValue) + '">'
                    + '<span class="boblog-tag-input-new">+ 创建新标签: "' + self._escapeHtml(inputValue) + '"</span>'
                    + '</div>';
            }

            this.suggestions.innerHTML = html;
            this.suggestions.style.display = 'block';

            /* 绑定建议项点击事件 */
            var options = this.suggestions.querySelectorAll('.boblog-tag-input-option');
            options.forEach(function(option) {
                option.addEventListener('click', function() {
                    var name = option.dataset.tagName;
                    var id = option.dataset.tagId ? parseInt(option.dataset.tagId) : null;
                    self.addTag(name, id);
                    self._hideSuggestions();
                });
            });
        },

        _hideSuggestions() {
            this.suggestions.style.display = 'none';
        },

        _navigateSuggestions(direction) {
            var items = this.suggestions.querySelectorAll('.boblog-tag-input-option');
            if (items.length === 0) return;

            var activeIndex = -1;
            items.forEach(function(item, index) {
                if (item.classList.contains('active')) {
                    activeIndex = index;
                }
                item.classList.remove('active');
            });

            activeIndex += direction;
            if (activeIndex >= items.length) activeIndex = 0;
            if (activeIndex < 0) activeIndex = items.length - 1;

            items[activeIndex].classList.add('active');
            items[activeIndex].scrollIntoView({ block: 'nearest' });
        },

        /* ---------- 显示更新 ---------- */

        _updateDisplay() {
            var self = this;
            this.tagsDisplay.innerHTML = this.selectedTags.map(function(tag) {
                var escapedName = self._escapeHtml(tag.name);
                return '<span class="boblog-badge primary">'
                    + escapedName
                    + ' <span class="boblog-tag-input-remove" data-tag-name="' + escapedName + '">&times;</span>'
                    + '</span>';
            }).join('');

            /* 绑定删除按钮事件 */
            this.tagsDisplay.querySelectorAll('.boblog-tag-input-remove').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    self.removeTag(btn.dataset.tagName);
                });
            });
        },

        /* ---------- 工具方法 ---------- */

        _escapeHtml(text) {
            var div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
    }
};
