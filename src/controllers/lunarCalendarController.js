const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { getExtendedLunarInfo } = require("../utils/lunar");

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




}

module.exports = LunarCalendarController;