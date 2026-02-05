/**
 * BoblogUI 农历和节气计算模块
 *
 * 功能：
 * 1. 公历转农历（支持 1900-2100 年）
 * 2. 计算二十四节气日期
 *
 * 算法：
 * - 农历：经典查表法，基于农历数据编码表
 * - 节气：寿星万年历公式，使用 [Y*D+C]-L 算法
 *
 * @module BoblogUI.lunar
 * @version 1.0.0
 */
(function() {
    'use strict';

    /* === 农历数据表（1900-2100） === */
    /**
     * 农历信息编码表
     * 每个十六进制数编码一年的农历信息：
     * - 低 12 位：第 1-12 个月的大小（1=30天，0=29天）
     * - 第 13-16 位：闰月月份（0=无闰月，1-12=对应月份）
     * - 第 17 位：闰月大小（1=30天，0=29天）
     */
    var LUNAR_INFO = [
        0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900-1909
        0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 1910-1919
        0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1920-1929
        0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
        0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1940-1949
        0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, // 1950-1959
        0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1960-1969
        0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, // 1970-1979
        0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, // 1980-1989
        0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0, // 1990-1999
        0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
        0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, // 2010-2019
        0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, // 2020-2029
        0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
        0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, // 2040-2049
        0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, // 2050-2059
        0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, // 2060-2069
        0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, // 2070-2079
        0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, // 2080-2089
        0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252, // 2090-2099
        0x0d520  // 2100
    ];

    /* === 农历常量定义 === */
    var LUNAR_BASE_YEAR = 1900;  // 农历数据表起始年份
    var LUNAR_BASE_DATE = new Date(1900, 0, 31);  // 基准日期：1900年1月31日 = 农历正月初一

    // 农历月份名称
    var LUNAR_MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];

    // 农历日期名称
    var LUNAR_DAY_NAMES = [
        '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
        '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
        '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
    ];

    // 天干
    var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

    // 地支
    var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    /* === 二十四节气数据表 === */
    /**
     * 节气名称表（按月份排列，每月两个节气）
     */
    var JIEQI_NAMES = [
        '小寒', '大寒',  // 1月
        '立春', '雨水',  // 2月
        '惊蛰', '春分',  // 3月
        '清明', '谷雨',  // 4月
        '立夏', '小满',  // 5月
        '芒种', '夏至',  // 6月
        '小暑', '大暑',  // 7月
        '立秋', '处暑',  // 8月
        '白露', '秋分',  // 9月
        '寒露', '霜降',  // 10月
        '立冬', '小雪',  // 11月
        '大雪', '冬至'   // 12月
    ];

    /**
     * 节气计算系数表
     * 使用 [Y*D+C]-L 公式，其中：
     * - Y: 年份后两位
     * - D: 日期增量因子
     * - C: 世纪常数（20世纪和21世纪不同）
     * - L: int(Y/4) 闰年修正
     */
    var JIEQI_DATA = [
        // [20世纪C值, 21世纪C值]
        [6.11,    5.4055],  // 小寒
        [20.84,  20.12],    // 大寒
        [4.6295,  3.87],    // 立春
        [19.4599, 18.73],   // 雨水
        [6.3826,  5.63],    // 惊蛰
        [21.4155, 20.646],  // 春分
        [5.59,    4.81],    // 清明
        [20.888, 20.1],     // 谷雨
        [6.318,   5.52],    // 立夏
        [21.86,  21.04],    // 小满
        [6.5,     5.678],   // 芒种
        [22.2,   21.37],    // 夏至
        [7.928,   7.108],   // 小暑
        [23.65,  22.83],    // 大暑
        [8.35,    7.5],     // 立秋
        [23.95,  23.13],    // 处暑
        [8.44,    7.646],   // 白露
        [23.822, 23.042],   // 秋分
        [9.098,   8.318],   // 寒露
        [24.218, 23.438],   // 霜降
        [8.218,   7.438],   // 立冬
        [23.08,  22.36],    // 小雪
        [7.9,     7.18],    // 大雪
        [22.6,   21.94]     // 冬至
    ];

    /* === 工具函数 === */

    /**
     * 获取指定年份的农历信息编码
     * @param {number} year - 年份（1900-2100）
     * @returns {number} 农历信息编码
     */
    function getLunarYearInfo(year) {
        return LUNAR_INFO[year - LUNAR_BASE_YEAR];
    }

    /**
     * 获取指定年份的闰月月份
     * @param {number} year - 年份
     * @returns {number} 闰月月份（0表示无闰月，1-12表示对应月份）
     */
    function getLeapMonth(year) {
        var info = getLunarYearInfo(year);
        return (info >> 13) & 0x0F;  // 提取第13-16位
    }

    /**
     * 获取指定年份闰月的天数
     * @param {number} year - 年份
     * @returns {number} 闰月天数（0表示无闰月，29或30）
     */
    function getLeapMonthDays(year) {
        if (getLeapMonth(year) === 0) {
            return 0;
        }
        var info = getLunarYearInfo(year);
        return (info & 0x10000) ? 30 : 29;  // 检查第17位
    }

    /**
     * 获取指定年份某月的天数
     * @param {number} year - 年份
     * @param {number} month - 月份（1-12）
     * @returns {number} 天数（29或30）
     */
    function getMonthDays(year, month) {
        var info = getLunarYearInfo(year);
        return (info & (1 << (month - 1))) ? 30 : 29;  // 检查对应位
    }

    /**
     * 获取指定年份的总天数
     * @param {number} year - 年份
     * @returns {number} 总天数
     */
    function getYearDays(year) {
        var days = 0;
        var info = getLunarYearInfo(year);

        // 计算12个月的天数
        for (var i = 1; i <= 12; i++) {
            days += getMonthDays(year, i);
        }

        // 加上闰月天数
        days += getLeapMonthDays(year);

        return days;
    }

    /**
     * 计算两个日期之间的天数差
     * @param {Date} date1 - 日期1
     * @param {Date} date2 - 日期2
     * @returns {number} 天数差
     */
    function getDaysBetween(date1, date2) {
        var diff = date1.getTime() - date2.getTime();
        return Math.floor(diff / (24 * 60 * 60 * 1000));
    }

    /* === 农历转换核心函数 === */

    /**
     * 公历转农历
     * @param {number} year - 公历年份
     * @param {number} month - 公历月份（1-12）
     * @param {number} day - 公历日期（1-31）
     * @returns {Object} 农历信息对象
     */
    function getLunar(year, month, day) {
        // 参数校验
        if (year < 1900 || year > 2100) {
            throw new Error('年份必须在 1900-2100 之间');
        }

        // 计算距离基准日期的天数
        var inputDate = new Date(year, month - 1, day);
        var offset = getDaysBetween(inputDate, LUNAR_BASE_DATE);

        // 初始化农历年份（从1900年正月初一开始）
        var lunarYear = LUNAR_BASE_YEAR;
        var lunarMonth = 1;
        var lunarDay = 1;
        var isLeapMonth = false;

        // 逐年递减天数，确定农历年份
        var yearDays;
        while (lunarYear < 2101 && offset > 0) {
            yearDays = getYearDays(lunarYear);
            if (offset < yearDays) {
                break;
            }
            offset -= yearDays;
            lunarYear++;
        }

        // 逐月递减天数，确定农历月份
        var leapMonth = getLeapMonth(lunarYear);
        var monthDays;

        for (var i = 1; i <= 12; i++) {
            // 处理闰月
            if (leapMonth > 0 && i === leapMonth + 1 && !isLeapMonth) {
                i--;
                isLeapMonth = true;
                monthDays = getLeapMonthDays(lunarYear);
            } else {
                monthDays = getMonthDays(lunarYear, i);
            }

            if (offset < monthDays) {
                lunarMonth = i;
                break;
            }

            offset -= monthDays;

            // 闰月处理完毕，重置标记
            if (isLeapMonth && i === leapMonth + 1) {
                isLeapMonth = false;
            }
        }

        // 剩余天数即为农历日期
        lunarDay = offset + 1;

        // 计算天干地支年
        var ganIndex = (lunarYear - 4) % 10;  // 甲子年为公元4年
        var zhiIndex = (lunarYear - 4) % 12;
        var ganZhiYear = GAN[ganIndex] + ZHI[zhiIndex];

        return {
            lunarYear: lunarYear,
            lunarMonth: lunarMonth,
            lunarDay: lunarDay,
            isLeapMonth: isLeapMonth,
            lunarMonthText: (isLeapMonth ? '闰' : '') + LUNAR_MONTH_NAMES[lunarMonth - 1],
            lunarDayText: LUNAR_DAY_NAMES[lunarDay - 1],
            ganZhiYear: ganZhiYear
        };
    }

    /* === 节气计算核心函数 === */

    /**
     * 计算指定年份某个节气的日期
     * @param {number} year - 年份
     * @param {number} index - 节气索引（0-23）
     * @returns {number} 节气所在日期
     */
    /**
     * 特殊年份修正表
     * key: 节气索引，value: { 年份: 修正值 }
     * 修正值 +1 表示日期加1天，-1 表示减1天
     */
    var JIEQI_EXCEPTIONS = {
        0:  { 1982: 1, 2019: -1 },                // 小寒
        1:  { 2000: 1, 2082: 1 },                  // 大寒
        3:  { 2026: -1 },                           // 雨水
        5:  { 2084: 1 },                            // 春分
        9:  { 2008: 1 },                            // 小满
        11: { 1928: 1 },                            // 夏至
        12: { 1925: 1, 2016: 1 },                   // 小暑
        13: { 1922: 1 },                            // 大暑
        14: { 2002: 1 },                            // 立秋
        16: { 1927: 1 },                            // 白露
        17: { 1942: 1 },                            // 秋分
        19: { 2089: 1 },                            // 霜降
        20: { 2089: 1 },                            // 立冬
        21: { 1978: 1 },                            // 小雪
        22: { 1954: 1 },                            // 大雪
        23: { 1918: -1, 2021: -1 }                  // 冬至
    };

    function getJieqiDate(year, index) {
        /* 获取节气系数 */
        var data = JIEQI_DATA[index];
        /* 根据世纪选择 C 值：data[0]=20世纪，data[1]=21世纪 */
        /* 注意：2000年的小寒/大寒/立春/雨水（index 0~3）仍使用20世纪C值 */
        var use21st = (year > 2000) || (year === 2000 && index > 3);
        var C = use21st ? data[1] : data[0];

        /* 年份后两位 */
        var Y = year % 100;

        /* 闰年修正值 L：小寒(0)、大寒(1)、立春(2)、雨水(3) 用 (Y-1)/4，其余用 Y/4 */
        var L;
        if (index <= 3) {
            L = Math.floor((Y - 1) / 4);
        } else {
            L = Math.floor(Y / 4);
        }

        /* 寿星公式：[Y × 0.2422 + C] - L */
        var jd = Math.floor(Y * 0.2422 + C) - L;

        /* 特殊年份修正 */
        if (JIEQI_EXCEPTIONS[index] && JIEQI_EXCEPTIONS[index][year]) {
            jd += JIEQI_EXCEPTIONS[index][year];
        }

        return jd;
    }

    /**
     * 获取指定公历日期的节气
     * @param {number} year - 公历年份
     * @param {number} month - 公历月份（1-12）
     * @param {number} day - 公历日期（1-31）
     * @returns {string|null} 节气名称，如果不是节气则返回 null
     */
    function getJieqi(year, month, day) {
        // 参数校验
        if (year < 1900 || year > 2100) {
            return null;
        }

        // 计算当月对应的节气索引
        var index1 = (month - 1) * 2;      // 月初节气
        var index2 = (month - 1) * 2 + 1;  // 月末节气

        // 计算两个节气的日期
        var jieqi1Date = getJieqiDate(year, index1);
        var jieqi2Date = getJieqiDate(year, index2);

        // 判断是否为节气日
        if (day === jieqi1Date) {
            return JIEQI_NAMES[index1];
        } else if (day === jieqi2Date) {
            return JIEQI_NAMES[index2];
        }

        return null;
    }

    /* === 模块导出 === */

    // 初始化 BoblogUI 命名空间
    window.BoblogUI = window.BoblogUI || {};

    // 导出农历和节气模块
    window.BoblogUI.lunar = {
        getLunar: getLunar,
        getJieqi: getJieqi
    };

})();
