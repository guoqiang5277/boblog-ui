/**
 * Bo-Blog UI 组件 - 评分组件 (rating)
 *
 * 功能：
 *   - 自动扫描页面中的 .boblog-rating:not(.readonly):not(.disabled) 容器
 *   - 点击星星时，将该星及之前的星设为 active，之后的取消 active
 *   - 更新 .boblog-rating-text 的文本为 "X.0 分"
 *   - 支持 data-value 属性设置初始值
 *   - 支持 data-max 属性设置最大星数（默认 5）
 *   - 鼠标悬停时预览效果（hover 时临时高亮），移出时恢复
 *   - 防止重复初始化（dataset.ratingInit）
 *
 * HTML 结构约定：
 *   <div class="boblog-rating" data-value="3">
 *       <span class="boblog-rating-star">★</span>
 *       <span class="boblog-rating-star">★</span>
 *       <span class="boblog-rating-star">★</span>
 *       <span class="boblog-rating-star">★</span>
 *       <span class="boblog-rating-star">★</span>
 *       <span class="boblog-rating-text">3.0 分</span>
 *   </div>
 *
 * 公开 API：
 *   BoblogUI.rating.init([container])  — 初始化指定容器（默认 document）内所有评分组件
 *
 * 依赖：
 *   - src/controls/rating.css（评分组件样式）
 */

(function () {
    'use strict';

    /* 确保全局命名空间存在 */
    window.BoblogUI = window.BoblogUI || {};

    /* ============ 核心逻辑 ============ */

    /**
     * 更新评分显示状态
     * @param {HTMLElement} container — .boblog-rating 容器元素
     * @param {number} value — 评分值（1-max）
     */
    function updateRating(container, value) {
        var stars = container.querySelectorAll('.boblog-rating-star');
        var textEl = container.querySelector('.boblog-rating-text');
        var fullStars = Math.floor(value);
        var hasHalf = (value - fullStars) >= 0.5;

        /* 遍历所有星星，设置 active / half 状态 */
        for (var i = 0; i < stars.length; i++) {
            stars[i].classList.remove('active', 'half');
            if (i < fullStars) {
                stars[i].classList.add('active');
            } else if (i === fullStars && hasHalf) {
                stars[i].classList.add('half');
            }
        }

        /* 更新评分文本 */
        if (textEl) {
            textEl.textContent = value.toFixed(1) + ' 分';
        }

        /* 保存当前评分值到 data-value */
        container.setAttribute('data-value', value);
    }

    /**
     * 初始化单个评分组件
     * @param {HTMLElement} container — .boblog-rating 容器元素
     */
    function initOne(container) {
        /* 防止重复初始化 */
        if (container.dataset.ratingInit === 'true') return;
        container.dataset.ratingInit = 'true';

        /* 跳过只读或禁用状态的评分组件 */
        if (container.classList.contains('readonly') || container.classList.contains('disabled')) {
            return;
        }

        var stars = container.querySelectorAll('.boblog-rating-star');
        if (stars.length === 0) return;

        /* 读取 data-value 属性，设置初始值 */
        var initialValue = parseFloat(container.getAttribute('data-value')) || 0;
        if (initialValue > 0) {
            updateRating(container, initialValue);
        }

        /* 保存当前评分值（用于 hover 恢复） */
        var currentValue = initialValue;

        /* 是否允许半星（需要 data-allow-half 属性） */
        var allowHalf = container.hasAttribute('data-allow-half');

        /* 为每个星星添加点击事件 */
        for (var i = 0; i < stars.length; i++) {
            /* 使用立即执行函数保存索引 */
            (function (index) {
                var star = stars[index];

                /* 根据鼠标在星星内的水平位置判断整星/半星 */
                function getValueFromEvent(e) {
                    if (!allowHalf) return index + 1;
                    var rect = star.getBoundingClientRect();
                    var isLeftHalf = (e.clientX - rect.left) < rect.width / 2;
                    return isLeftHalf ? index + 0.5 : index + 1;
                }

                /* 点击事件：设置评分（支持半星） */
                star.addEventListener('click', function (e) {
                    currentValue = getValueFromEvent(e);
                    updateRating(container, currentValue);
                });

                /* 鼠标移动事件：实时预览评分 */
                star.addEventListener('mousemove', function (e) {
                    updateRating(container, getValueFromEvent(e));
                });
            })(i);
        }

        /* 鼠标移出容器时，恢复到当前评分值 */
        container.addEventListener('mouseleave', function () {
            updateRating(container, currentValue);
        });
    }

    /**
     * 初始化指定容器内所有评分组件
     * @param {HTMLElement} [root=document] — 搜索范围
     */
    function init(root) {
        root = root || document;
        var containers = root.querySelectorAll('.boblog-rating:not(.readonly):not(.disabled)');
        for (var i = 0; i < containers.length; i++) {
            initOne(containers[i]);
        }
    }

    /* ============ 公开 API ============ */
    BoblogUI.rating = {
        init: init
    };

    /* ============ 自动初始化 ============ */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { init(); });
    } else {
        init();
    }

})();
