/**
 * BoblogUI 拼音搜索工具模块
 *
 * 提供中文文本的拼音匹配搜索功能，支持三种匹配方式：
 * 1. 直接文本匹配 — 搜索词直接包含在文本中
 * 2. 拼音首字母匹配 — 如 "js" 可匹配 "技术"
 * 3. 完整拼音匹配 — 如 "jishu" 可匹配 "技术"
 *
 * 使用方式：
 *   BoblogUI.pinyin.matches("技术分享", "js");    // true（首字母匹配）
 *   BoblogUI.pinyin.matches("技术分享", "jishu"); // true（完整拼音匹配）
 *   BoblogUI.pinyin.matches("技术分享", "技术");  // true（直接匹配）
 *
 * 扩展映射表：
 *   BoblogUI.pinyin.extend({ '赟': 'yun', '翀': 'chong' });
 *
 * 向后兼容：同时挂载为 window.PinyinUtil，旧代码无需修改
 *
 * @module BoblogUI.pinyin
 * @version 1.0.0
 */
(function() {
    'use strict';

    /* ==========================================================================
       汉字拼音映射表
       包含常用汉字的拼音（小写、无声调），可通过 extend() 动态扩展
       ========================================================================== */
    var PINYIN_MAP = {
        /* --- 技术/计算机相关 --- */
        '技': 'ji', '术': 'shu', '基': 'ji', '数': 'shu', '计': 'ji',
        '编': 'bian', '程': 'cheng', '开': 'kai', '发': 'fa',
        '前': 'qian', '端': 'duan', '后': 'hou', '设': 'she',
        '软': 'ruan', '硬': 'ying', '件': 'jian', '网': 'wang', '络': 'luo',
        '系': 'xi', '统': 'tong', '据': 'ju', '库': 'ku',
        '服': 'fu', '务': 'wu', '器': 'qi', '云': 'yun', '平': 'ping', '台': 'tai',
        '移': 'yi', '动': 'dong', '应': 'ying', '用': 'yong',
        '人': 'ren', '工': 'gong', '智': 'zhi', '能': 'neng', '机': 'ji',
        '深': 'shen', '度': 'du', '算': 'suan', '法': 'fa', '模': 'mo', '型': 'xing',
        '框': 'kuang', '架': 'jia', '组': 'zu', '插': 'cha', '扩': 'kuo', '展': 'zhan',
        '配': 'pei', '置': 'zhi', '优': 'you', '化': 'hua', '性': 'xing',
        '调': 'tiao', '试': 'shi', '错': 'cuo', '误': 'wu', '处': 'chu', '异': 'yi', '常': 'chang',
        '接': 'jie', '口': 'kou', '规': 'gui', '范': 'fan', '标': 'biao', '准': 'zhun',
        '协': 'xie', '议': 'yi', '格': 'ge', '式': 'shi', '版': 'ban', '本': 'ben',
        '控': 'kong', '制': 'zhi', '更': 'geng', '功': 'gong', '需': 'xu', '求': 'qiu',
        '析': 'xi', '源': 'yuan', '码': 'ma', '代': 'dai',
        '测': 'ce', '部': 'bu', '署': 'shu', '运': 'yun', '维': 'wei',
        '安': 'an', '全': 'quan', '密': 'mi', '钥': 'yue', '证': 'zheng', '书': 'shu',

        /* --- 生活/分类相关 --- */
        '分': 'fen', '类': 'lei', '生': 'sheng', '活': 'huo', '学': 'xue', '习': 'xi',
        '作': 'zuo', '游': 'you', '戏': 'xi', '音': 'yin', '乐': 'le',
        '影': 'ying', '视': 'shi', '读': 'du', '旅': 'lv', '行': 'xing',
        '美': 'mei', '食': 'shi', '健': 'jian', '康': 'kang',
        '科': 'ke', '新': 'xin', '闻': 'wen', '资': 'zi', '讯': 'xun',
        '教': 'jiao', '育': 'yu', '文': 'wen', '章': 'zhang', '博': 'bo', '客': 'ke',
        '日': 'ri', '记': 'ji', '笔': 'bi', '随': 'sui', '杂': 'za', '谈': 'tan',
        '经': 'jing', '验': 'yan', '心': 'xin', '得': 'de', '总': 'zong', '结': 'jie',
        '指': 'zhi', '南': 'nan', '入': 'ru', '门': 'men', '进': 'jin', '阶': 'jie',
        '高': 'gao', '级': 'ji', '专': 'zhuan', '业': 'ye',
        '产': 'chan', '品': 'pin', '项': 'xiang', '目': 'mu', '管': 'guan', '理': 'li',
        '档': 'dang', '电': 'dian', '脑': 'nao', '手': 'shou', '板': 'ban',
        '图': 'tu', '片': 'pian', '频': 'pin', '声': 'sheng',

        /* --- 常用字 --- */
        '中': 'zhong', '国': 'guo', '上': 'shang', '下': 'xia', '左': 'zuo', '右': 'you',
        '大': 'da', '小': 'xiao', '多': 'duo', '少': 'shao', '长': 'chang', '短': 'duan',
        '快': 'kuai', '慢': 'man', '好': 'hao', '坏': 'huai', '对': 'dui', '是': 'shi', '否': 'fou',
        '有': 'you', '无': 'wu', '在': 'zai', '不': 'bu', '和': 'he', '或': 'huo',
        '的': 'de', '了': 'le', '着': 'zhe', '过': 'guo', '个': 'ge', '这': 'zhe', '那': 'na',
        '一': 'yi', '二': 'er', '三': 'san', '四': 'si', '五': 'wu',
        '六': 'liu', '七': 'qi', '八': 'ba', '九': 'jiu', '十': 'shi', '百': 'bai', '千': 'qian', '万': 'wan',
        '年': 'nian', '月': 'yue', '时': 'shi', '秒': 'miao',
        '今': 'jin', '天': 'tian', '明': 'ming', '昨': 'zuo',
        '我': 'wo', '你': 'ni', '他': 'ta', '她': 'ta', '它': 'ta', '们': 'men',
        '哪': 'na', '什': 'shen', '么': 'me', '谁': 'shui', '怎': 'zen', '样': 'yang',
        '会': 'hui', '可': 'ke', '以': 'yi', '要': 'yao', '想': 'xiang', '做': 'zuo', '说': 'shuo',
        '看': 'kan', '听': 'ting', '写': 'xie', '找': 'zhao', '给': 'gei', '让': 'rang', '把': 'ba', '被': 'bei',
        '点': 'dian', '击': 'ji', '选': 'xuan', '择': 'ze', '确': 'que', '定': 'ding', '取': 'qu', '消': 'xiao',
        '保': 'bao', '存': 'cun', '删': 'shan', '除': 'chu', '添': 'tian', '加': 'jia', '修': 'xiu', '改': 'gai',
        '查': 'cha', '询': 'xun', '搜': 'sou', '索': 'suo', '显': 'xian', '示': 'shi', '隐': 'yin', '藏': 'cang'
    };


    /* ==========================================================================
       内部工具函数
       ========================================================================== */

    /**
     * 获取字符串的拼音首字母序列
     * 例如: "技术分享" → "jsfx"
     *
     * @param {string} str - 要转换的中文字符串
     * @returns {string} 拼音首字母序列（小写）
     */
    function getPinyinInitials(str) {
        if (!str) return '';
        var result = '';
        for (var i = 0; i < str.length; i++) {
            var char = str[i];
            var pinyin = PINYIN_MAP[char];
            if (pinyin) {
                /* 取拼音的第一个字母作为首字母 */
                result += pinyin[0];
            } else if (/[a-zA-Z0-9]/.test(char)) {
                /* 英文字母和数字保持原样（转小写） */
                result += char.toLowerCase();
            }
            /* 其他字符（标点符号等）忽略 */
        }
        return result;
    }

    /**
     * 获取字符串的完整拼音（无声调）
     * 例如: "技术" → "jishu"
     *
     * @param {string} str - 要转换的中文字符串
     * @returns {string} 完整拼音字符串（小写，无空格）
     */
    function getFullPinyin(str) {
        if (!str) return '';
        var result = '';
        for (var i = 0; i < str.length; i++) {
            var char = str[i];
            var pinyin = PINYIN_MAP[char];
            if (pinyin) {
                result += pinyin;
            } else if (/[a-zA-Z0-9]/.test(char)) {
                result += char.toLowerCase();
            }
        }
        return result;
    }

    /**
     * 检查文本是否匹配搜索词
     * 依次尝试：直接文本匹配 → 拼音首字母匹配 → 完整拼音匹配
     *
     * @param {string} text - 要搜索的文本
     * @param {string} search - 搜索词
     * @returns {boolean} 是否匹配
     *
     * @example
     * matches("技术分享", "技术")   // true — 直接匹配
     * matches("技术分享", "js")     // true — 首字母匹配
     * matches("技术分享", "jishu")  // true — 完整拼音匹配
     */
    function matches(text, search) {
        if (!text || !search) return false;
        var lowerText = text.toLowerCase();
        var lowerSearch = search.toLowerCase();

        /* 1. 直接文本匹配 */
        if (lowerText.indexOf(lowerSearch) !== -1) return true;

        /* 2. 拼音首字母匹配 */
        var initials = getPinyinInitials(text);
        if (initials.indexOf(lowerSearch) !== -1) return true;

        /* 3. 完整拼音匹配 */
        var fullPinyin = getFullPinyin(text);
        if (fullPinyin.indexOf(lowerSearch) !== -1) return true;

        return false;
    }

    /**
     * 获取匹配类型
     * 用于确定文本是通过哪种方式匹配的
     *
     * @param {string} text - 要搜索的文本
     * @param {string} search - 搜索词
     * @returns {string|null} 匹配类型: 'direct' | 'initials' | 'fullPinyin' | null
     */
    function getMatchType(text, search) {
        if (!text || !search) return null;
        var lowerText = text.toLowerCase();
        var lowerSearch = search.toLowerCase();

        if (lowerText.indexOf(lowerSearch) !== -1) return 'direct';

        var initials = getPinyinInitials(text);
        if (initials.indexOf(lowerSearch) !== -1) return 'initials';

        var fullPinyin = getFullPinyin(text);
        if (fullPinyin.indexOf(lowerSearch) !== -1) return 'fullPinyin';

        return null;
    }

    /**
     * 扩展拼音映射表
     * 允许动态添加新的汉字拼音映射
     *
     * @param {Object} newMappings - 新的映射对象，格式: { '字': 'pinyin', ... }
     *
     * @example
     * BoblogUI.pinyin.extend({ '赟': 'yun', '翀': 'chong' });
     */
    function extend(newMappings) {
        if (newMappings && typeof newMappings === 'object') {
            for (var key in newMappings) {
                if (newMappings.hasOwnProperty(key)) {
                    PINYIN_MAP[key] = newMappings[key];
                }
            }
        }
    }


    /* ==========================================================================
       模块导出
       ========================================================================== */

    var pinyin = {
        matches: matches,
        getPinyinInitials: getPinyinInitials,
        getFullPinyin: getFullPinyin,
        getMatchType: getMatchType,
        extend: extend
    };

    /* 挂载到 BoblogUI 命名空间 */
    window.BoblogUI = window.BoblogUI || {};
    window.BoblogUI.pinyin = pinyin;

    /* 向后兼容：旧代码使用 PinyinUtil.matches() 可直接工作 */
    window.PinyinUtil = pinyin;

})();
