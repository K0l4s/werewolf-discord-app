const Marry = require("../models/Marry");
const ItemService = require("../services/itemService");
const UserService = require("../services/userService");
const Inventory = require("../models/Inventory");
const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require("discord.js");
const { ITEM_TYPE } = require("../config/constants");
const Item = require("../models/Item");


class MarryController {
    static async acceptMarry(userId, targetId, ringId, client) {
        try {
            // Kiểm tra ring có tồn tại không
            const ring = await Item.findById(ringId);
            if (!ring) throw new Error("Không tìm thấy nhẫn cưới!");

            if (ring.type !== ITEM_TYPE.RING) {
                throw new Error("Vật phẩm không phải nhẫn cưới!");
            }

            // Tính lovePoint dựa trên độ hiếm
            const RARITY_POINT = {
                'Common': 10,
                'Super Common': 20,
                'Rare': 30,
                'Super Rare': 50,
                'Epic': 70,
                'Super Epic': 90,
                'Legendary': 100,
                'Super Legendary': 150,
                'Mythic': 200,
                'Super Mythic': 250
            };

            const lovePoint = RARITY_POINT[ring.rarity] || 0;

            // Tạo record Marry
            const marry = await Marry.create({
                senderId: userId,
                receiverId: targetId,
                rings: [ringId],
                lovePoint: lovePoint
            });

            // return newMarry;
            const embed = new EmbedBuilder()
                .setTitle("💍 Mang ngay lễ đường đến đây!")
                .setColor(0xff69b4)
                .addFields(
                    { name: "🤵 Cầu hôn bởi", value: `<@${marry.senderId}>`, inline: true },
                    { name: "👰 Đồng ý bởi", value: `<@${marry.receiverId}>`, inline: true },
                    // { name: "🌐 Server", value: `${marry.serverName || "Server không xác định"}`, inline: true },
                    { name: "💖 Love Point", value: `${marry.lovePoint}`, inline: true },
                    { name: "📅 Ngày thành hôn", value: `<t:${Math.floor(new Date(marry.marryDate).getTime() / 1000)}:F>`, inline: true },
                )
                .setThumbnail("https://genk.mediacdn.vn/zoom/700_438/2016/8274-3d773b5ce67533d1b5b52d9b57936860-orig-1455733255496-crop-1455733285857.gif") // tùy chọn ảnh minh họa
                .setFooter({ text: "Keldo Chúc hai bạn trăm năm hạnh phúc!" })
                .setTimestamp();
            return { embeds: [embed] }
        }
        catch (err) {
            console.error(err);
            throw err;
            // return err.message;
        }
    }
    static async marry(userId, targetId, ringRef, client) {
        try {

            if (userId == targetId) {
                const randomBad = [
                    "Nè, dù trên thế giới có 7 tỷ người thì bạn vẫn chẳng tìm thấy nửa kia sao?",
                    "Tự cưới mình luôn? Tự yêu bản thân là tốt, nhưng cái này thì hơi quá rồi đó.",
                    "Bạn định tự đọc lời thề rồi tự trả lời luôn à? Tốc độ hơi nhanh đó!",
                    "Hôn lễ tự phục vụ: Bạn tự trao nhẫn, tự hôn, tự cảm động. Hoàn hảo luôn!",
                    "Tự cưới mình cũng được, nhưng ai cầm máy quay giùm bạn đây?",
                    "Bạn có chắc là mình không bị từ chối đến mức phải chọn chính mình không?",
                    "Tôi hiểu bạn cô đơn, nhưng level này hơi lạ đó nha.",
                    "Bạn vừa tặng nhẫn, vừa nhận nhẫn… tiết kiệm ghê ha?",
                    "Chọn người khác đi bạn, chứ game này không hỗ trợ hôn nhân tự thân đâu.",
                    "Cưới mình để dễ kiểm soát tài sản chung đúng không?",
                    "Trò chơi gọi đây là 'tự kỷ luật tình cảm', không khuyến cáo dùng.",
                    "Bạn đẹp thật, nhưng đẹp tới mức tự cưới thì hơi nhiều.",
                    "Cưới mình thì khỏi cãi nhau… nhưng cũng hơi buồn á.",
                    "Bạn đang cố nâng chỉ số hạnh phúc cá nhân bằng cách này hả?",
                    "Đồng ý rồi từ chối, rồi tự an ủi… bạn muốn chơi một mình ba vai luôn đúng không?"
                ];

                const badQ = randomBad[Math.floor(Math.random() * randomBad.length)];
                throw new Error(badQ)
            }
            const existed = await Marry.findOne({
                $or: [
                    { senderId: userId },
                    { receiverId: targetId },
                    { senderId: userId },
                    { receiverId: targetId }
                ]
            });

            if (existed) {
                return new Error("Một người chỉ được cưới 1 lần!");
            }
            const item = await ItemService.getItemByRef(ringRef);
            if (!item)
                throw new Error("Not found ring");
            if (!item.type === ITEM_TYPE.RING)
                throw new Error("Hmm. Đem lộn đồ cầu hôn kìa cha!")
            console.log(item)
            const inv = await Inventory.findOne({ userId, item: item._id });
            // if()

            console.log(inv)
            if (!inv || inv.quantity < 2)
                throw new Error("You need **two ring** for marry him/ her!")
            if (inv.quantity === 2) {
                await Inventory.findByIdAndDelete(inv._id);
            } else {
                await Inventory.findByIdAndUpdate(inv._id, { $inc: { quantity: -2 } });
            }
            const acceptButton = new ButtonBuilder()
                .setCustomId(`marry|accept|${userId}|${targetId}|${item._id}`)
                .setEmoji(item.icon)
                .setLabel("Chấp nhận kết hôn")
                .setStyle(ButtonStyle.Success)

            const denyButton = new ButtonBuilder()
                .setCustomId(`marry|deny|${userId}|${targetId}|${item._id}`)
                .setEmoji("<a:arrowred:1433017009863524474>")
                .setLabel("Từ chối kết hôn")
                .setStyle(ButtonStyle.Danger)

            const row = new ActionRowBuilder().addComponents(acceptButton, denyButton)
            const user = await client.users.fetch(targetId)
            const name = user?.globalName || "Không xác định"
            const randomDes = [
                "Câu chuyện của hai ta bắt đầu lúc lập đông, cậu sẽ chấp nhận kết hôn với tôi chứ?",
                "Cậu và tôi sinh ra là giành cho nhau, cậu sẽ chấp nhận làm nửa kia của tôi chứ?",
                "Trái tim tôi đã nhấn follow cậu từ lâu rồi… cậu có thể follow lại tôi không?",
                "Tôi đã thử sống thiếu cậu một ngày… và nó tệ lắm. Cậu có thể ở lại bên tôi không?",
                "Nếu yêu cậu là sai… thì tôi nguyện sai cả đời. Cậu có đồng ý không?",
                "Tôi không cần cả thế giới hiểu tôi, tôi chỉ cần một mình cậu gật đầu mà thôi.",
                "Tôi đã suy nghĩ rất nhiều… và câu trả lời cuối cùng vẫn là: Tôi muốn ở bên cậu.",
                "Cậu có tin vào định mệnh không? Vì tôi nghĩ định mệnh đang kéo tôi về phía cậu.",
                "Có những điều không cần phải nói thành lời… nhưng với cậu, tôi muốn nói: Tôi thích cậu.",
                "Chỉ cần cậu gật đầu, tôi sẽ bước về phía cậu dù là bao xa.",
                "Cậu là người đầu tiên khiến tôi muốn cố gắng trở thành phiên bản tốt hơn.",
                "Nếu trái tim cậu lạc đường… thì nó có thể ở lại trong tôi.",
                "Gặp được cậu là điều đẹp nhất trong ngày của tôi, còn giữ được cậu… là ước mơ của tôi.",
                "Ngày mai liệu cậu có rảnh không? Tôi muốn đưa cậu vào tim tôi… chính thức.",
                "Từ khi gặp cậu, tôi đã không còn quan tâm hoàng hôn đẹp thế nào nữa… vì cậu đẹp hơn."
            ];

            const description = randomDes[Math.floor(Math.random() * randomDes.length)];
            const time = Math.floor((Date.now() + 60 * 60 * 1000) / 1000);

            const embed = new EmbedBuilder()
                .setTitle(`${name}, will you marry me?`)
                .setDescription(description)
                .setAuthor({
                    name: user.globalName,
                    iconURL: user.displayAvatarURL({ dynamic: true }),
                    url: `https://discord.com/users/${user.id}`
                })
                .addFields({
                    name: "Sử dụng",
                    value: `Bằng tất cả tâm tình <@${userId}> đã sử dụng cặp nhẫn ${item.icon} ${item.name} để cầu hôn <@${targetId}>`,
                    inline: false
                })
                .addFields({
                    name: "Chú ý",
                    value: `Lời cầu hôn sẽ hết hạn trong <t:${time}:R>`,
                    inline: true
                })
                .addFields({
                    name: "Chú ý",
                    value: `Nếu nửa kia **không đồng ý** thì 2 chiếc nhẫn sẽ tan vỡ!`
                })
                .setFooter({ text: "Keldo Bot - Marry Time!" })
            return {
                success: true,
                message: { embeds: [embed], components: [row] }
            }
        } catch (e) {
            return {
                success: false,
                message: e.message
            }
        }

    }

    //   if (inv.quantity === 2) {
    //             await Inventory.findByIdAndDelete(inv._id);
    //         } else {
    //             await Inventory.findByIdAndUpdate(inv._id, { $inc: { quantity: -2 } });
    //         }

    //         const Marr
}

module.exports = MarryController;