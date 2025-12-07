// lunar.js - FINAL EXTENDED VERSION V4
// Updated: Supports full detailed JSON output including Ngu Hanh, Nap Am, Bad Days

const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
const TIET_KHI = [
    "Lập xuân", "Vũ thủy", "Kinh trập", "Xuân phân", "Thanh minh", "Cốc vũ",
    "Lập hạ", "Tiểu mãn", "Mang chủng", "Hạ chí", "Tiểu thử", "Đại thử",
    "Lập thu", "Xử thử", "Bạch lộ", "Thu phân", "Hàn lộ", "Sương giáng",
    "Lập đông", "Tiểu tuyết", "Đại tuyết", "Đông chí", "Tiểu hàn", "Đại hàn"
];

// Mới: Mapping Ngũ Hành cho Can/Chi
const CAN_NGU_HANH = ["Mộc", "Mộc", "Hỏa", "Hỏa", "Thổ", "Thổ", "Kim", "Kim", "Thủy", "Thủy"];
const CHI_NGU_HANH = ["Thủy", "Thổ", "Mộc", "Mộc", "Thổ", "Hỏa", "Hỏa", "Thổ", "Kim", "Kim", "Thổ", "Thủy"];

// Mới: Time Range cho 12 Chi
const CHI_TIME = [
    "23:00-00:59", "01:00-02:59", "03:00-04:59", "05:00-06:59", "07:00-08:59", "09:00-10:59",
    "11:00-12:59", "13:00-14:59", "15:00-16:59", "17:00-18:59", "19:00-20:59", "21:00-22:59"
];

// =========================================================================
// 1. CÁC HÀM THIÊN VĂN CỐT LÕI (ASTRONOMY CORE) - GIỮ NGUYÊN
// =========================================================================

function getJulianDay(dd, mm, yy) {
    let a = Math.floor((14 - mm) / 12);
    let y = yy + 4800 - a;
    let m = mm + 12 * a - 3;
    let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    return jd;
}

function jdFromDate(dd, mm, yy) {
    var a = Math.floor((14 - mm) / 12);
    var y = yy + 4800 - a;
    var m = mm + 12 * a - 3;
    var jd = dd + Math.floor((153 * m + 2) / 5) +
        365 * y + Math.floor(y / 4) - Math.floor(y / 100) +
        Math.floor(y / 400) - 32045;
    return jd;
}

function jdToDate(jd) {
    var a, b, c, d, e, m;
    if (jd > 2299160) {
        a = jd + 32044;
        b = Math.floor((4 * a + 3) / 146097);
        c = a - Math.floor((b * 146097) / 4);
    } else {
        b = 0;
        c = jd + 32082;
    }
    d = Math.floor((4 * c + 3) / 1461);
    e = c - Math.floor((1461 * d) / 4);
    m = Math.floor((5 * e + 2) / 153);
    var day = e - Math.floor((153 * m + 2) / 5) + 1;
    var month = m + 3 - 12 * Math.floor(m / 10);
    var year = b * 100 + d - 4800 + Math.floor(m / 10);
    return { day: day, month: month, year: year };
}

function getNewMoon(k) {
    var T = k / 1236.85;
    var T2 = T * T;
    var T3 = T2 * T;
    var dr = Math.PI / 180;
    var Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    var M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    var Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    var F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    var C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M) - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr) - 0.0004 * Math.sin(dr * 3 * Mpr) + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr)) - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M)) - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr)) + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    return Jd1 + C1 - 0.000278 * T2;
}

function getSunLongitude(jdn, timeZone) {
    var T = (jdn - 2451545.5 - timeZone / 24) / 36525;
    var T2 = T * T;
    var dr = Math.PI / 180;
    var M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    var L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    var DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M) + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
    var L = L0 + DL;
    var omega = 125.04 - 1934.136 * T;
    var lambda = L - 0.00569 - 0.00478 * Math.sin(omega * dr);
    lambda = lambda * dr;
    lambda = lambda - Math.PI * 2 * (Math.floor(lambda / (Math.PI * 2)));
    return lambda;
}

function getLunarMonth11(yy, timeZone) {
    var off = jdFromDate(31, 12, yy) - 2415021.076998695;
    var k = Math.floor(off / 29.530588853);
    var nm = getNewMoon(k);
    var sunLong = getSunLongitude(Math.floor(nm + 0.5), timeZone);
    if (sunLong > 3 * Math.PI / 2) nm = getNewMoon(k - 1);
    return Math.floor(nm + 0.5);
}

function getLeapMonthOffset(a11, timeZone) {
    var k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    var last = 0;
    var i = 1;
    var arc = getSunLongitude(Math.floor(getNewMoon(k + i) + 0.5), timeZone);
    do {
        last = arc;
        i++;
        arc = getSunLongitude(Math.floor(getNewMoon(k + i) + 0.5), timeZone);
    } while (Math.floor(arc / Math.PI * 6) != Math.floor(last / Math.PI * 6) && i < 14);
    return i - 1;
}

function convertSolar2Lunar(dd, mm, yy, timeZone = 7) {
    var dayNumber = jdFromDate(dd, mm, yy);
    var k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
    var monthStart = getNewMoon(k + 1);
    if (monthStart > dayNumber) monthStart = getNewMoon(k);

    var monthStartJd = Math.floor(monthStart + 0.5);
    var a11 = getLunarMonth11(yy, timeZone);
    var b11 = a11;
    var lunarYear = yy;

    if (a11 >= monthStartJd) {
        lunarYear = yy;
        a11 = getLunarMonth11(yy - 1, timeZone);
    } else {
        lunarYear = yy + 1;
        b11 = getLunarMonth11(yy + 1, timeZone);
    }

    var lunarDay = dayNumber - monthStartJd + 1;
    var diff = Math.floor((monthStartJd - a11) / 29);
    var lunarMonth = diff + 11;
    var leapMonthDiff = 0;

    if (b11 - a11 > 365) {
        leapMonthDiff = getLeapMonthOffset(a11, timeZone);
        if (diff >= leapMonthDiff) {
            lunarMonth = diff + 10;
        }
    }

    if (lunarMonth > 12) lunarMonth -= 12;
    if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

    var leapMonth = 0;
    if (b11 - a11 > 365 && leapMonthDiff >= 0 && diff == leapMonthDiff) {
        leapMonth = 1;
    }

    return {
        lunarDay: lunarDay,
        lunarMonth: lunarMonth,
        lunarYear: lunarYear,
        leap: leapMonth
    };
}

// =========================================================================
// 3. CAN CHI, NGŨ HÀNH & LỊCH PHÁP
// =========================================================================

function getCanChiYear(year) {
    return CAN[(year + 6) % 10] + " " + CHI[(year + 8) % 12];
}

function getCanChiMonth(lunarYear, lunarMonth) {
    const canIdx = (lunarYear * 12 + lunarMonth + 3) % 10;
    const chiIdx = (lunarMonth + 1) % 12;
    return CAN[canIdx] + " " + CHI[chiIdx];
}

function getCanChiDay(dd, mm, yy) {
    const jd = getJulianDay(dd, mm, yy);
    const canIndex = (jd + 9) % 10;
    const chiIndex = (jd + 1) % 12;
    return CAN[canIndex] + " " + CHI[chiIndex];
}

// Hàm tính tương sinh tương khắc Ngũ Hành (Can sinh Chi, v.v.)
function getNguHanhRelationship(canIndex, chiIndex) {
    const canEl = CAN_NGU_HANH[canIndex];
    const chiEl = CHI_NGU_HANH[chiIndex];

    const sinh = { "Kim": "Thủy", "Thủy": "Mộc", "Mộc": "Hỏa", "Hỏa": "Thổ", "Thổ": "Kim" };
    const khac = { "Kim": "Mộc", "Mộc": "Thổ", "Thổ": "Thủy", "Thủy": "Hỏa", "Hỏa": "Kim" };

    let rel = "Bình hòa";
    if (sinh[canEl] === chiEl) rel = "Can sinh Chi (Cát)";
    else if (sinh[chiEl] === canEl) rel = "Chi sinh Can (Cát)";
    else if (khac[canEl] === chiEl) rel = "Can khắc Chi (Hung)";
    else if (khac[chiEl] === canEl) rel = "Chi khắc Can (Hung)";
    else if (canEl === chiEl) rel = "Tỷ hòa (Bình)";

    return {
        can: canEl,
        chi: chiEl,
        relationship: rel
    };
}

// =========================================================================
// 4. CÁC HÀM BỔ TRỢ & DATABASE
// =========================================================================

function getSolarTermForDate(dd, mm, yy, timeZone = 7) {
    const jd = jdFromDate(dd, mm, yy);
    const currentLongDeg = getSunLongitude(jd, timeZone) * 180 / Math.PI;
    let termIndex = Math.floor(currentLongDeg / 15) + 3;
    if (termIndex >= 24) termIndex -= 24;
    return { index: termIndex, name: TIET_KHI[termIndex], jd: jd };
}

const NAP_AM = [
    "Giáp Tý, Ất Sửu: Hải trung kim", "Bính Dần, Đinh Mão: Lô trung hỏa", "Mậu Thìn, Kỷ Tỵ: Đại lâm mộc",
    "Canh Ngọ, Tân Mùi: Lộ bàng thổ", "Nhâm Thân, Quý Dậu: Kiếm phong kim", "Giáp Tuất, Ất Hợi: Sơn đầu hỏa",
    "Bính Tý, Đinh Sửu: Giản hạ thủy", "Mậu Dần, Kỷ Mão: Thành đầu thổ", "Canh Thìn, Tân Tỵ: Bạch lạp kim",
    "Nhâm Ngọ, Quý Mùi: Dương liễu mộc", "Giáp Thân, Ất Dậu: Tuyền trung thủy", "Bính Tuất, Đinh Hợi: Ốc thượng thổ",
    "Mậu Tý, Kỷ Sửu: Tích lịch hỏa", "Canh Dần, Tân Mão: Tùng bách mộc", "Nhâm Thìn, Quý Tỵ: Trường lưu thủy",
    "Giáp Ngọ, Ất Mùi: Sa trung kim", "Bính Thân, Đinh Dậu: Sơn hạ hỏa", "Mậu Tuất, Kỷ Hợi: Bình địa mộc",
    "Canh Tý, Tân Sửu: Bích thượng thổ", "Nhâm Dần, Quý Mão: Kim bạch kim", "Giáp Thìn, Ất Tỵ: Phú đăng hỏa",
    "Bính Ngọ, Đinh Mùi: Thiên hà thủy", "Mậu Thân, Kỷ Dậu: Đại dịch thổ", "Canh Tuất, Tân Hợi: Thoa xuyến kim",
    "Nhâm Tý, Quý Sửu: Tang chá mộc", "Giáp Dần, Ất Mão: Đại khê thủy", "Bính Thìn, Đinh Tỵ: Sa trung thổ",
    "Mậu Ngọ, Kỷ Mùi: Thiên thượng hỏa", "Canh Thân, Tân Dậu: Thạch lựu mộc", "Nhâm Tuất, Quý Hợi: Đại hải thủy"
];
function getNapAm(canIndex, chiIndex) {
    const pairIndex = (canIndex * 12 + chiIndex) % 60;
    return NAP_AM[Math.floor(pairIndex / 2)];
}

const MANSIONS_DETAIL = [
    // --- PHƯƠNG ĐÔNG (Thanh Long) ---
    {
        name: "Giác",
        animal: "Giao (Cá sấu)",
        element: "Mộc",
        type: "Tốt (Đại Kiết)",
        detail: "Sao Giác là sao đầu tiên, chủ về vinh hoa phú quý. Tạo tác, khởi công, cưới hỏi đều tốt.",
        good: "Xây dựng, cưới gả, thi cử đỗ đạt, thăng quan tiến chức.",
        bad: "An táng (chôn cất), xây mộ phần (dễ gặp tai ương)."
    },
    {
        name: "Cang",
        animal: "Long (Rồng)",
        element: "Kim",
        type: "Xấu (Hung)",
        detail: "Sao Cang là sao hung (Diệt Môn). Mọi việc khởi sự vào ngày này thường không bền.",
        good: "Rất ít việc tốt, chỉ hợp cắt may áo màn.",
        bad: "Cưới hỏi (dễ ly tán), động thổ, xây nhà, chôn cất (đại kỵ)."
    },
    {
        name: "Đê",
        animal: "Lạc (Nhím/Lạc đà)",
        element: "Thổ",
        type: "Tốt (Kiết)",
        detail: "Sao Đê chủ về tài lộc, điền sản. Ngày này thích hợp để cầu tài.",
        good: "Cưới gả, xuất hành, xây dựng, trồng trọt, chăn nuôi.",
        bad: "Khởi công việc lớn liên quan đến đường thủy (đi thuyền), an táng."
    },
    {
        name: "Phòng",
        animal: "Thố (Thỏ)",
        element: "Nhật (Mặt trời)",
        type: "Tốt (Đại Kiết)",
        detail: "Sao Phòng là 'Thiên Mã', mọi sự khởi đầu đều hanh thông, tài lộc dồi dào.",
        good: "Xây nhà, cưới hỏi, chuyển nhà mới, khai trương, xuất hành.",
        bad: "Chôn cất, cải táng."
    },
    {
        name: "Tâm",
        animal: "Hồ (Cáo)",
        element: "Nguyệt (Mặt trăng)",
        type: "Xấu (Đại Hung)",
        detail: "Sao Tâm là sao dữ, gây tranh chấp, kiện tụng. 'Tâm tinh tạo tác đại vi hung'.",
        good: "Tế lễ, cúng bái giải hạn.",
        bad: "Xây dựng, cưới hỏi, tranh chấp kiện tụng, kinh doanh (dễ thua lỗ)."
    },
    {
        name: "Vĩ",
        animal: "Hổ (Cọp)",
        element: "Hỏa",
        type: "Tốt (Kiết)",
        detail: "Sao Vĩ chủ về sự vững chắc, hậu vận tốt. Rất tốt cho việc tìm kiếm, cất giữ.",
        good: "Đào ao giếng, khai trương, cưới hỏi, xây tường rào, chiêu tài.",
        bad: "May mặc, đóng giường lót giường."
    },
    {
        name: "Cơ",
        animal: "Báo (Báo)",
        element: "Thủy",
        type: "Tốt (Tiểu Kiết)",
        detail: "Sao Cơ tốt cho văn chương, nghệ thuật, sự khéo léo.",
        good: "May mặc, an táng, gieo trồng, tu sửa nhà cửa.",
        bad: "Cưới hỏi, động thổ (vì kỵ Hợi - sao Cơ thường trùng ngày Hợi)."
    },

    // --- PHƯƠNG BẮC (Huyền Vũ) ---
    {
        name: "Đẩu",
        animal: "Giải (Cua/Giải trãi)",
        element: "Mộc",
        type: "Tốt (Đại Kiết)",
        detail: "Sao Đẩu là 'Thiên Cơ', chủ về bổng lộc, tước vị cao sang.",
        good: "Xây dựng, sửa chữa, cưới hỏi, trồng trọt, chăn nuôi.",
        bad: "Đi thuyền (sông nước), dao kéo."
    },
    {
        name: "Ngưu",
        animal: "Ngưu (Trâu)",
        element: "Kim",
        type: "Xấu (Hung)",
        detail: "Liên quan tích Ngưu Lang - Chức Nữ, chủ về chia ly, ngăn cách.",
        good: "Đi thuyền, trồng trọt, chăn nuôi gia súc.",
        bad: "Cưới gả (đại kỵ ly biệt), xây nhà, khởi công."
    },
    {
        name: "Nữ",
        animal: "Bức (Dơi)",
        element: "Thổ",
        type: "Xấu (Đại Hung)",
        detail: "Sao Nữ chủ về thị phi, khẩu thiệt, đàn bà lấn quyền.",
        good: "Săn bắn, đánh cá.",
        bad: "Cưới hỏi, khởi công, tranh chấp, kiện tụng."
    },
    {
        name: "Hư",
        animal: "Thử (Chuột)",
        element: "Nhật",
        type: "Xấu (Hung)",
        detail: "Sao Hư chủ về hư hao, mất mát tiền của, gia đạo bất an.",
        good: "Săn bắn, xây tường bao.",
        bad: "Xây nhà, cưới hỏi, khai trương (dễ phá sản)."
    },
    {
        name: "Nguy",
        animal: "Yến (Chim én)",
        element: "Nguyệt",
        type: "Xấu (Hung)",
        detail: "Sao Nguy chủ về nguy nan, hiểm trở, độ cao.",
        good: "Làm thủy lợi, san nền.",
        bad: "Đi thuyền, leo cao, xây cất (dễ tai nạn), cưới hỏi."
    },
    {
        name: "Thất",
        animal: "Trư (Heo)",
        element: "Hỏa",
        type: "Tốt (Kiết)",
        detail: "Sao Thất chủ về kinh doanh, phát đạt, lợi cho việc cầu tài.",
        good: "Xây dựng, khai trương, cưới hỏi, xuất hành.",
        bad: "An táng, chôn cất."
    },
    {
        name: "Bích",
        animal: "Du (Rái cá)",
        element: "Thủy",
        type: "Tốt (Đại Kiết)",
        detail: "Sao Bích chủ về văn chương, danh tiếng vang xa, mở mang bờ cõi.",
        good: "Khai trương, xây dựng, cưới hỏi, kinh doanh, nhập học.",
        bad: "Không có việc gì đại kỵ, nhưng tránh hướng Nam."
    },

    // --- PHƯƠNG TÂY (Bạch Hổ) ---
    {
        name: "Khuê",
        animal: "Lang (Sói)",
        element: "Mộc",
        type: "Xấu (Bình thường)",
        detail: "Sao Khuê chủ về văn chương nhưng kém về thực tế, hay do dự.",
        good: "Cầu công danh, cắt tóc, sửa sang nhà cửa.",
        bad: "Khai trương, trổ cửa, đào ao, cưới hỏi (dễ muộn con)."
    },
    {
        name: "Lâu",
        animal: "Cẩu (Chó)",
        element: "Kim",
        type: "Tốt (Kiết)",
        detail: "Sao Lâu chủ về hưng vượng, người người hòa thuận.",
        good: "Cầu tài, cưới hỏi, xây dựng, làm việc thiện.",
        bad: "Di chuyển đồ đạc, sửa chữa nhỏ."
    },
    {
        name: "Vị",
        animal: "Trĩ (Chim trĩ)",
        element: "Thổ",
        type: "Tốt (Kiết)",
        detail: "Sao Vị chủ về sự sung túc, kho tàng đầy ắp.",
        good: "Đào ao, trồng trọt, yến tiệc, kinh doanh, xây kho.",
        bad: "Cưới gả (một số sách nói tốt, một số nói kỵ, nên cẩn thận), đi xa."
    },
    {
        name: "Mão",
        animal: "Kê (Gà)",
        element: "Nhật",
        type: "Xấu (Hung)",
        detail: "Sao Mão là sao hung, chủ về tranh chấp đất đai, nhà cửa lạnh lẽo.",
        good: "Xây kho chứa, đắp đê.",
        bad: "Cưới gả, đóng giường, xây nhà ở, khai trương."
    },
    {
        name: "Tất",
        animal: "Ô (Quạ)",
        element: "Nguyệt",
        type: "Tốt (Đại Kiết)",
        detail: "Sao Tất chủ về mùa màng bội thu, chăn nuôi phát triển.",
        good: "Tế tự, cưới hỏi, xây dựng, khai trương, xuất hành.",
        bad: "Không có việc đại kỵ."
    },
    {
        name: "Chủy",
        animal: "Hầu (Khỉ)",
        element: "Hỏa",
        type: "Xấu (Đại Hung)",
        detail: "Sao Chủy là sao rất xấu, chủ về mất cắp, lừa đảo, hình phạt.",
        good: "Không có việc gì tốt. Chỉ nên làm việc thiện giải hạn.",
        bad: "Cưới gả, xây dựng, chôn cất, ký kết hợp đồng."
    },
    {
        name: "Sâm",
        animal: "Viên (Vượn)",
        element: "Thủy",
        type: "Tốt (Bình thường)",
        detail: "Sao Sâm chủ về văn võ song toàn, buôn bán phát đạt.",
        good: "Cầu tài, khai trương, xây dựng, thăng quan.",
        bad: "Cưới gả (dễ xung khắc), động thổ."
    },

    // --- PHƯƠNG NAM (Chu Tước) ---
    {
        name: "Tỉnh",
        animal: "Hãn (Chó rừng/Hổ)",
        element: "Mộc",
        type: "Tốt (Đại Kiết)",
        detail: "Sao Tỉnh chủ về sức khỏe, bình an, đỗ đạt.",
        good: "Chữa bệnh, tế lễ, đào giếng, trồng trọt, xây dựng.",
        bad: "Cưới hỏi (một số sách khuyên tránh), đi thuyền."
    },
    {
        name: "Quỷ",
        animal: "Dương (Dê)",
        element: "Kim",
        type: "Xấu (Hung)",
        detail: "Sao Quỷ là sao của người âm, chủ về tang tóc, mất mát.",
        good: "Chôn cất, chặt cỏ phá hoang.",
        bad: "Cưới gả, xây dựng (đại kỵ làm nhà)."
    },
    {
        name: "Liễu",
        animal: "Chương (Hoẵng)",
        element: "Thổ",
        type: "Xấu (Đại Hung)",
        detail: "Sao Liễu tính nết hung hăng, chủ về hao tài tốn của, tai nạn.",
        good: "Không có việc gì tốt.",
        bad: "Mọi việc khởi tạo, xây dựng, cưới hỏi, chôn cất."
    },
    {
        name: "Tinh",
        animal: "Mã (Ngựa)",
        element: "Nhật",
        type: "Xấu (Bình thường)",
        detail: "Sao Tinh chủ về hỏa hoạn, ly biệt, không yên ổn.",
        good: "Xây bếp, lắp lò.",
        bad: "Cưới gả, lợp nhà, xây dựng lớn."
    },
    {
        name: "Trương",
        animal: "Lộc (Hươu)",
        element: "Nguyệt",
        type: "Tốt (Kiết)",
        detail: "Sao Trương chủ về sự đoàn tụ, gia đình ấm no.",
        good: "Khai trương, cưới hỏi, xây dựng, tế lễ.",
        bad: "Sửa nhà, chuyển nhà (tuỳ sách)."
    },
    {
        name: "Dực",
        animal: "Xà (Rắn)",
        element: "Hỏa",
        type: "Tốt (Kiết)",
        detail: "Sao Dực chủ về văn thư, tin vui, đi xa gặp may.",
        good: "Trồng trọt, xuất hành, cưới hỏi, nhận chức.",
        bad: "Sửa mái nhà."
    },
    {
        name: "Chẩn",
        animal: "Dẫn (Giun)",
        element: "Thủy",
        type: "Tốt (Đại Kiết)",
        detail: "Sao Chẩn là sao cuối cùng, chủ về kết thúc viên mãn, tái sinh.",
        good: "Cưới gả, xây dựng, an táng, xuất hành, mua bán.",
        bad: "Không có việc đại kỵ."
    }
];
function getMansionForDay(jd) {
    // Sửa 14 thành 11 để lùi lại đúng Sao Tỉnh (Index 21)
    const index = (jd + 11) % 28; 
    
    // Xử lý trường hợp số âm nếu jd quá nhỏ (thường ít gặp với JD thực tế nhưng nên có)
    /* Nếu bạn dùng JD chuẩn thiên văn thì không sao, 
       nhưng nếu input jd nhỏ, hãy dùng: ((jd + 11) % 28 + 28) % 28 */
       
    return { ...MANSIONS_DETAIL[index], index: index + 1 };
}

const TRUC = ["Kiến", "Trừ", "Mãn", "Bình", "Định", "Chấp", "Phá", "Nguy", "Thành", "Thâu", "Khai", "Bế"];
function getTruc(jd, lunarMonth) {
    const dayChiIndex = (jd + 1) % 12;
    const monthChiIndex = (lunarMonth + 1) % 12;
    let trucIndex = (dayChiIndex - monthChiIndex);
    if (trucIndex < 0) trucIndex += 12;
    return TRUC[trucIndex];
}

function getLucDieu(lunarDay, monthSequence) {
    // monthSequence: Là số thứ tự của tháng trong năm (đã tính nhuận)
    const lucDieuList = ["Đại An", "Lưu Niên", "Tốc Hỷ", "Xích Khẩu", "Tiểu Cát", "Không Vong"];

    // Ép kiểu số
    const d = parseInt(lunarDay);
    const m = parseInt(monthSequence);

    // Công thức: (Tháng thứ tự + Ngày - 2) % 6
    let index = (m + d - 2) % 6;
    if (index < 0) index += 6;

    return lucDieuList[index];
}

// Bổ sung Hạc Thần (dựa theo ngày Can/Chi - Quy tắc giản lược phổ biến: Can ngày)
// Hoặc Quy tắc: Giáp/Kỷ: Đông Bắc, Ất/Canh: Đông Nam, Bính/Tân: Tây Nam, Đinh/Nhâm: Tây Bắc, Mậu/Quý: Chính Đông/Thiên Cung.
const DATA_XUAT_HANH = {
    0: { can: "Giáp", Tai: "Đông Nam", Hy: "Đông Bắc", Hac: "Đông Bắc", NguQuy: "Đông Nam" },
    1: { can: "Ất", Tai: "Đông Nam", Hy: "Tây Bắc", Hac: "Đông Nam", NguQuy: "Đông Nam" }, // Lưu ý: Một số sách ghi Tài là Đông
    2: { can: "Bính", Tai: "Chính Đông", Hy: "Tây Nam", Hac: "Tây Nam", NguQuy: "Chính Đông" },
    3: { can: "Đinh", Tai: "Chính Đông", Hy: "Chính Nam", Hac: "Tây Bắc", NguQuy: "Chính Đông" },
    4: { can: "Mậu", Tai: "Chính Bắc", Hy: "Đông Nam", Hac: "Chính Đông", noteHac: "Tại Thiên (Trên trời)", NguQuy: "Chính Bắc" },
    5: { can: "Kỷ", Tai: "Chính Bắc", Hy: "Đông Bắc", Hac: "Đông Bắc", NguQuy: "Chính Nam" },
    6: { can: "Canh", Tai: "Tây Nam", Hy: "Tây Bắc", Hac: "Đông Nam", NguQuy: "Đông Bắc" }, // Có sách ghi Tài là Chính Nam
    7: { can: "Tân", Tai: "Tây Nam", Hy: "Tây Nam", Hac: "Tây Nam", NguQuy: "Đông Bắc" },
    8: { can: "Nhâm", Tai: "Tây Bắc", Hy: "Chính Nam", Hac: "Tây Bắc", NguQuy: "Tây Nam" },
    9: { can: "Quý", Tai: "Tây Bắc", Hy: "Đông Nam", Hac: "Chính Đông", noteHac: "Tại Thiên (Trên trời)", NguQuy: "Tây Nam" } // Có sách ghi Tài là Tây
};

function getHuongXuatHanh(canIndex) {
    // Đảm bảo index luôn từ 0-9
    const index = canIndex % 10;
    const data = DATA_XUAT_HANH[index];

    return {
        thienCan: data.can,
        huongTot: {
            TaiThan: data.Tai, // Cầu tài lộc
            HyThan: data.Hy,   // Cầu may mắn, cưới hỏi, tin vui
            HacThan: data.Hac, // Hạc thần (đối ứng cô thần, quả tú - thường dùng để tránh hoặc dùng trong tu luyện/tâm linh)
        },
        huongXau: {
            NguQuy: data.NguQuy // Hướng nên tránh
        },
        ghiChu: data.noteHac || ""
    };
}

function getHourGoodBad(dayChi, hourChi) {
    const hoangDaoMap = {
        "Tý": ["Dần", "Mão", "Tỵ", "Thân", "Tuất", "Hợi"], "Sửu": ["Dần", "Mão", "Tỵ", "Thân", "Tuất", "Hợi"],
        "Dần": ["Tý", "Thìn", "Tỵ", "Mùi", "Tuất", "Hợi"], "Mão": ["Sửu", "Thìn", "Ngọ", "Mùi", "Dậu", "Tuất"],
        "Thìn": ["Tý", "Dần", "Mão", "Ngọ", "Thân", "Tuất"], "Tỵ": ["Tý", "Sửu", "Mão", "Ngọ", "Thân", "Dậu"],
        "Ngọ": ["Dần", "Mão", "Tỵ", "Thân", "Tuất", "Hợi"], "Mùi": ["Tý", "Thìn", "Tỵ", "Mùi", "Tuất", "Hợi"],
        "Thân": ["Sửu", "Thìn", "Ngọ", "Mùi", "Dậu", "Tuất"], "Dậu": ["Tý", "Dần", "Mão", "Ngọ", "Thân", "Tuất"],
        "Tuất": ["Tý", "Sửu", "Mão", "Ngọ", "Thân", "Dậu"], "Hợi": ["Dần", "Mão", "Tỵ", "Thân", "Tuất", "Hợi"]
    };
    return (hoangDaoMap[dayChi] || []).includes(hourChi) ? "Hoàng Đạo" : "Hắc Đạo";
}

function getAllHoursGoodBad(jd) {
    const dayChi = CHI[(jd + 1) % 12];
    const hours = [];
    const hoangDaoSummary = [];

    for (let i = 0; i < 12; i++) {
        const q = getHourGoodBad(dayChi, CHI[i]);
        hours.push({
            chi: CHI[i],
            quality: q,
            time: CHI_TIME[i]
        });
        if (q === "Hoàng Đạo") {
            hoangDaoSummary.push(`${CHI[i]} (${CHI_TIME[i]})`);
        }
    }
    return { hours, hoangDaoSummary };
}

function checkBadDays(lunarDay, lunarMonth, dayChiIndex) {
    let badDays = [];

    // 1. Nguyệt Kỵ (Mùng 5, 14, 23 đi chơi cũng thiệt nữa là đi buôn)
    if ([5, 14, 23].includes(lunarDay)) {
        badDays.push("Nguyệt Kỵ");
    }

    // 2. Tam Nương (Mùng 3, 7, 13, 18, 22, 27)
    if ([3, 7, 13, 18, 22, 27].includes(lunarDay)) {
        badDays.push("Tam Nương");
    }

    // 3. Thọ Tử (Trăm sự đều kỵ)
    // Quy tắc: T1:Tuất, T2:Hợi, T3:Tý, T4:Sửu, T5:Dần, T6:Mão, T7:Thìn, T8:Tỵ, T9:Ngọ, T10:Mùi, T11:Thân, T12:Dậu
    const thoTuMap = {
        1: 10, 2: 11, 3: 0, 4: 1, 5: 2, 6: 3,
        7: 4, 8: 5, 9: 6, 10: 7, 11: 8, 12: 9
    };
    if (dayChiIndex === thoTuMap[lunarMonth]) {
        badDays.push("Thọ Tử");
    }

    // 4. Sát Chủ Dương (Kỵ xây dựng, cưới hỏi, việc quan trọng)
    // Quy tắc: T1:Tý, T2:Tý, T3:Mùi, T4:Mão, T5:Thân, T6:Tuất, T7:Hợi, T8:Sửu, T9:Ngọ, T10:Dậu, T11:Dần, T12:Thìn
    const satChuDuongMap = {
        1: 0, 2: 0, 3: 7, 4: 3, 5: 8, 6: 10,
        7: 11, 8: 1, 9: 6, 10: 9, 11: 2, 12: 4
    };
    if (dayChiIndex === satChuDuongMap[lunarMonth]) {
        badDays.push("Sát Chủ Dương");
    }

    // 5. Dương Công Kỵ Nhật (Ngày xấu nhất trong năm, kỵ mọi việc)
    // Quy tắc: 13/1, 11/2, 9/3, 7/4, 5/5, 3/6, 8/7, 29/8, 25/9, 23/10, 21/11, 19/12
    const duongCongKyMap = {
        1: 13, 2: 11, 3: 9, 4: 7, 5: 5, 6: 3,
        7: 8, 8: 29, 9: 25, 10: 23, 11: 21, 12: 19
    };
    if (lunarDay === duongCongKyMap[lunarMonth]) {
        badDays.push("Dương Công Kỵ");
    }

    // 6. Vãng Vong (Lục Bại - Kỵ xuất hành)
    // T1:Dần, T2:Tỵ, T3:Thân, T4:Hợi, T5:Mão, T6:Ngọ, T7:Dậu, T8:Tý, T9:Thìn, T10:Mùi, T11:Tuất, T12:Sửu
    const vangVongMap = {
        1: 2, 2: 5, 3: 8, 4: 11, 5: 3, 6: 6,
        7: 9, 8: 0, 9: 4, 10: 7, 11: 10, 12: 1
    };
    if (dayChiIndex === vangVongMap[lunarMonth]) {
        badDays.push("Vãng Vong");
    }

    return badDays;
}

// =========================================================================
// 5. MAIN EXPORT FUNCTION
// =========================================================================

function getFullLunarInfo(dd, mm, yy, timeZone = 7) {
    const lunar = convertSolar2Lunar(dd, mm, yy, timeZone);
    const jd = getJulianDay(dd, mm, yy);

    // --- [LOGIC FIX V6] ---
    let monthSequence = lunar.lunarMonth;

    // SỬA LỖI QUAN TRỌNG:
    // Để xác định năm LunarYear có nhuận không, phải so sánh tháng 11 âm của (Year - 1) và (Year)
    const a11 = getLunarMonth11(lunar.lunarYear - 1, timeZone);
    const b11 = getLunarMonth11(lunar.lunarYear, timeZone);

    if (b11 - a11 > 365) {
        // Có nhuận trong năm nay
        const leapOff = getLeapMonthOffset(a11, timeZone);
        let leapMonthVal = leapOff - 2;
        if (leapMonthVal <= 0) leapMonthVal += 12;

        // Debug để kiểm tra (bạn có thể xóa dòng này)
        // console.log(`Năm ${lunar.lunarYear} nhuận tháng ${leapMonthVal}`);

        // Nếu tháng hiện tại > tháng nhuận -> Cộng 1
        if (lunar.lunarMonth > leapMonthVal) {
            monthSequence++;
        }
        // Nếu là chính tháng nhuận -> Cộng 1
        else if (lunar.lunarMonth === leapMonthVal && lunar.leap === 1) {
            monthSequence++;
        }
    }
    // ----------------------

    const dayCanIndex = (jd + 9) % 10;
    const dayChiIndex = (jd + 1) % 12;
    const yearCanIndex = (lunar.lunarYear + 6) % 10;
    const yearChiIndex = (lunar.lunarYear + 8) % 12;
    const hourData = getAllHoursGoodBad(jd);

    return {
        solar: { day: dd, month: mm, year: yy },
        lunar: lunar,
        canChi: {
            year: getCanChiYear(lunar.lunarYear),
            month: getCanChiMonth(lunar.lunarYear, lunar.lunarMonth),
            day: CAN[dayCanIndex] + " " + CHI[dayChiIndex]
        },
        nguHanh: getNguHanhRelationship(dayCanIndex, dayChiIndex),
        napAm: {
            day: getNapAm(dayCanIndex, dayChiIndex),
            year: getNapAm(yearCanIndex, yearChiIndex)
        },
        mansion: getMansionForDay(jd),
        truc: getTruc(jd, lunar.lunarMonth),

        // Truyền monthSequence (đã +1 nếu qua tháng nhuận) vào hàm Lục Diệu
        lucDieu: getLucDieu(lunar.lunarDay, monthSequence),

        badDays: checkBadDays(lunar.lunarDay),
        huongXuatHanh: getHuongXuatHanh(dayCanIndex),
        hours: hourData.hours,
        hoangDaoHours: hourData.hoangDaoSummary,
        solarTerm: getSolarTermForDate(dd, mm, yy, timeZone)
    };
}
function getMonthLunarCalendar(yy, mm, timeZone = 7) {
    // Lấy ngày đầu tháng dương
    const firstDay = new Date(yy, mm - 1, 1);
    const lastDay = new Date(yy, mm, 0);

    const result = [];

    for (let d = firstDay.getDate(); d <= lastDay.getDate(); d++) {
        const info = getFullLunarInfo(d, mm, yy, timeZone);

        result.push({
            solar: { day: d, month: mm, year: yy },
            lunarDay: info.lunar.lunarDay,
            lunarMonth: info.lunar.lunarMonth,
            isLeap: info.lunar.leap,
            canChiDay: info.canChi.day,
            lucDieu: info.lucDieu,
        });
    }

    return result;
}

module.exports = { getFullLunarInfo, getMonthLunarCalendar };

// =========================================================================
// TEST BLOCK
// =========================================================================
// console.log("--- TEST CHI TIẾT 04/12/2025 ---");
const info = getFullLunarInfo(4, 12, 2025);
// console.log(JSON.stringify(info, null, 2));
console.log(info)

// const month = getMonthLunarCalendar(2025, 7)
// console.log(month)