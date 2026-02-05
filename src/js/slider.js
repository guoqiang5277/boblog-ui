/**
 * Bo-Blog UI - Slider / 滑块组件（竖向滑块交互）
 * 为 .boblog-slider-vertical 提供拖拽交互控制：
 * - 鼠标拖拽手柄改变值
 * - 点击轨道跳转到对应位置
 * - 触屏滑动支持
 * - 支持 min / max / step / value 属性
 * - 拖拽过程中实时更新数值标签
 *
 * HTML 结构约定：
 *   <div class="boblog-slider-vertical" data-min="0" data-max="100" data-value="40" data-step="1">
 *       <div class="boblog-slider-vertical-track">
 *           <div class="boblog-slider-vertical-thumb"></div>
 *       </div>
 *       <span class="boblog-slider-value">40</span>
 *   </div>
 *
 * 公开 API：
 *   BoblogUI.slider.init([container])  — 初始化指定容器（默认 document）内所有竖向滑块
 *
 * 依赖：
 *   - src/components/slider.css（滑块样式）
 */
(function () {
    'use strict';

    /* 确保全局命名空间存在 */
    window.BoblogUI = window.BoblogUI || {};

    /**
     * 初始化单个竖向滑块
     * @param {HTMLElement} slider — .boblog-slider-vertical 容器
     */
    function initOne(slider) {
        /* 防止重复初始化 */
        if (slider.getAttribute('data-slider-init')) return;
        slider.setAttribute('data-slider-init', '1');

        var track = slider.querySelector('.boblog-slider-vertical-track');
        var thumb = slider.querySelector('.boblog-slider-vertical-thumb');
        if (!track || !thumb) return;

        var valueLabel = slider.querySelector('.boblog-slider-value');

        /* 读取配置属性 */
        var min = parseFloat(slider.getAttribute('data-min')) || 0;
        var max = parseFloat(slider.getAttribute('data-max')) || 100;
        var step = parseFloat(slider.getAttribute('data-step')) || 1;
        var value = parseFloat(slider.getAttribute('data-value')) || min;

        /* 将值限制在 min ~ max 范围内 */
        function clamp(v) {
            v = Math.round(v / step) * step;
            if (v < min) v = min;
            if (v > max) v = max;
            return v;
        }

        /* 根据当前值更新手柄位置和数值标签 */
        function updateUI(v) {
            var percent = (v - min) / (max - min) * 100;
            /* bottom 百分比：值越大手柄越靠上 */
            thumb.style.bottom = percent + '%';
            if (valueLabel) valueLabel.textContent = v;
            slider.setAttribute('data-value', v);
        }

        /* 根据鼠标/触摸的 Y 坐标计算值 */
        function getValueFromY(clientY) {
            var rect = track.getBoundingClientRect();
            /* 轨道底部 = min，轨道顶部 = max */
            var ratio = (rect.bottom - clientY) / rect.height;
            if (ratio < 0) ratio = 0;
            if (ratio > 1) ratio = 1;
            return clamp(min + ratio * (max - min));
        }

        /* 初始渲染 */
        value = clamp(value);
        updateUI(value);

        /* ---- 鼠标拖拽 ---- */
        var dragging = false;

        thumb.addEventListener('mousedown', function (e) {
            e.preventDefault();
            dragging = true;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        function onMouseMove(e) {
            if (!dragging) return;
            value = getValueFromY(e.clientY);
            updateUI(value);
        }

        function onMouseUp() {
            dragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        /* ---- 点击轨道跳转 ---- */
        track.addEventListener('click', function (e) {
            if (e.target === thumb) return;
            value = getValueFromY(e.clientY);
            updateUI(value);
        });

        /* ---- 触屏拖拽 ---- */
        thumb.addEventListener('touchstart', function (e) {
            e.preventDefault();
            dragging = true;
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        });

        function onTouchMove(e) {
            if (!dragging) return;
            e.preventDefault();
            var touch = e.touches[0];
            value = getValueFromY(touch.clientY);
            updateUI(value);
        }

        function onTouchEnd() {
            dragging = false;
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        }
    }

    /**
     * 初始化指定容器内所有竖向滑块
     * @param {HTMLElement} [container] - 搜索范围，默认 document
     */
    function init(container) {
        var root = container || document;
        var sliders = root.querySelectorAll('.boblog-slider-vertical');
        for (var i = 0; i < sliders.length; i++) {
            initOne(sliders[i]);
        }
    }

    /* ============ 公开 API ============ */
    BoblogUI.slider = {
        init: init
    };

    /* ============ 自动初始化 ============ */
    document.addEventListener('DOMContentLoaded', function () {
        init();
    });
})();
