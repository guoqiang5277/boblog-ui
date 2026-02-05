/**
 * Bo-Blog UI - Image / 图片组件（幻灯片交互）
 * 为 .boblog-slideshow 提供交互控制：
 * - 指示点点击切换幻灯片并更新 active 状态
 * - 左右箭头循环切换（末尾→第一张，第一张→末尾）
 * - 滚动/滑动时自动检测当前幻灯片并更新指示点
 */
(function () {
    'use strict';

    /* 初始化全局命名空间 */
    window.BoblogUI = window.BoblogUI || {};

    /**
     * 初始化指定容器内的所有幻灯片组件
     * @param {HTMLElement} [container] - 搜索范围，默认 document
     */
    function init(container) {
        var root = container || document;
        var slideshows = root.querySelectorAll('.boblog-slideshow');

        slideshows.forEach(function (slideshow) {
            /* 防止重复初始化 */
            if (slideshow.getAttribute('data-slideshow-init')) return;
            slideshow.setAttribute('data-slideshow-init', '1');

            var track = slideshow.querySelector('.boblog-slideshow-track');
            if (!track) return;

            var slides = track.querySelectorAll('.boblog-slideshow-slide');
            if (slides.length === 0) return;

            var dots = slideshow.querySelectorAll('.boblog-slideshow-dot');
            var prevBtn = slideshow.querySelector('.boblog-slideshow-prev');
            var nextBtn = slideshow.querySelector('.boblog-slideshow-next');

            /* 当前幻灯片索引 */
            var currentIndex = 0;

            /**
             * 滚动到指定索引的幻灯片
             * @param {number} index - 目标索引
             */
            function goTo(index) {
                /* 循环处理：超出范围时回绕 */
                if (index < 0) {
                    index = slides.length - 1;
                } else if (index >= slides.length) {
                    index = 0;
                }
                currentIndex = index;

                /* 滚动轨道到目标幻灯片位置 */
                var targetSlide = slides[index];
                track.scrollTo({
                    left: targetSlide.offsetLeft - track.offsetLeft,
                    behavior: 'smooth'
                });

                /* 更新指示点 active 状态 */
                updateDots(index);
            }

            /**
             * 更新指示点的 active 类
             * @param {number} index - 当前激活的索引
             */
            function updateDots(index) {
                dots.forEach(function (dot, i) {
                    if (i === index) {
                        dot.classList.add('active');
                    } else {
                        dot.classList.remove('active');
                    }
                });
            }

            /**
             * 根据当前滚动位置检测哪张幻灯片可见
             * 返回最接近轨道左边缘的幻灯片索引
             */
            function detectCurrentSlide() {
                var scrollLeft = track.scrollLeft;
                var trackWidth = track.offsetWidth;
                var best = 0;
                var bestDist = Infinity;

                slides.forEach(function (slide, i) {
                    var dist = Math.abs(slide.offsetLeft - track.offsetLeft - scrollLeft);
                    if (dist < bestDist) {
                        bestDist = dist;
                        best = i;
                    }
                });

                return best;
            }

            /* 指示点点击事件：跳转到对应幻灯片 */
            dots.forEach(function (dot, i) {
                dot.addEventListener('click', function (e) {
                    e.preventDefault();
                    goTo(i);
                });
            });

            /* 左箭头点击：上一张（循环） */
            if (prevBtn) {
                prevBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    goTo(currentIndex - 1);
                });
            }

            /* 右箭头点击：下一张（循环） */
            if (nextBtn) {
                nextBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    goTo(currentIndex + 1);
                });
            }

            /* 滚动事件：用户手动拖拽/滑动后更新指示点状态
               使用 scroll 结束检测（debounce 150ms），避免频繁触发 */
            var scrollTimer = null;
            track.addEventListener('scroll', function () {
                if (scrollTimer) clearTimeout(scrollTimer);
                scrollTimer = setTimeout(function () {
                    var detected = detectCurrentSlide();
                    if (detected !== currentIndex) {
                        currentIndex = detected;
                        updateDots(currentIndex);
                    }
                }, 150);
            });
        });
    }

    /* 挂载到全局命名空间，支持手动调用 */
    BoblogUI.image = {
        init: init
    };

    /* 页面加载后自动初始化 */
    document.addEventListener('DOMContentLoaded', function () {
        init();
    });
})();
