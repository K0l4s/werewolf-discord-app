const { EmbedBuilder } = require("@discordjs/builders");
const Friend = require("../models/Friend");
const Inventory = require("../models/Inventory");
const ItemService = require("../services/itemService");
const Marry = require("../models/Marry");
const { ITEM_TYPE } = require("../config/constants");
const { Colors } = require("discord.js");


class FriendActionController {
    static async getFriendInfoEmbed(senderId, receiverId) {
        // tìm hoặc tạo friends
        let friends = await Friend.findOne({
            $or: [
                { user1: senderId, user2: receiverId },
                { user1: receiverId, user2: senderId }
            ]
        });

        if (!friends) {
            friends = await Friend.create({
                user1: senderId,
                user2: receiverId,
                friendPoint: 0,
                itemsCount: 0,
                last5Send: []
            });
        }
        const last5 = friends.last5Send && friends.last5Send.length > 0
            ? friends.last5Send
                .slice(-5)
                .reverse()
                .map((d, i) => `**${i + 1}.** <t:${Math.floor(d.getTime() / 1000)}:R>`)
                .join("\n")
            : "_Chưa có lịch sử tặng quà_";

        const embed = new EmbedBuilder()
            .setColor(Colors.DarkVividPink)
            .setTitle("💙 Thông Tin Tình Bạn")
            .addFields(
                {
                    name: "👫 Bạn",
                    value: `<@${senderId}> ↔️ <@${receiverId}>`,
                    inline: false
                },
                {
                    name: "🎁 Tổng quà đã tặng",
                    value: `${friends.itemsCount || 0}`,
                    inline: true
                },
                {
                    name: "💎 Friend Point",
                    value: `${friends.friendPoint || 0}`,
                    inline: true
                },
                {
                    name: "🕒 5 lần tặng gần nhất",
                    value: last5,
                    inline: false
                }
            )
            .setTimestamp();

        return { embeds: [embed] };
    }
    static async sendGift(senderId, receiverId, itemRef, quantity = 1) {
        try {
            // Giới hạn số lượng tối đa 10 (nhẫn thì quantity = 1)
            const quan = Math.min(parseInt(quantity) || 1, 10);

            const item = await ItemService.getItemByRef(itemRef);
            if (!item) throw new Error("Not found item!");

            // ====== CHECK RING LOGIC ======
            const isRing = item.type === ITEM_TYPE.RING;
            // tìm hoặc tạo friends
            let friends = await Friend.findOne({
                $or: [
                    { user1: senderId, user2: receiverId },
                    { user1: receiverId, user2: senderId }
                ]
            });

            if (!friends) {
                friends = await Friend.create({
                    user1: senderId,
                    user2: receiverId,
                    friendPoint: 0,
                    itemsCount: 0,
                    last5Send: []
                });
            }

            // đảm bảo last5Send là mảng
            const last5 = Array.isArray(friends.last5Send) ? friends.last5Send : [];

            // chuyển mọi entry thành timestamp (ms)
            const now = Date.now();
            const ONE_DAY = 24 * 60 * 60 * 1000;
            const recent = last5
                .map(ts => {
                    // ts có thể là Date object hoặc string
                    const t = (ts instanceof Date) ? ts.getTime() : new Date(ts).getTime();
                    return Number.isNaN(t) ? null : t;
                })
                .filter(t => t && now - t < ONE_DAY);

            // nếu >=5 => block
            if (recent.length >= 5) {
                throw new Error("You can only send up to 5 gifts to this user within 24 hours.");
            }

            // push thời điểm mới (dùng $slice: -5 để giữ 5 phần tử gần nhất)
            await Friend.findByIdAndUpdate(friends._id, {
                $push: {
                    last5Send: {
                        $each: [new Date()],
                        $slice: -5
                    }
                }
            });


            // Tìm hôn nhân
            let marry = await Marry.findOne({
                $or: [
                    { senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            });

            const isMarry = !!marry;

            // Nếu là nhẫn mà chưa cưới → cấm
            if (isRing && !isMarry) {
                throw new Error("You cannot gift a ring unless you are married!");
            }

            // Nếu là nhẫn → quantity luôn = 1
            if (isRing && quan > 1) quan = 1;



            // ====== UPDATE FRIEND POINT (nhẫn không tăng friendPoint) ======
            if (!isRing) {
                await Friend.findByIdAndUpdate(friends._id, {
                    $inc: {
                        itemsCount: quan,
                        friendPoint: item.point * quan
                    }
                });
            }

            // ====== UPDATE MARRY (nếu có) ======
            if (isMarry) {
                let update = {
                    $inc: { lovePoint: item.point * quan / 2 }
                };

                // Nếu là nhẫn → lưu vào rings
                if (isRing) {
                    update.$push = {
                        rings: {
                            ring: item._id,
                            giftDate: Date.now(),
                            quantity: quan
                        }
                    };
                }

                await Marry.findByIdAndUpdate(marry._id, update);
            }

            // ====== CHECK INVENTORY OF SENDER ======
            const inv = await Inventory.findOne({ userId: senderId, item: item._id });

            if (!inv || inv.quantity < quan)
                throw new Error(`You need at least **${quan} ${item.name}**!`);

            // Trừ vật phẩm của sender
            if (inv.quantity - quan <= 0)
                await Inventory.findByIdAndDelete(inv._id);
            else
                await Inventory.findByIdAndUpdate(inv._id, { $inc: { quantity: -quan } });

            // ====== GIVE ITEM TO RECEIVER ======
            if (item.type != ITEM_TYPE.RING) {
                let receInv = await Inventory.findOne({ userId: receiverId, item: item._id });

                if (!receInv) {
                    receInv = await Inventory.create({
                        userId: receiverId,
                        item: item._id,
                        quantity: quan
                    });
                } else {
                    await Inventory.findByIdAndUpdate(receInv._id, {
                        $inc: { quantity: quan }
                    });
                }
            }

            const embed = new EmbedBuilder()
                .setTitle("Send Gift Success!")
                .setDescription(
                    isRing
                        ? `<@${senderId}> gifted a **${item.icon} ${item.name}** to <@${receiverId}>. \n Increase their love point index by ${item.point * quan / 2} point.`
                        : `<@${senderId}> sent **${quan} ${item.icon} ${item.name}** to <@${receiverId}> \n Increase their friends point index by ${item.point * quan} point.`
                )
                .setColor(isRing ? Colors.Fuchsia : Colors.Green);

            return {
                success: true,
                message: { embeds: [embed] }
            };

        } catch (e) {
            return {
                success: false,
                message: e.message
            };
        }
    }


}

module.exports = FriendActionController;