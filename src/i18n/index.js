const fs = require('fs');
const path = require('path');
const defaultLang = 'en';

const languages = {};
fs.readdirSync(__dirname).forEach(file => {
    if (file.endsWith('.json')) {
        const lang = file.replace('.json', '');
        languages[lang] = require(path.join(__dirname, file));
    }
});

// Hàm lấy giá trị theo path "a.b.c"
function getNested(obj, path) {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Lấy text theo key (hỗ trợ nested), lang và params
 */
function t(key, lang = defaultLang, params = {}) {
    let text = getNested(languages[lang], key);

    // Nếu text null/undefined thì fallback sang defaultLang
    if (text == null) {
        text = getNested(languages[defaultLang], key);
    }

    // Nếu vẫn không có thì lấy chính key
    if (text == null) {
        text = key;
    }

    // Thay thế {param} trong text
    for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`{${k}}`, 'g'), v);
    }
    return text;
}


module.exports = { t, defaultLang, languages };
