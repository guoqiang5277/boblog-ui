/**
 * Bo-Blog UI 组件 - 自定义日期选择器 (date-picker)
 *
 * 功能：
 *   - 自动扫描页面中的 .boblog-date-picker 容器
 *   - 将原生日期/时间 input 转换为自定义日历/选择器面板
 *   - 支持五种类型：date、datetime-local、month、week、time
 *   - 完全跨浏览器一致（不依赖原生 picker）
 *   - 通过 data-format 属性自定义显示格式
 *   - 通过 data-placeholder 属性自定义占位文本
 *
 * HTML 结构约定（转换前）：
 *   <div class="boblog-date-picker" data-format="yyyy-MM-dd">
 *       <input type="date" value="2006-08-15">
 *   </div>
 *
 * 转换后生成：
 *   <div class="boblog-date-picker boblog-date-picker-custom boblog-date-picker--date">
 *       <input type="date" style="display:none" value="2006-08-15">
 *       <div class="boblog-date-picker-display" tabindex="0">2006-08-15</div>
 *       <div class="boblog-date-picker-panel">...日历面板...</div>
 *   </div>
 *
 * 各类型面板：
 *   date           — 日历网格（7×6），顶部年月切换
 *   datetime-local — 日历网格 + 底部时分选择 + 确定按钮
 *   month          — 月份网格（4×3），顶部年份切换
 *   week           — 日历网格 + 左侧周号列，整行选择
 *   time           — 时分上下按钮 + 确定按钮
 *
 * 各类型默认格式：
 *   date           — yyyy-MM-dd        （如 2006-08-15）
 *   datetime-local — yyyy-MM-dd HH:mm  （如 2006-08-15 14:30）
 *   month          — yyyy-MM           （如 2006-08）
 *   week           — YYYY-Www          （如 2006-W33）
 *   time           — HH:mm            （如 14:30）
 *
 * 公开 API：
 *   BoblogUI.datePicker.init([container])  — 初始化指定容器（默认 document）内所有日期选择器
 *
 * 依赖：
 *   - src/controls/date-picker.css（基础样式）
 */
(function () {
    'use strict';

    /* 确保全局命名空间 */
    window.BoblogUI = window.BoblogUI || {};

    /* ============================================================ */
    /* 默认配置                                                       */
    /* ============================================================ */
    var DEFAULT_FORMATS = {
        'date':           'yyyy-MM-dd',
        'datetime-local': 'yyyy-MM-dd HH:mm',
        'month':          'yyyy-MM',
        'week':           'YYYY-Www',
        'time':           'HH:mm'
    };

    var DEFAULT_PLACEHOLDERS = {
        'date':           '选择日期...',
        'datetime-local': '选择日期时间...',
        'month':          '选择月份...',
        'week':           '选择周...',
        'time':           '选择时间...'
    };

    var WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

    /* ============================================================ */
    /* 工具函数                                                       */
    /* ============================================================ */

    /**
     * 数字补零
     * @param {number} n — 数字
     * @returns {string} 补零后的两位字符串
     */
    function padZero(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    /**
     * 获取指定年月的天数
     * @param {number} year — 年份
     * @param {number} month — 月份（1-12）
     * @returns {number} 天数
     */
    function getDaysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }

    /**
     * 获取指定年月第一天是星期几
     * @param {number} year — 年份
     * @param {number} month — 月份（1-12）
     * @returns {number} 0=周日, 1=周一, ..., 6=周六
     */
    function getFirstDayOfWeek(year, month) {
        return new Date(year, month - 1, 1).getDay();
    }

    /**
     * 构建日历网格（42天 = 6行×7列）
     * 包含上月尾部 + 当月全部 + 下月头部
     * @param {number} year — 年份
     * @param {number} month — 月份（1-12）
     * @returns {Array<{year, month, day, isCurrentMonth}>} 42 个日期对象
     */
    function buildCalendarGrid(year, month) {
        var grid = [];
        var firstDay = getFirstDayOfWeek(year, month);
        var daysInMonth = getDaysInMonth(year, month);
        var daysInPrevMonth = getDaysInMonth(year, month - 1);

        var day = 1;
        var nextMonthDay = 1;

        for (var i = 0; i < 42; i++) {
            if (i < firstDay) {
                grid.push({
                    year: month === 1 ? year - 1 : year,
                    month: month === 1 ? 12 : month - 1,
                    day: daysInPrevMonth - firstDay + i + 1,
                    isCurrentMonth: false
                });
            } else if (day <= daysInMonth) {
                grid.push({
                    year: year,
                    month: month,
                    day: day,
                    isCurrentMonth: true
                });
                day++;
            } else {
                grid.push({
                    year: month === 12 ? year + 1 : year,
                    month: month === 12 ? 1 : month + 1,
                    day: nextMonthDay,
                    isCurrentMonth: false
                });
                nextMonthDay++;
            }
        }

        return grid;
    }

    /**
     * 计算周号（1月1日所在周为第1周，每7天一周）
     * @param {number} year — 年份
     * @param {number} month — 月份（1-12）
     * @param {number} day — 日期
     * @returns {number} 周号（1-54）
     */
    function getWeekNumber(year, month, day) {
        var date = new Date(year, month - 1, day);
        var firstDayOfYear = new Date(year, 0, 1);
        var dayOfYear = Math.floor((date - firstDayOfYear) / 86400000) + 1;
        /* 1月1日是一周中的第几天（周日=0 → 偏移0，周一=1 → 偏移1 ...） */
        var firstDayOffset = firstDayOfYear.getDay();
        return Math.ceil((dayOfYear + firstDayOffset) / 7);
    }

    /**
     * 根据类型和格式字符串，将 input 原生值格式化为显示文本
     * @param {string} type — input 类型（date/datetime-local/month/week/time）
     * @param {string} val — input 的原生值
     * @param {string} fmt — 目标格式字符串
     * @returns {string} 格式化后的显示文本
     */
    function formatValue(type, val, fmt) {
        if (!val) return '';

        if (type === 'date') {
            var parts = val.split('-');
            if (parts.length !== 3) return val;
            var y = parts[0], m = parts[1], d = parts[2];
            return fmt.replace('yyyy', y).replace('MM', m).replace('dd', d);
        }

        if (type === 'datetime-local') {
            var dtParts = val.split('T');
            if (dtParts.length !== 2) return val;
            var datePart = dtParts[0];
            var timePart = dtParts[1];
            var dp = datePart.split('-');
            var tp = timePart.split(':');
            if (dp.length !== 3 || tp.length < 2) return val;
            return fmt.replace('yyyy', dp[0])
                      .replace('MM', dp[1])
                      .replace('dd', dp[2])
                      .replace('HH', tp[0])
                      .replace('mm', tp[1]);
        }

        if (type === 'month') {
            var mParts = val.split('-');
            if (mParts.length !== 2) return val;
            return fmt.replace('yyyy', mParts[0]).replace('MM', mParts[1]);
        }

        if (type === 'week') {
            var wParts = val.split('-W');
            if (wParts.length !== 2) return val;
            return fmt.replace('YYYY', wParts[0]).replace('Www', 'W' + wParts[1]);
        }

        if (type === 'time') {
            var tParts = val.split(':');
            if (tParts.length < 2) return val;
            return fmt.replace('HH', tParts[0]).replace('mm', tParts[1]);
        }

        return val;
    }

    /**
     * 关闭所有已打开的日期选择器面板
     * @param {HTMLElement} [except] — 排除不关闭的容器
     */
    function closeAll(except) {
        var pickers = document.querySelectorAll('.boblog-date-picker-custom');
        for (var i = 0; i < pickers.length; i++) {
            if (pickers[i] !== except) {
                pickers[i].classList.remove('open');
            }
        }
    }

    /* ============================================================ */
    /* 通用辅助 - 填充日期格子内容（农历/节气多行）                       */
    /* ============================================================ */

    /**
     * 根据 showLunar / showJieqi / jieqiMode 开关，填充日期格子的内容
     *
     * 模式说明：
     *   - showLunar=false, showJieqi=false → 单行纯文本（原始模式）
     *   - showLunar=true → 两行（阳历 + 农历），格子增高
     *   - showJieqi=true, jieqiMode='true' → 节气作为第三行文字（格子增高）
     *   - showJieqi=true, jieqiMode='bg' → 节气作为背景色标记（格子不增高）
     *
     * @param {HTMLElement} dayCell — 日期格子元素（button 或 span）
     * @param {{year:number, month:number, day:number}} cell — 日期对象
     * @param {boolean} showLunar — 是否显示农历
     * @param {boolean} showJieqi — 是否显示节气
     * @param {string} jieqiMode — 节气模式：'true'=文字行，'bg'=背景色
     */
    function buildDayCellContent(dayCell, cell, showLunar, showJieqi, jieqiMode) {
        /* 获取农历和节气数据（依赖 BoblogUI.lunar 模块） */
        var lunarModule = window.BoblogUI && window.BoblogUI.lunar;

        /* 节气背景模式：不增加行高，仅给节气日加背景色 class */
        var isBgMode = showJieqi && jieqiMode === 'bg';
        /* 节气文字行模式 */
        var isTextMode = showJieqi && jieqiMode === 'true';

        /* 先检测是否为节气日（bg 模式和 text 模式都需要） */
        var jieqiName = null;
        if (showJieqi && lunarModule && lunarModule.getJieqi) {
            jieqiName = lunarModule.getJieqi(cell.year, cell.month, cell.day);
        }

        /* 没有开启农历，且节气仅为 bg 模式或完全关闭 → 单行 */
        if (!showLunar && !isTextMode) {
            if (isBgMode && jieqiName) {
                /* bg 模式：先插入水印层（absolute 定位），再插入日期文本层 */
                dayCell.classList.add('boblog-date-picker-day--jieqi-bg');
                var bgSpan = document.createElement('span');
                bgSpan.className = 'boblog-date-picker-day-jieqi-bg';
                bgSpan.textContent = jieqiName;
                dayCell.appendChild(bgSpan);
                var textSpan = document.createElement('span');
                textSpan.className = 'boblog-date-picker-day-solar boblog-date-picker-day-solar--over';
                textSpan.textContent = cell.day;
                dayCell.appendChild(textSpan);
            } else {
                /* 纯模式：直接文本 */
                dayCell.textContent = cell.day;
            }
            return;
        }

        /* 开启了农历或节气文字行 → 多行 span 结构 */
        dayCell.innerHTML = '';

        /* bg 模式 + 农历/节气文字：先插入水印层（absolute 定位，在最底层） */
        if (isBgMode && jieqiName) {
            dayCell.classList.add('boblog-date-picker-day--jieqi-bg');
            var bgSpan2 = document.createElement('span');
            bgSpan2.className = 'boblog-date-picker-day-jieqi-bg';
            bgSpan2.textContent = jieqiName;
            dayCell.appendChild(bgSpan2);
        }

        /* 第一行：阳历日期 */
        var solarSpan = document.createElement('span');
        solarSpan.className = 'boblog-date-picker-day-solar';
        solarSpan.textContent = cell.day;
        dayCell.appendChild(solarSpan);

        /* 第二行：农历日名（如"初六"、"十五"） */
        if (showLunar && lunarModule && lunarModule.getLunar) {
            var lunarInfo = lunarModule.getLunar(cell.year, cell.month, cell.day);
            if (lunarInfo && lunarInfo.lunarDayText) {
                var lunarSpan = document.createElement('span');
                lunarSpan.className = 'boblog-date-picker-day-lunar';
                lunarSpan.textContent = lunarInfo.lunarDayText;
                dayCell.appendChild(lunarSpan);
                dayCell.classList.add('boblog-date-picker-day--lunar');
            }
        }

        /* 第三行：节气名文字行（仅 jieqiMode='true' 时） */
        if (isTextMode && jieqiName) {
            var jieqiSpan = document.createElement('span');
            jieqiSpan.className = 'boblog-date-picker-day-jieqi';
            jieqiSpan.textContent = jieqiName;
            dayCell.appendChild(jieqiSpan);
            dayCell.classList.add('boblog-date-picker-day--jieqi');
        }
    }

    /* ============================================================ */
    /* 渲染函数 - date 类型（日历网格面板）                              */
    /* ============================================================ */

    /**
     * 渲染日期选择面板
     * 面板结构：头部（年月切换按钮）→ 星期行 → 日期网格（6行×7列）
     * @param {HTMLElement} panel — 面板容器
     * @param {HTMLElement} wrapper — .boblog-date-picker 容器
     * @param {HTMLInputElement} input — 隐藏的原生 input
     * @param {string} format — 显示格式
     */
    function renderDatePanel(panel, wrapper, input, format, showLunar, showJieqi, jieqiMode) {
        var currentValue = input.value;
        var now = new Date();
        var todayYear = now.getFullYear();
        var todayMonth = now.getMonth() + 1;
        var todayDay = now.getDate();
        var viewYear = todayYear;
        var viewMonth = todayMonth;
        var selectedYear, selectedMonth, selectedDay;

        if (currentValue) {
            var parts = currentValue.split('-');
            if (parts.length === 3) {
                selectedYear = parseInt(parts[0], 10);
                selectedMonth = parseInt(parts[1], 10);
                selectedDay = parseInt(parts[2], 10);
                viewYear = selectedYear;
                viewMonth = selectedMonth;
            }
        }

        function render() {
            panel.innerHTML = '';

            var header = document.createElement('div');
            header.className = 'boblog-date-picker-header';

            var prevYear = document.createElement('button');
            prevYear.type = 'button';
            prevYear.className = 'boblog-date-picker-nav';
            prevYear.textContent = '◀◀';
            prevYear.onclick = function(e) {
                e.stopPropagation();
                viewYear--;
                render();
            };

            var prevMonth = document.createElement('button');
            prevMonth.type = 'button';
            prevMonth.className = 'boblog-date-picker-nav';
            prevMonth.textContent = '◀';
            prevMonth.onclick = function(e) {
                e.stopPropagation();
                viewMonth--;
                if (viewMonth < 1) {
                    viewMonth = 12;
                    viewYear--;
                }
                render();
            };

            var title = document.createElement('span');
            title.className = 'boblog-date-picker-title';
            title.textContent = viewYear + '年' + viewMonth + '月';

            var nextMonth = document.createElement('button');
            nextMonth.type = 'button';
            nextMonth.className = 'boblog-date-picker-nav';
            nextMonth.textContent = '▶';
            nextMonth.onclick = function(e) {
                e.stopPropagation();
                viewMonth++;
                if (viewMonth > 12) {
                    viewMonth = 1;
                    viewYear++;
                }
                render();
            };

            var nextYear = document.createElement('button');
            nextYear.type = 'button';
            nextYear.className = 'boblog-date-picker-nav';
            nextYear.textContent = '▶▶';
            nextYear.onclick = function(e) {
                e.stopPropagation();
                viewYear++;
                render();
            };

            /* "今天"按钮：跳回当前月份并选中今天 */
            var todayBtn = document.createElement('button');
            todayBtn.type = 'button';
            todayBtn.className = 'boblog-date-picker-today-btn';
            todayBtn.textContent = '今天';
            todayBtn.onclick = function(e) {
                e.stopPropagation();
                viewYear = todayYear;
                viewMonth = todayMonth;
                selectedYear = todayYear;
                selectedMonth = todayMonth;
                selectedDay = todayDay;
                render();
            };

            header.appendChild(prevYear);
            header.appendChild(prevMonth);
            header.appendChild(title);
            header.appendChild(todayBtn);
            header.appendChild(nextMonth);
            header.appendChild(nextYear);
            panel.appendChild(header);

            var weekdaysRow = document.createElement('div');
            weekdaysRow.className = 'boblog-date-picker-weekdays';
            for (var i = 0; i < WEEKDAYS.length; i++) {
                var wd = document.createElement('span');
                wd.textContent = WEEKDAYS[i];
                weekdaysRow.appendChild(wd);
            }
            panel.appendChild(weekdaysRow);

            var grid = buildCalendarGrid(viewYear, viewMonth);
            var daysContainer = document.createElement('div');
            daysContainer.className = 'boblog-date-picker-days';

            for (var j = 0; j < grid.length; j++) {
                var cell = grid[j];
                var dayCell = document.createElement('button');
                dayCell.type = 'button';
                dayCell.className = 'boblog-date-picker-day';

                /* 根据农历/节气开关决定格子内容结构 */
                buildDayCellContent(dayCell, cell, showLunar, showJieqi, jieqiMode);

                if (!cell.isCurrentMonth) {
                    dayCell.classList.add('other-month');
                }

                if (cell.year === todayYear &&
                    cell.month === todayMonth &&
                    cell.day === todayDay) {
                    dayCell.classList.add('today');
                }

                if (selectedYear && cell.year === selectedYear &&
                    cell.month === selectedMonth &&
                    cell.day === selectedDay) {
                    dayCell.classList.add('selected');
                }

                (function(c) {
                    dayCell.onclick = function(e) {
                        e.stopPropagation();
                        var value = c.year + '-' + padZero(c.month) + '-' + padZero(c.day);
                        input.value = value;
                        var display = wrapper.querySelector('.boblog-date-picker-display');
                        display.value = formatValue('date', value, format);
                        wrapper.classList.remove('open');
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    };
                })(cell);

                daysContainer.appendChild(dayCell);
            }

            panel.appendChild(daysContainer);
        }

        render();
    }

    /* ============================================================ */
    /* 渲染函数 - month 类型（月份网格面板）                             */
    /* ============================================================ */

    /**
     * 渲染月份选择面板
     * 面板结构：头部（年份切换按钮）→ 月份网格（4列×3行）
     * @param {HTMLElement} panel — 面板容器
     * @param {HTMLElement} wrapper — .boblog-date-picker 容器
     * @param {HTMLInputElement} input — 隐藏的原生 input
     * @param {string} format — 显示格式
     */
    function renderMonthPanel(panel, wrapper, input, format) {
        var currentValue = input.value;
        var now = new Date();
        var todayYear = now.getFullYear();
        var todayMonth = now.getMonth() + 1;
        var viewYear = todayYear;
        var selectedYear, selectedMonth;

        if (currentValue) {
            var parts = currentValue.split('-');
            if (parts.length === 2) {
                selectedYear = parseInt(parts[0], 10);
                selectedMonth = parseInt(parts[1], 10);
                viewYear = selectedYear;
            }
        }

        function render() {
            panel.innerHTML = '';

            var header = document.createElement('div');
            header.className = 'boblog-date-picker-header';

            var prevYear = document.createElement('button');
            prevYear.type = 'button';
            prevYear.className = 'boblog-date-picker-nav';
            prevYear.textContent = '◀';
            prevYear.onclick = function(e) {
                e.stopPropagation();
                viewYear--;
                render();
            };

            var title = document.createElement('span');
            title.className = 'boblog-date-picker-title';
            title.textContent = viewYear + '年';

            var nextYear = document.createElement('button');
            nextYear.type = 'button';
            nextYear.className = 'boblog-date-picker-nav';
            nextYear.textContent = '▶';
            nextYear.onclick = function(e) {
                e.stopPropagation();
                viewYear++;
                render();
            };

            /* "今天"按钮：跳转到当前年份并高亮当前月 */
            var todayBtn = document.createElement('button');
            todayBtn.type = 'button';
            todayBtn.className = 'boblog-date-picker-today-btn';
            todayBtn.textContent = '今天';
            todayBtn.onclick = function(e) {
                e.stopPropagation();
                viewYear = todayYear;
                selectedYear = todayYear;
                selectedMonth = todayMonth;
                render();
            };

            header.appendChild(prevYear);
            header.appendChild(title);
            header.appendChild(todayBtn);
            header.appendChild(nextYear);
            panel.appendChild(header);

            var monthsContainer = document.createElement('div');
            monthsContainer.className = 'boblog-date-picker-months';

            for (var m = 1; m <= 12; m++) {
                var monthCell = document.createElement('button');
                monthCell.type = 'button';
                monthCell.className = 'boblog-date-picker-month';
                monthCell.textContent = m + '月';

                if (viewYear === todayYear && m === todayMonth) {
                    monthCell.classList.add('today');
                }

                if (selectedYear && viewYear === selectedYear && m === selectedMonth) {
                    monthCell.classList.add('selected');
                }

                (function(month) {
                    monthCell.onclick = function(e) {
                        e.stopPropagation();
                        var value = viewYear + '-' + padZero(month);
                        input.value = value;
                        var display = wrapper.querySelector('.boblog-date-picker-display');
                        display.value = formatValue('month', value, format);
                        wrapper.classList.remove('open');
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    };
                })(m);

                monthsContainer.appendChild(monthCell);
            }

            panel.appendChild(monthsContainer);
        }

        render();
    }

    /* ============================================================ */
    /* 渲染函数 - week 类型（周选择面板）                                */
    /* ============================================================ */

    /**
     * 渲染周选择面板
     * 面板结构：头部（年月切换按钮）→ 星期行（含周号列）→ 周行（周号 + 7天，整行可点击）
     * @param {HTMLElement} panel — 面板容器
     * @param {HTMLElement} wrapper — .boblog-date-picker 容器
     * @param {HTMLInputElement} input — 隐藏的原生 input
     * @param {string} format — 显示格式
     */
    function renderWeekPanel(panel, wrapper, input, format, showLunar, showJieqi, jieqiMode) {
        var currentValue = input.value;
        var now = new Date();
        var todayYear = now.getFullYear();
        var todayMonth = now.getMonth() + 1;
        var todayDay = now.getDate();
        var viewYear = todayYear;
        var viewMonth = todayMonth;
        var selectedYear, selectedWeek;

        if (currentValue) {
            var parts = currentValue.split('-W');
            if (parts.length === 2) {
                selectedYear = parseInt(parts[0], 10);
                selectedWeek = parseInt(parts[1], 10);
                viewYear = selectedYear;
            }
        }

        function render() {
            panel.innerHTML = '';

            var header = document.createElement('div');
            header.className = 'boblog-date-picker-header';

            var prevYear = document.createElement('button');
            prevYear.type = 'button';
            prevYear.className = 'boblog-date-picker-nav';
            prevYear.textContent = '◀◀';
            prevYear.onclick = function(e) {
                e.stopPropagation();
                viewYear--;
                render();
            };

            var prevMonth = document.createElement('button');
            prevMonth.type = 'button';
            prevMonth.className = 'boblog-date-picker-nav';
            prevMonth.textContent = '◀';
            prevMonth.onclick = function(e) {
                e.stopPropagation();
                viewMonth--;
                if (viewMonth < 1) {
                    viewMonth = 12;
                    viewYear--;
                }
                render();
            };

            var title = document.createElement('span');
            title.className = 'boblog-date-picker-title';
            title.textContent = viewYear + '年' + viewMonth + '月';

            var nextMonth = document.createElement('button');
            nextMonth.type = 'button';
            nextMonth.className = 'boblog-date-picker-nav';
            nextMonth.textContent = '▶';
            nextMonth.onclick = function(e) {
                e.stopPropagation();
                viewMonth++;
                if (viewMonth > 12) {
                    viewMonth = 1;
                    viewYear++;
                }
                render();
            };

            var nextYear = document.createElement('button');
            nextYear.type = 'button';
            nextYear.className = 'boblog-date-picker-nav';
            nextYear.textContent = '▶▶';
            nextYear.onclick = function(e) {
                e.stopPropagation();
                viewYear++;
                render();
            };

            /* "今天"按钮：跳转到当前月份并高亮本周 */
            var todayBtn = document.createElement('button');
            todayBtn.type = 'button';
            todayBtn.className = 'boblog-date-picker-today-btn';
            todayBtn.textContent = '今天';
            todayBtn.onclick = function(e) {
                e.stopPropagation();
                viewYear = todayYear;
                viewMonth = todayMonth;
                selectedYear = todayYear;
                selectedWeek = getWeekNumber(todayYear, todayMonth, todayDay);
                render();
            };

            header.appendChild(prevYear);
            header.appendChild(prevMonth);
            header.appendChild(title);
            header.appendChild(todayBtn);
            header.appendChild(nextMonth);
            header.appendChild(nextYear);
            panel.appendChild(header);

            var weekdaysRow = document.createElement('div');
            weekdaysRow.className = 'boblog-date-picker-weekdays boblog-date-picker-weekdays--with-week';
            var weekLabel = document.createElement('span');
            weekLabel.textContent = 'W#';
            weekdaysRow.appendChild(weekLabel);
            for (var i = 0; i < WEEKDAYS.length; i++) {
                var wd = document.createElement('span');
                wd.textContent = WEEKDAYS[i];
                weekdaysRow.appendChild(wd);
            }
            panel.appendChild(weekdaysRow);

            var grid = buildCalendarGrid(viewYear, viewMonth);
            var weeksContainer = document.createElement('div');
            weeksContainer.className = 'boblog-date-picker-weeks';

            for (var row = 0; row < 6; row++) {
                var weekRow = document.createElement('div');
                weekRow.className = 'boblog-date-picker-week-row';

                /* 取该行中属于当前视图月份的格子来计算周号和年份，
                   避免跨月/跨年时周号归属到错误的年份 */
                var refCell = grid[row * 7];
                for (var rc = 0; rc < 7; rc++) {
                    if (grid[row * 7 + rc].isCurrentMonth) {
                        refCell = grid[row * 7 + rc];
                        break;
                    }
                }
                var weekNum = getWeekNumber(refCell.year, refCell.month, refCell.day);
                var weekYear = refCell.year;

                var weekCell = document.createElement('button');
                weekCell.type = 'button';
                weekCell.className = 'boblog-date-picker-week-number';
                weekCell.textContent = 'W' + weekNum;

                if (selectedYear && weekYear === selectedYear && weekNum === selectedWeek) {
                    weekRow.classList.add('selected');
                }

                weekRow.appendChild(weekCell);

                for (var col = 0; col < 7; col++) {
                    var cell = grid[row * 7 + col];
                    var dayCell = document.createElement('span');
                    dayCell.className = 'boblog-date-picker-week-day';

                    /* 根据农历/节气开关决定格子内容结构 */
                    buildDayCellContent(dayCell, cell, showLunar, showJieqi, jieqiMode);

                    if (!cell.isCurrentMonth) {
                        dayCell.classList.add('other-month');
                    }

                    weekRow.appendChild(dayCell);
                }

                (function(wNum, wYear) {
                    weekRow.onclick = function(e) {
                        e.stopPropagation();
                        var value = wYear + '-W' + padZero(wNum);
                        input.value = value;
                        var display = wrapper.querySelector('.boblog-date-picker-display');
                        display.value = formatValue('week', value, format);
                        wrapper.classList.remove('open');
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    };
                })(weekNum, weekYear);

                weeksContainer.appendChild(weekRow);
            }

            panel.appendChild(weeksContainer);
        }

        render();
    }

    /* ============================================================ */
    /* 渲染函数 - time 类型（时间选择面板）                              */
    /* ============================================================ */

    /**
     * 渲染时间选择面板
     * 面板结构：时/分各一组（上箭头 + 数字 + 下箭头）+ 确定按钮
     * @param {HTMLElement} panel — 面板容器
     * @param {HTMLElement} wrapper — .boblog-date-picker 容器
     * @param {HTMLInputElement} input — 隐藏的原生 input
     * @param {string} format — 显示格式
     */
    function renderTimePanel(panel, wrapper, input, format) {
        var currentValue = input.value || '00:00';
        var parts = currentValue.split(':');
        var hour = parseInt(parts[0], 10) || 0;
        var minute = parseInt(parts[1], 10) || 0;

        function render() {
            panel.innerHTML = '';

            var timeContainer = document.createElement('div');
            timeContainer.className = 'boblog-date-picker-time';

            var hourGroup = document.createElement('div');
            hourGroup.className = 'boblog-date-picker-time-group';

            var hourUp = document.createElement('button');
            hourUp.type = 'button';
            hourUp.className = 'boblog-date-picker-time-btn';
            hourUp.textContent = '▲';
            hourUp.onclick = function(e) {
                e.stopPropagation();
                hour = (hour + 1) % 24;
                render();
            };

            var hourDisplay = document.createElement('div');
            hourDisplay.className = 'boblog-date-picker-time-value';
            hourDisplay.textContent = padZero(hour);

            var hourDown = document.createElement('button');
            hourDown.type = 'button';
            hourDown.className = 'boblog-date-picker-time-btn';
            hourDown.textContent = '▼';
            hourDown.onclick = function(e) {
                e.stopPropagation();
                hour = (hour - 1 + 24) % 24;
                render();
            };

            hourGroup.appendChild(hourUp);
            hourGroup.appendChild(hourDisplay);
            hourGroup.appendChild(hourDown);

            var separator = document.createElement('div');
            separator.className = 'boblog-date-picker-time-separator';
            separator.textContent = ':';

            var minuteGroup = document.createElement('div');
            minuteGroup.className = 'boblog-date-picker-time-group';

            var minuteUp = document.createElement('button');
            minuteUp.type = 'button';
            minuteUp.className = 'boblog-date-picker-time-btn';
            minuteUp.textContent = '▲';
            minuteUp.onclick = function(e) {
                e.stopPropagation();
                minute = (minute + 1) % 60;
                render();
            };

            var minuteDisplay = document.createElement('div');
            minuteDisplay.className = 'boblog-date-picker-time-value';
            minuteDisplay.textContent = padZero(minute);

            var minuteDown = document.createElement('button');
            minuteDown.type = 'button';
            minuteDown.className = 'boblog-date-picker-time-btn';
            minuteDown.textContent = '▼';
            minuteDown.onclick = function(e) {
                e.stopPropagation();
                minute = (minute - 1 + 60) % 60;
                render();
            };

            minuteGroup.appendChild(minuteUp);
            minuteGroup.appendChild(minuteDisplay);
            minuteGroup.appendChild(minuteDown);

            timeContainer.appendChild(hourGroup);
            timeContainer.appendChild(separator);
            timeContainer.appendChild(minuteGroup);

            var confirmBtn = document.createElement('button');
            confirmBtn.type = 'button';
            confirmBtn.className = 'boblog-date-picker-confirm';
            confirmBtn.textContent = '确定';
            confirmBtn.onclick = function(e) {
                e.stopPropagation();
                var value = padZero(hour) + ':' + padZero(minute);
                input.value = value;
                var display = wrapper.querySelector('.boblog-date-picker-display');
                display.value = formatValue('time', value, format);
                wrapper.classList.remove('open');
                input.dispatchEvent(new Event('change', { bubbles: true }));
            };

            panel.appendChild(timeContainer);
            panel.appendChild(confirmBtn);
        }

        render();
    }

    /* ============================================================ */
    /* 渲染函数 - datetime-local 类型（日历 + 时间组合面板）              */
    /* ============================================================ */

    /**
     * 渲染日期时间选择面板
     * 面板结构：日历网格（同 date）+ 底部时间选择区（同 time）+ 确定按钮
     * 点击日期不关闭面板，需点击"确定"按钮才关闭
     * @param {HTMLElement} panel — 面板容器
     * @param {HTMLElement} wrapper — .boblog-date-picker 容器
     * @param {HTMLInputElement} input — 隐藏的原生 input
     * @param {string} format — 显示格式
     */
    function renderDatetimePanel(panel, wrapper, input, format, showLunar, showJieqi, jieqiMode) {
        var currentValue = input.value;
        var now = new Date();
        var todayYear = now.getFullYear();
        var todayMonth = now.getMonth() + 1;
        var todayDay = now.getDate();
        var viewYear = todayYear;
        var viewMonth = todayMonth;
        var selectedYear, selectedMonth, selectedDay;
        var hour = 0;
        var minute = 0;

        if (currentValue) {
            var dtParts = currentValue.split('T');
            if (dtParts.length === 2) {
                var datePart = dtParts[0];
                var timePart = dtParts[1];
                var dp = datePart.split('-');
                var tp = timePart.split(':');
                if (dp.length === 3) {
                    selectedYear = parseInt(dp[0], 10);
                    selectedMonth = parseInt(dp[1], 10);
                    selectedDay = parseInt(dp[2], 10);
                    viewYear = selectedYear;
                    viewMonth = selectedMonth;
                }
                if (tp.length >= 2) {
                    hour = parseInt(tp[0], 10) || 0;
                    minute = parseInt(tp[1], 10) || 0;
                }
            }
        }

        function render() {
            panel.innerHTML = '';

            var header = document.createElement('div');
            header.className = 'boblog-date-picker-header';

            var prevYear = document.createElement('button');
            prevYear.type = 'button';
            prevYear.className = 'boblog-date-picker-nav';
            prevYear.textContent = '◀◀';
            prevYear.onclick = function(e) {
                e.stopPropagation();
                viewYear--;
                render();
            };

            var prevMonth = document.createElement('button');
            prevMonth.type = 'button';
            prevMonth.className = 'boblog-date-picker-nav';
            prevMonth.textContent = '◀';
            prevMonth.onclick = function(e) {
                e.stopPropagation();
                viewMonth--;
                if (viewMonth < 1) {
                    viewMonth = 12;
                    viewYear--;
                }
                render();
            };

            var title = document.createElement('span');
            title.className = 'boblog-date-picker-title';
            title.textContent = viewYear + '年' + viewMonth + '月';

            var nextMonth = document.createElement('button');
            nextMonth.type = 'button';
            nextMonth.className = 'boblog-date-picker-nav';
            nextMonth.textContent = '▶';
            nextMonth.onclick = function(e) {
                e.stopPropagation();
                viewMonth++;
                if (viewMonth > 12) {
                    viewMonth = 1;
                    viewYear++;
                }
                render();
            };

            var nextYear = document.createElement('button');
            nextYear.type = 'button';
            nextYear.className = 'boblog-date-picker-nav';
            nextYear.textContent = '▶▶';
            nextYear.onclick = function(e) {
                e.stopPropagation();
                viewYear++;
                render();
            };

            /* "今天"按钮：跳回当前月份并选中今天 */
            var todayBtn = document.createElement('button');
            todayBtn.type = 'button';
            todayBtn.className = 'boblog-date-picker-today-btn';
            todayBtn.textContent = '今天';
            todayBtn.onclick = function(e) {
                e.stopPropagation();
                selectedYear = todayYear;
                selectedMonth = todayMonth;
                selectedDay = todayDay;
                viewYear = todayYear;
                viewMonth = todayMonth;
                render();
            };

            header.appendChild(prevYear);
            header.appendChild(prevMonth);
            header.appendChild(title);
            header.appendChild(todayBtn);
            header.appendChild(nextMonth);
            header.appendChild(nextYear);

            /* datetime-local 面板采用左右两栏布局：左侧日历、右侧时间 */
            var dtBody = document.createElement('div');
            dtBody.className = 'boblog-date-picker-dt-body';

            /* 左侧：日历区域（头部 + 星期行 + 日期网格） */
            var calendarSide = document.createElement('div');
            calendarSide.className = 'boblog-date-picker-dt-calendar';
            calendarSide.appendChild(header);

            var weekdaysRow = document.createElement('div');
            weekdaysRow.className = 'boblog-date-picker-weekdays';
            for (var i = 0; i < WEEKDAYS.length; i++) {
                var wd = document.createElement('span');
                wd.textContent = WEEKDAYS[i];
                weekdaysRow.appendChild(wd);
            }
            calendarSide.appendChild(weekdaysRow);

            var grid = buildCalendarGrid(viewYear, viewMonth);
            var daysContainer = document.createElement('div');
            daysContainer.className = 'boblog-date-picker-days';

            for (var j = 0; j < grid.length; j++) {
                var cell = grid[j];
                var dayCell = document.createElement('button');
                dayCell.type = 'button';
                dayCell.className = 'boblog-date-picker-day';

                /* 根据农历/节气开关决定格子内容结构 */
                buildDayCellContent(dayCell, cell, showLunar, showJieqi, jieqiMode);

                if (!cell.isCurrentMonth) {
                    dayCell.classList.add('other-month');
                }

                if (cell.year === todayYear &&
                    cell.month === todayMonth &&
                    cell.day === todayDay) {
                    dayCell.classList.add('today');
                }

                if (selectedYear && cell.year === selectedYear &&
                    cell.month === selectedMonth &&
                    cell.day === selectedDay) {
                    dayCell.classList.add('selected');
                }

                (function(c) {
                    dayCell.onclick = function(e) {
                        e.stopPropagation();
                        selectedYear = c.year;
                        selectedMonth = c.month;
                        selectedDay = c.day;
                        render();
                    };
                })(cell);

                daysContainer.appendChild(dayCell);
            }

            calendarSide.appendChild(daysContainer);

            /* 右侧：时间选择区域 */
            var timeSide = document.createElement('div');
            timeSide.className = 'boblog-date-picker-dt-time';

            var timeContainer = document.createElement('div');
            timeContainer.className = 'boblog-date-picker-time';

            var hourGroup = document.createElement('div');
            hourGroup.className = 'boblog-date-picker-time-group';

            /* "时"标签 */
            var hourLabel = document.createElement('div');
            hourLabel.className = 'boblog-date-picker-time-label';
            hourLabel.textContent = '时';

            var hourUp = document.createElement('button');
            hourUp.type = 'button';
            hourUp.className = 'boblog-date-picker-time-btn';
            hourUp.textContent = '▲';
            hourUp.onclick = function(e) {
                e.stopPropagation();
                hour = (hour + 1) % 24;
                render();
            };

            var hourDisplay = document.createElement('div');
            hourDisplay.className = 'boblog-date-picker-time-value';
            hourDisplay.textContent = padZero(hour);

            var hourDown = document.createElement('button');
            hourDown.type = 'button';
            hourDown.className = 'boblog-date-picker-time-btn';
            hourDown.textContent = '▼';
            hourDown.onclick = function(e) {
                e.stopPropagation();
                hour = (hour - 1 + 24) % 24;
                render();
            };

            hourGroup.appendChild(hourLabel);
            hourGroup.appendChild(hourUp);
            hourGroup.appendChild(hourDisplay);
            hourGroup.appendChild(hourDown);

            var minuteGroup = document.createElement('div');
            minuteGroup.className = 'boblog-date-picker-time-group';

            /* "分"标签 */
            var minuteLabel = document.createElement('div');
            minuteLabel.className = 'boblog-date-picker-time-label';
            minuteLabel.textContent = '分';

            var minuteUp = document.createElement('button');
            minuteUp.type = 'button';
            minuteUp.className = 'boblog-date-picker-time-btn';
            minuteUp.textContent = '▲';
            minuteUp.onclick = function(e) {
                e.stopPropagation();
                minute = (minute + 1) % 60;
                render();
            };

            var minuteDisplay = document.createElement('div');
            minuteDisplay.className = 'boblog-date-picker-time-value';
            minuteDisplay.textContent = padZero(minute);

            var minuteDown = document.createElement('button');
            minuteDown.type = 'button';
            minuteDown.className = 'boblog-date-picker-time-btn';
            minuteDown.textContent = '▼';
            minuteDown.onclick = function(e) {
                e.stopPropagation();
                minute = (minute - 1 + 60) % 60;
                render();
            };

            minuteGroup.appendChild(minuteLabel);
            minuteGroup.appendChild(minuteUp);
            minuteGroup.appendChild(minuteDisplay);
            minuteGroup.appendChild(minuteDown);

            timeContainer.appendChild(hourGroup);
            timeContainer.appendChild(minuteGroup);

            var confirmBtn = document.createElement('button');
            confirmBtn.type = 'button';
            confirmBtn.className = 'boblog-date-picker-confirm';
            confirmBtn.textContent = '确定';
            confirmBtn.onclick = function(e) {
                e.stopPropagation();
                if (!selectedYear || !selectedMonth || !selectedDay) {
                    return;
                }
                var value = selectedYear + '-' + padZero(selectedMonth) + '-' + padZero(selectedDay) +
                           'T' + padZero(hour) + ':' + padZero(minute);
                input.value = value;
                var display = wrapper.querySelector('.boblog-date-picker-display');
                display.value = formatValue('datetime-local', value, format);
                wrapper.classList.remove('open');
                input.dispatchEvent(new Event('change', { bubbles: true }));
            };

            /* 组装右侧时间区域 */
            timeSide.appendChild(timeContainer);
            timeSide.appendChild(confirmBtn);

            /* 组装左右两栏到面板 */
            dtBody.appendChild(calendarSide);
            dtBody.appendChild(timeSide);
            panel.appendChild(dtBody);
        }

        render();
    }

    /* ============================================================ */
    /* 核心转换函数                                                    */
    /* ============================================================ */

    /**
     * 转换单个日期选择器
     * 将 .boblog-date-picker 容器内的原生 input 转换为自定义面板
     * 步骤：隐藏原生 input → 创建显示区域 → 创建面板 → 绑定事件
     * @param {HTMLElement} wrapper — .boblog-date-picker 容器元素
     */
    function transformPicker(wrapper) {
        if (wrapper.classList.contains('boblog-date-picker-custom')) {
            return;
        }

        /* 查找 input 元素 */
        /* Firefox 下 type="month" 和 type="week" 会降级为 "text"，*/
        /* 所以不能只靠 type selector 查找，需要取容器内第一个 input */
        var input = wrapper.querySelector('input');
        if (!input) {
            return;
        }

        /* 读取 HTML 中原始写的 type 属性（getAttribute 返回原始值，不受浏览器降级影响） */
        var type = input.getAttribute('type') || 'date';

        /* 检查是否为支持的类型 */
        var SUPPORTED = ['date', 'datetime-local', 'month', 'week', 'time'];
        if (SUPPORTED.indexOf(type) === -1) {
            return;
        }
        wrapper.classList.add('boblog-date-picker-custom');
        wrapper.classList.add('boblog-date-picker--' + type);
        wrapper.setAttribute('data-bb-datepicker-init', '1');

        input.style.display = 'none';

        var format = wrapper.getAttribute('data-format') || DEFAULT_FORMATS[type];
        var placeholder = wrapper.getAttribute('data-placeholder') || DEFAULT_PLACEHOLDERS[type];

        /* 读取农历/节气显示开关 */
        /* showLunar: boolean — 是否显示农历 */
        /* jieqiMode: string — 节气模式：'true'=文字行，'bg'=背景色，其他=关闭 */
        var showLunar = wrapper.getAttribute('data-nongli') === 'true';
        var jieqiMode = wrapper.getAttribute('data-jieqi') || '';
        var showJieqi = (jieqiMode === 'true' || jieqiMode === 'bg');

        /* 创建显示/输入区域（使用 input[type="text"] 支持手动编辑） */
        var display = document.createElement('input');
        display.type = 'text';
        display.className = 'boblog-date-picker-display';
        display.readOnly = false;
        if (input.value) {
            display.value = formatValue(type, input.value, format);
        } else {
            display.value = '';
            display.placeholder = placeholder;
        }

        /* 创建图标按钮（点击弹出面板） */
        var iconBtn = document.createElement('button');
        iconBtn.type = 'button';
        iconBtn.className = 'boblog-date-picker-icon';
        iconBtn.setAttribute('tabindex', '-1');
        iconBtn.setAttribute('aria-label', '打开选择器');

        /* 创建面板 */
        var panel = document.createElement('div');
        panel.className = 'boblog-date-picker-panel';

        /* 面板内部点击不冒泡（防止触发全局关闭） */
        panel.onclick = function(e) {
            e.stopPropagation();
        };

        /* 打开/关闭面板的通用函数 */
        function openPanel() {
            if (input.disabled || input.readOnly ||
                wrapper.classList.contains('disabled') ||
                wrapper.classList.contains('readonly')) {
                return;
            }

            var wasOpen = wrapper.classList.contains('open');
            closeAll();

            if (!wasOpen) {
                wrapper.classList.add('open');

                if (type === 'date') {
                    renderDatePanel(panel, wrapper, input, format, showLunar, showJieqi, jieqiMode);
                } else if (type === 'month') {
                    renderMonthPanel(panel, wrapper, input, format);
                } else if (type === 'week') {
                    renderWeekPanel(panel, wrapper, input, format, showLunar, showJieqi, jieqiMode);
                } else if (type === 'time') {
                    renderTimePanel(panel, wrapper, input, format);
                } else if (type === 'datetime-local') {
                    renderDatetimePanel(panel, wrapper, input, format, showLunar, showJieqi, jieqiMode);
                }
            }
        }

        /* 图标按钮点击弹面板 */
        iconBtn.onclick = function(e) {
            e.stopPropagation();
            openPanel();
        };

        /* 输入框也支持点击弹面板（但不阻止光标定位） */
        display.addEventListener('click', function(e) {
            e.stopPropagation();
        });

        /* 输入框聚焦时弹面板 */
        display.addEventListener('focus', function() {
            if (!wrapper.classList.contains('open')) {
                openPanel();
            }
        });

        /* 键盘事件 */
        display.onkeydown = function(e) {
            if (e.key === 'Escape') {
                wrapper.classList.remove('open');
            }
            /* Enter 键：解析手动输入的值 */
            if (e.key === 'Enter') {
                e.preventDefault();
                parseDisplayInput();
                wrapper.classList.remove('open');
            }
        };

        /* 解析手动输入的值，同步回隐藏 input */
        function parseDisplayInput() {
            var val = display.value.trim();
            if (!val) {
                input.value = '';
                input.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }

            if (type === 'date') {
                /* 尝试解析 yyyy-MM-dd 或 yyyy/MM/dd */
                var match = val.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
                if (match) {
                    input.value = match[1] + '-' + padZero(parseInt(match[2], 10)) + '-' + padZero(parseInt(match[3], 10));
                    display.value = formatValue(type, input.value, format);
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            } else if (type === 'month') {
                var match2 = val.match(/^(\d{4})[-\/](\d{1,2})$/);
                if (match2) {
                    input.value = match2[1] + '-' + padZero(parseInt(match2[2], 10));
                    display.value = formatValue(type, input.value, format);
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            } else if (type === 'week') {
                var match3 = val.match(/^(\d{4})-?W(\d{1,2})$/i);
                if (match3) {
                    input.value = match3[1] + '-W' + padZero(parseInt(match3[2], 10));
                    display.value = formatValue(type, input.value, format);
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            } else if (type === 'time') {
                var match4 = val.match(/^(\d{1,2}):(\d{1,2})$/);
                if (match4) {
                    input.value = padZero(parseInt(match4[1], 10)) + ':' + padZero(parseInt(match4[2], 10));
                    display.value = formatValue(type, input.value, format);
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            } else if (type === 'datetime-local') {
                var match5 = val.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\s+(\d{1,2}):(\d{1,2})$/);
                if (match5) {
                    input.value = match5[1] + '-' + padZero(parseInt(match5[2], 10)) + '-' + padZero(parseInt(match5[3], 10)) +
                                 'T' + padZero(parseInt(match5[4], 10)) + ':' + padZero(parseInt(match5[5], 10));
                    display.value = formatValue(type, input.value, format);
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }

        /* blur 时也解析输入 */
        display.addEventListener('blur', function() {
            /* 延迟执行，避免点击面板时立即 blur 导致冲突 */
            setTimeout(function() {
                if (!wrapper.classList.contains('open')) {
                    parseDisplayInput();
                }
            }, 150);
        });

        wrapper.appendChild(display);
        wrapper.appendChild(iconBtn);
        wrapper.appendChild(panel);
    }

    /* ============================================================ */
    /* 初始化函数                                                      */
    /* ============================================================ */

    /**
     * 初始化指定容器内所有日期选择器
     * @param {HTMLElement} [container=document] — 搜索范围
     */
    function init(container) {
        var root = container || document;
        var pickers = root.querySelectorAll('.boblog-date-picker');

        for (var i = 0; i < pickers.length; i++) {
            transformPicker(pickers[i]);
        }
    }

    /* ============================================================ */
    /* 全局事件：点击外部关闭所有面板                                     */
    /* ============================================================ */
    document.addEventListener('click', function() {
        closeAll();
    });

    /* ============================================================ */
    /* 挂载到全局命名空间                                               */
    /* ============================================================ */
    BoblogUI.datePicker = {
        init: init
    };

    /* DOMContentLoaded 时自动初始化 */
    document.addEventListener('DOMContentLoaded', function() {
        init();
    });

})();
