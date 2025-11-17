

const cron = require("node-cron");
const Giveaway = require("../models/Giveaway");
const GiveawayService = require("../services/giveawayService");
const GiveawayController = require("../controllers/giveawayController");
class ScheduleGA {
    static async scheduleAutoDelete(client) {
        console.log("🔄 Đang tải danh sách giveaway để tự lên lịch...");

        // Tìm GA đang active hoặc approved (đang chạy)
        const giveaways = await Giveaway.find({
            status: { $in: ["approved", "active"] }
        });

        if (!giveaways.length) {
            return console.log("✔ Không có giveaway nào cần lên lịch.");
        }

        console.log(`📌 Có ${giveaways.length} giveaway sẽ được lên lịch.`);

        for (const ga of giveaways) {
            // Nếu chưa approvedAt → chưa bắt đầu → bỏ qua
            if (!ga.approvedAt) {
                console.log(`⏭ GA ${ga._id} chưa duyệt (approvedAt null), bỏ qua.`);
                continue;
            }

            const endTime = ga.endTime; // Virtual field từ schema

            if (!endTime) {
                console.log(`⚠ GA ${ga._id} không có endTime, bỏ qua.`);
                continue;
            }

            // Nếu thời gian đã hết nhưng GA chưa end → end ngay
            if (Date.now() >= endTime.getTime()) {
                console.log(`⏳ GA ${ga._id} đã hết hạn → kết thúc ngay.`);
                const guild = client.guilds.cache.get(ga.guildId);
                console.log(guild)
                if (guild)
                    await this.autoEnd(ga._id, guild);
                continue;
            }

            // Còn thời gian → schedule
            this.scheduleAutoEnd(ga, client.guilds.cache.get(ga.guildId));
        }
    }

    static scheduleAutoEnd(giveaway, guild) {
        console.log("🔥 scheduleAutoEnd được gọi!");
        console.log("Dữ liệu nhận:", giveaway);

        const end = new Date(giveaway.approvedAt.getTime() + giveaway.duration * 1000);
        // giveaway.duration *

        console.log("🕒 Thời gian end:", end.toLocaleString("vi-VN"));

        const minute = end.getMinutes();
        const hour = end.getHours();
        const day = end.getDate();
        const month = end.getMonth() + 1;

        const cronExpr = `${minute} ${hour} ${day} ${month} *`;

        console.log(`📅 [Giveaway] Lên lịch tự kết thúc cho ID ${giveaway._id} lúc ${end.toLocaleString('vi-VN')} (cron: ${cronExpr})`);

        const cron = require('node-cron');
        cron.schedule(cronExpr, async () => {
            console.log(`⏰ [Giveaway] Đang tự kết thúc giveaway ${giveaway._id}`);
            await this.autoEnd(giveaway._id, guild);
        }, {
            scheduled: true,
            timezone: "Asia/Ho_Chi_Minh"
        });
    }
    /**
     * 🚫 Kết thúc giveaway
     */
    static async autoEnd(giveawayId, guild) {
        const ga = await Giveaway.findById(giveawayId);
        if (!ga) return console.log(`❌ GA ${giveawayId} không tồn tại`);
        if (["cancelled", "ended", "rejected"].includes(ga.status)) return;

        console.log(`🎯 AutoEnd → Kết thúc GA ${giveawayId}`);

        const result = await GiveawayService.endGiveaway(giveawayId);

        const config = await GiveawayService.getGuildConfig(ga.guildId);
        if (!config || !config.gaResChannelId) return;

        const channel = guild.channels.cache.get(config.gaResChannelId);
        if (!channel) return;

        const resultEmbed = GiveawayController.createResultEmbed(result.data, result.winners);
        const resultButtons = GiveawayController.createGiveawayButtons(result.data);

        await channel.send({
            embeds: [resultEmbed],
            components: resultButtons.components.length ? [resultButtons] : []
        });
    }
}
module.exports = ScheduleGA