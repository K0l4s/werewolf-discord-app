const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { getExtendedLunarInfo, getMonthLunarCalendar } = require("../utils/lunar");

class LunarCalendarController {
    static buildExtendedLunarEmbed(lunarInfo) {
        // const solarDate = new Date(dateInput);
        // const dd = solarDate.getDate();
        // const mm = solarDate.getMonth() + 1;
        // const yy = solarDate.getFullYear();

        console.log(lunarInfo);

        // FIX: mansion không có "meaning"
        const mansion = lunarInfo.mansion || {};
        let statusIcon = "⚪";
        if (mansion.type.includes("Kiết")) statusIcon = "🟢"; // Tốt
        if (mansion.type.includes("Hung")) statusIcon = "🔴"; // Xấu



        const mansionText =
            `${statusIcon} **THẬP NHỊ BÁT TÚ: SAO ${mansion.name.toUpperCase()}** \n` +
            `─────────────────────────────\n` +
            `🐲 **Biểu tượng:** ${mansion.animal} (${mansion.element})\n` +
            `📊 **Đánh giá:** ${mansion.type}\n` +
            `📜 **Luận giải:** *${mansion.detail}*\n` +
            `✅ **Nên làm:** ${mansion.good}\n` +
            `❌ **Kỵ làm:** ${mansion.bad}\n`

        // FIX: hướng xuất hành thiếu "Hạc thần"
        const huong = lunarInfo.huongXuatHanh || {};
        const huongText =
            `• **Thiên can:** ${huong.thienCan || '—'}\n` +
            `• **🟢 Tài thần:** ${huong.huongTot.TaiThan || '—'}\n` +
            `• **🟢 Hỷ thần:** ${huong.huongTot.HyThan || '—'}\n` +
            `• **🕊️ Hạc thần ngự tại:** ${huong.huongTot.HacThan || 'Không có dữ liệu'} ${huong.ghiChu && huong.ghiChu != '' ? "*(" + huong.ghiChu + ")*" : ""} \n` +
            `• **🔴 Tránh hướng **NGŨ QUỶ**:** ${huong.huongXau.NguQuy || 'Không có dữ liệu'}`;
        const nguHanh = lunarInfo.nguHanh;
        const nguHanhText =
            `• Can  ${nguHanh.can || '—'}\n` +
            `• Chi  ${nguHanh.chi || '—'}\n` +
            `• Đánh giá:  ${nguHanh.relationship || '—'}\n`
        const napAm = lunarInfo.napAm;
        const napAmText =
            `• Ngày  ${napAm.day || '—'}\n` +
            `• Năm  ${napAm.year || '—'}\n`
        // Giờ hoàng/hắc đạo
        const gioHoangDao = lunarInfo.hours
            .filter(h => h.quality === "Hoàng Đạo")
            .map(h => `${h.chi} (${h.time})`)
            .join(", ");

        const gioHacDao = lunarInfo.hours
            .filter(h => h.quality === "Hắc Đạo")
            .map(h => `${h.chi} (${h.time})`)
            .join(", ");

        const gioText =
            `• **Giờ Hoàng Đạo:** ${gioHoangDao || '—'}\n` +
            `• **Giờ Hắc Đạo:** ${gioHacDao || '—'}`;

        // FIX: badDays không có trong dữ liệu => luôn "Không phạm"
        var ngayKyText = "✅ **Không phạm ngày kỵ nào**";

        if (lunarInfo.badDays.length > 0) {
            // Nếu có ngày xấu, join mảng lại thành chuỗi
            // Ví dụ: "⚠️ Phạm ngày: Tam Nương, Sát Chủ Dương"
            ngayKyText = `⚠️ **Phạm ngày:** ${lunarInfo.badDays.join(", ")}`;
        }
        // FIX: solarTerm không tồn tại
        const solarTermText = lunarInfo.solarTerm.name;
        const lucDieuText = lunarInfo.lucDieu ? lunarInfo.lucDieu : "Không có thông tin"

        // FIX: extended info
        // let extendedInfo = "";
        // if (lunarInfo.extended) {
        //     const ext = lunarInfo.extended;
        //     extendedInfo = `• **Khổng Minh lục diệu:** ${ext.lucDieu || '—'}`;
        // }

        // FIX: không có ngũ hành => dùng màu mặc định
        const embedColor = "#ffb300";
        const embed = new EmbedBuilder()
            .setTitle(`📅 Lịch Âm – ${lunarInfo.solar.day}/${lunarInfo.solar.month}/${lunarInfo.solar.year}`)
            .setColor(embedColor)
            .setDescription(
                `**Can Chi:** Năm ${lunarInfo.canChi.year} - Tháng ${lunarInfo.canChi.month} - Ngày ${lunarInfo.canChi.day}\n${ngayKyText}`
            )
            .addFields(
                {
                    name: "🌙 Âm lịch",
                    value: `**${lunarInfo.lunar.lunarDay}/${lunarInfo.lunar.lunarMonth}/${lunarInfo.lunar.lunarYear}**` +
                        (lunarInfo.lunar.leap ? " (tháng nhuận)" : ""),
                    inline: true
                },
                {
                    name: "✨ Nhị thập bát tú",
                    value: mansionText,
                    inline: false
                },
                {
                    name: "📌 Trực trong tháng",
                    value: `**${lunarInfo.truc || '—'}**`,
                    inline: true
                },
                {
                    name: "✨ Ngũ hành",
                    value: nguHanhText,
                    inline: false
                },
                {
                    name: "✨ Nạp Âm",
                    value: napAmText,
                    inline: false
                },
                {
                    name: "Lục diệu",
                    value: lucDieuText,
                    inline: true
                },
                {
                    name: "🧭 Hướng xuất hành",
                    value: huongText,
                    inline: false
                },
                {
                    name: "⏰ Giờ tốt/xấu",
                    value: gioText,
                    inline: false
                },
                {
                    name: "🌤️ Tiết khí",
                    value: solarTermText,
                    inline: false
                }
            )
            .setFooter({
                text: "Xem thêm chi tiết",
                // iconURL: "https://cdn-icons-png.flaticon.com/512/2693/2693334.png"
                // iconURL
            })
            .setTimestamp();

        // Thêm extended nếu có
        // if (extendedInfo) {
        //     embed.addFields({
        //         name: "📖 Chi tiết bổ sung",
        //         value: extendedInfo,
        //         inline: false
        //     });
        // }

        return {
            success: true,
            message: {
                embeds: [embed],
                // components: [
                //     new ActionRowBuilder().addComponents(
                //         new ButtonBuilder()
                //             .setCustomId("view_more_info")
                //             .setLabel("Xem thêm chi tiết")
                //             .setStyle("Primary")
                //             .setEmoji("📚")
                //     )
                // ]
            }
        };
    }


    static getCalendarBeautifulString(yy, mm, timeZone = 7) {
    const lunarData = getMonthLunarCalendar(yy, mm, timeZone);
    const monthNames = ["❄️ **THÁNG 1**", "🌸 **THÁNG 2**", "🌱 **THÁNG 3**", "☀️ **THÁNG 4**", 
                       "🌺 **THÁNG 5**", "🌧️ **THÁNG 6**", "🌞 **THÁNG 7**", "🍂 **THÁNG 8**", 
                       "🌕 **THÁNG 9**", "🍁 **THÁNG 10**", "❄️ **THÁNG 11**", "🎄 **THÁNG 12**"];
    
    // Tiêu đề với định dạng đẹp
    let result = `## 📅 **|| LỊCH ${monthNames[mm-1]} NĂM ${yy} ||**\n`;
    result += "```ansi\n";
    
    // Xác định ngày đầu tháng
    const firstDate = new Date(yy, mm - 1, 1);
    const startDay = firstDate.getDay();
    
    // Tên các ngày trong tuần với định dạng đẹp
    const weekDays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    result += weekDays.map(d => d.padEnd(10)).join("") + "\n";
    result += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    
    // Tạo lưới lịch 6x7
    const totalCells = 42;
    const calendarGrid = Array(totalCells).fill("          ");
    
    // Tìm ngày hôm nay
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === yy && today.getMonth() + 1 === mm;
    
    // Điền ngày vào lưới với định dạng đặc biệt
    for (let i = 0; i < lunarData.length; i++) {
        const dayData = lunarData[i];
        const position = startDay + i;
        
        const solarDay = dayData.solar.day.toString().padStart(2, '0');
        const lunarDay = dayData.lunarDay.toString().padStart(2, '0');
        
        // Kiểm tra có phải ngày hôm nay không
        const isToday = isCurrentMonth && dayData.solar.day === today.getDate();
        
        let cellContent;
        
        // Định dạng đặc biệt cho các loại ngày
        if (dayData.lunarDay === 1) { // MÙNG 1
            cellContent = `🟡${solarDay}/${lunarDay}`;
        } else if (dayData.lunarDay === 15) { // RẰM
            cellContent = `🔴${solarDay}/${lunarDay}`;
        } else if (dayData.lunarDay === 10 || dayData.lunarDay === 20) { // Ngày tròn chục
            cellContent = `${solarDay}/${lunarDay}`;
        } else if (isToday) { // HÔM NAY
            cellContent = `🔵${solarDay}/${lunarDay}`;
        } else {
            cellContent = `${solarDay}/${lunarDay}`;
        }
        
        calendarGrid[position] = cellContent.padEnd(10);
    }
    
    // In lịch theo tuần
    for (let week = 0; week < 6; week++) {
        let weekLine = "";
        for (let day = 0; day < 7; day++) {
            const index = week * 7 + day;
            weekLine += calendarGrid[index];
        }
        result += weekLine + "\n";
        
        // Thêm dòng phân cách giữa các tuần
        if (week < 5) {
            result += "────────────────────────────────────────────\n";
        }
    }
    
    result += "```\n";
    
    // Tạo chú thích với biểu tượng
    result += "\n 📌 CHÚ THÍCH:\n";
    result += "> 🔵 Ngày hiện tại\n";
    result += "> 🟡 Mùng 1 (bấm để xem)\n";
    result += "> 🔴 Rằm (bấm để xem)\n";
    result += "> Ngày thường\n";
    
    // Thông tin tháng âm
    if (lunarData.length > 0) {
        const firstDay = lunarData[0];
        const midDay = lunarData[14]; // Ngày giữa tháng
        const lastDay = lunarData[lunarData.length - 1];
        
        result += "\n 🌙 **THÔNG TIN THÁNG:**\n";
        result += `**Tháng âm:** ${firstDay.lunarMonth}${firstDay.isLeap ? " (tháng nhuận)🔄" : ""}\n`;
        result += `**Đầu tháng:** ${firstDay.canChiDay} - **${firstDay.lucDieu}**\n`;
        result += `**Giữa tháng:** ${midDay.canChiDay} - **${midDay.lucDieu}**\n`;
        result += `**Cuối tháng:** ${lastDay.canChiDay} - **${lastDay.lucDieu}**\n`;
    }
    
    // Các ngày đặc biệt trong tháng
    const specialDays = lunarData.filter(day => 
        day.lunarDay === 1 || day.lunarDay === 15 || 
        day.lunarDay === 10 || day.lunarDay === 20
    );
    
    if (specialDays.length > 0) {
        result += "\n## ⭐ **NGÀY QUAN TRỌNG:**\n";
        specialDays.forEach(day => {
            let emoji = "";
            if (day.lunarDay === 1) emoji = "🟡";
            else if (day.lunarDay === 15) emoji = "🔴";
            else if (day.lunarDay === 10 || day.lunarDay === 20) emoji = "⚪";
            
            const todayMark = isCurrentMonth && day.solar.day === today.getDate() ? " **📍HÔM NAY**" : "";
            result += `> ${emoji} **${day.solar.day}/${mm}** - ${day.canChiDay}${todayMark}\n`;
        });
    }
    
    // Footer với hiệu ứng
    result += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    result += `||*Lịch được tạo tự động - Múi giờ GMT+${timeZone}*||\n`;
    result += "||**Nhấn vào biểu tượng để xem chi tiết**||";
    
    return result;
}

}

module.exports = LunarCalendarController;