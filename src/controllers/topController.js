const { EmbedBuilder } = require("discord.js");
const User = require("../models/User");

class TopController {
    static async handleTopCommand(interactionOrMessage, args, isSlash = false, client) {
        try {
            const options = this.parseOptions(interactionOrMessage, args, isSlash);
            if (!options) return;

            const { scope, type, user } = options;
            const guildId = isSlash ? interactionOrMessage.guildId : (interactionOrMessage.guild ? interactionOrMessage.guild.id : null);
            // Lấy dữ liệu top
            const topData = await this.getTopData(scope, type, 10, user.id, guildId, client);
            if (!topData || topData.topUsers.length === 0) {
                return this.sendResponse(interactionOrMessage, {
                    content: '❌ Không có dữ liệu leaderboard!',
                    isSlash
                });
            }

            // Tạo embed
            const embed = await this.createLeaderboardEmbed(client, topData, scope, type, user);

            return this.sendResponse(interactionOrMessage, { embeds: [embed], isSlash });

        } catch (error) {
            console.error('Error in handleTopCommand:', error);
            return this.sendResponse(interactionOrMessage, {
                content: '❌ Đã có lỗi xảy ra khi lấy leaderboard!',
                isSlash
            });
        }
    }

    // Phân tích options từ command
    static parseOptions(interactionOrMessage, args, isSlash) {
        let scope = 'global'; // global hoặc guild
        let type = 'coin'; // coin, level, spirit

        if (isSlash) {
            // Slash command
            scope = interactionOrMessage.options.getString('scope') || 'global';
            type = interactionOrMessage.options.getString('type') || 'coin';
            return { scope, type, user: interactionOrMessage.user };
        } else {
            // Prefix command (wtop)
            if (args.length >= 1) {
                const arg1 = args[0].toLowerCase();
                if (arg1 === 'guild' || arg1 === 'global') {
                    scope = arg1;
                    if (args.length >= 2) {
                        type = this.parseType(args[1]);
                    }
                } else {
                    type = this.parseType(arg1);
                    if (args.length >= 2 && (args[1] === 'guild' || args[1] === 'global')) {
                        scope = args[1];
                    }
                }
            }
            return { scope, type, user: interactionOrMessage.author };
        }
    }

    // Parse type từ string
    static parseType(typeStr) {
        switch (typeStr.toLowerCase()) {
            case 'level':
            case 'lvl':
            case 'exp':
                return 'level';
            case 'spirit':
            case 'spiritlvl':
            case 'spiritlevel':
                return 'spirit';
            case 'coin':
            case 'coins':
            case 'money':
            default:
                return 'coin';
        }
    }

    // Lấy dữ liệu top
    static async getTopData(scope, type, limit = 10, userId = null, guildId = null, client) {
        const sortCriteria = this.getSortCriteria(type);
        const query = scope === 'guild' ? await this.getGuildQuery(guildId, client) : {};

        // Lấy top users
        const topUsers = await User
            .find(query)
            .sort(sortCriteria)
            .limit(limit)
            .select('userId coin exp lvl spiritLvl spiritExp')
            .lean();

        // Lấy rank của user hiện tại (nếu có)
        let userRank = null;
        let userData = null;

        if (userId) {
            userRank = await this.getUserRank(userId, type, query);
            if (userRank > limit) {
                userData = await User
                    .findOne({ userId })
                    .select('userId coin exp lvl spiritLvl spiritExp')
                    .lean();
            }
        }

        return { topUsers, userRank, userData, totalUsers: await User.countDocuments(query) };
    }

    // Tạo query cho guild
    static async getGuildQuery(guildId, client) {
        try {
            if (!guildId) {
                console.log('Không có guildId được cung cấp');
                return { userId: null };
            }

            const guild = await client.guilds.fetch(guildId).catch(() => null);
            if (!guild) {
                console.log(`Không tìm thấy guild với ID: ${guildId}`);
                return { userId: null };
            }

            // Lấy tất cả members
            const members = await guild.members.fetch();
            const memberIds = members.map(member => member.id);

            console.log(`Tìm thấy ${memberIds.length} members trong guild: ${guild.name}`);

            return { userId: { $in: memberIds } };

        } catch (error) {
            console.error('Lỗi khi lấy guild query:', error);
            return { userId: null };
        }
    }


    // Lấy members trong guild
    // static async getGuildMembers(guildId, client) {
    //     try {
    //         const guild = await client.guilds.fetch(guildId);
    //         const members = await guild.members.fetch();
    //         return members.map(member => member.id);
    //     } catch (error) {
    //         console.error('Lỗi khi lấy guild members:', error);
    //         return [];
    //     }
    // }

    // Tiêu chí sắp xếp
    static getSortCriteria(type) {
        switch (type) {
            case 'level':
                return { lvl: -1, exp: -1 };
            case 'spirit':
                return { spiritLvl: -1, spiritExp: -1 };
            case 'coin':
            default:
                return { coin: -1 };
        }
    }

    // Lấy rank của user
    static async getUserRank(userId, type, query = {}) {
        const user = await User.findOne({ userId }).lean();
        if (!user) return null;

        const higherCount = await User.countDocuments({
            ...query,
            ...this.getHigherRankCondition(user, type)
        });

        return higherCount + 1;
    }

    // Điều kiện để tìm người có rank cao hơn
    static getHigherRankCondition(user, type) {
        switch (type) {
            case 'level':
                return {
                    $or: [
                        { lvl: { $gt: user.lvl } },
                        { lvl: user.lvl, exp: { $gt: user.exp } }
                    ]
                };
            case 'spirit':
                return {
                    $or: [
                        { spiritLvl: { $gt: user.spiritLvl } },
                        { spiritLvl: user.spiritLvl, spiritExp: { $gt: user.spiritExp } }
                    ]
                };
            case 'coin':
            default:
                return { coin: { $gt: user.coin } };
        }
    }

    // Tạo embed leaderboard
    static async createLeaderboardEmbed(client, topData, scope, type, user) {
        const { topUsers, userRank, userData, totalUsers } = topData;

        const embed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle(`🏆 LEADERBOARD - ${scope.toUpperCase()}`)
            .setTimestamp();

        const typeInfo = this.getTypeInfo(type);
        embed.setDescription(`**Top ${typeInfo.name}**\n*${typeInfo.description}*`);

        // Fetch user info song song
        const leaderboardLines = await Promise.all(
            topUsers.map(async (uData, index) => {
                const rank = index + 1;
                const medal = this.getMedal(rank);

                const fetchedUser = await client.users.fetch(uData.userId).catch(() => null);

                const userDisplay = fetchedUser
                    ? (fetchedUser.globalName
                        ? `${fetchedUser.globalName} (${fetchedUser.username})`
                        : fetchedUser.username)
                    : `Unknown (${uData.userId})`;

                const value = this.getValueDisplay(uData, type);

                return `${medal} **${userDisplay}** - ${value}`;
            })
        );

        embed.addFields({
            name: `Top 10 ${scope === 'global' ? 'Thế Giới' : 'Server'}`,
            value: leaderboardLines.join("\n") || 'Không có dữ liệu'
        });

        // Rank của user nếu ngoài top 10
        if (userRank > 10) {
            const userValue = this.getValueDisplay(userData, type);

            const displayName = user.globalName
                ? `${user.globalName} (${user.username})`
                : user.username;

            embed.addFields({
                name: 'Rank của bạn',
                value: `...\n**${userRank}.** ${displayName} - ${userValue}`,
                inline: false
            });
        } else if (userRank) {
            embed.setFooter({
                text: `Bạn đang xếp hạng ${userRank}/${totalUsers}`
            });
        }

        embed.setFooter({
            text: `Tổng số người dùng: ${totalUsers} • ${scope === 'global' ? 'Toàn bộ hệ thống' : 'Trong server này'}`
        });

        return embed;
    }


    // Thông tin type
    static getTypeInfo(type) {
        switch (type) {
            case 'level':
                return {
                    name: 'LEVEL',
                    description: 'Xếp hạng theo Level (nếu cùng Level thì so EXP)'
                };
            case 'spirit':
                return {
                    name: 'SPIRIT LEVEL',
                    description: 'Xếp hạng theo Spirit Level (nếu cùng Level thì so Spirit EXP)'
                };
            case 'coin':
            default:
                return {
                    name: 'COIN',
                    description: 'Xếp hạng theo số Coin'
                };
        }
    }

    // Lấy medal/huy chương
    static getMedal(rank) {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `**${rank}.**`;
        }
    }

    // Hiển thị giá trị theo type
    static getValueDisplay(userData, type) {
        switch (type) {
            case 'level':
                return `Level ${userData.lvl} (${userData.exp.toLocaleString()} EXP)`;
            case 'spirit':
                return `Spirit Level ${userData.spiritLvl} (${userData.spiritExp.toLocaleString()} EXP)`;
            case 'coin':
            default:
                return `${userData.coin.toLocaleString()} coin`;
        }
    }

    // Gửi response
    static async sendResponse(interactionOrMessage, response, isSlash) {
        if (isSlash) {
            if (interactionOrMessage.deferred || interactionOrMessage.replied) {
                return await interactionOrMessage.editReply(response);
            } else {
                return await interactionOrMessage.reply(response);
            }
        } else {
            return await interactionOrMessage.reply(response);
        }
    }
}
module.exports = TopController;