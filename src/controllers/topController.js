const { EmbedBuilder } = require("discord.js");
const User = require("../models/User");
const UserStreak = require("../models/userStreak");

class TopController {
    static async handleTopCommand(interactionOrMessage, args, isSlash = false, client) {
        try {
            const options = this.parseOptions(interactionOrMessage, args, isSlash);
            if (!options) return;

            const { scope, type, user } = options;
            const guildId = isSlash ? interactionOrMessage.guildId : (interactionOrMessage.guild ? interactionOrMessage.guild.id : null);

            // Lấy dữ liệu top - streak cần xử lý riêng
            let topData;
            if (type === 'streak') {
                topData = await this.getStreakTopData(scope, 10, user.id, guildId, client);
            } else {
                topData = await this.getTopData(scope, type, 10, user.id, guildId, client);
            }

            if (!topData || topData.topUsers.length === 0) {
                return this.sendResponse(interactionOrMessage, {
                    content: '❌ Không có dữ liệu leaderboard!',
                }, isSlash);
            }

            // Tạo embed
            const embed = await this.createLeaderboardEmbed(client, topData, scope, type, user);

            return this.sendResponse(interactionOrMessage, { embeds: [embed] }, isSlash);

        } catch (error) {
            console.error('Error in handleTopCommand:', error);
            return this.sendResponse(interactionOrMessage, {
                content: '❌ Đã có lỗi xảy ra khi lấy leaderboard!',
            }, isSlash);
        }
    }

    // Phân tích options từ command - THÊM STREAK
    static parseOptions(interactionOrMessage, args, isSlash) {
        let scope = 'global'; // global hoặc guild
        let type = 'coin'; // coin, level, spirit, streak

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

    // Parse type từ string - THÊM STREAK
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
            case 'streak':
            case 'daily':
            case 'streaks':
                return 'streak';
            case 'coin':
            case 'coins':
            case 'money':
            default:
                return 'coin';
        }
    }

    // Lấy dữ liệu top cho streak (PHƯƠNG THỨC MỚI)
    static async getStreakTopData(scope, limit = 10, userId = null, guildId = null, client) {
        const query = scope === 'guild' ? await this.getGuildStreakQuery(guildId, client) : {};

        // Lấy top users theo currentStreak
        const topUsers = await UserStreak
            .find(query)
            .sort({ currentStreak: -1, longestStreak: -1, totalDaysJoined: -1 })
            .limit(limit)
            .select('userId currentStreak longestStreak totalDaysJoined')
            .lean();

        // Lấy rank của user hiện tại (nếu có)
        let userRank = null;
        let userData = null;

        if (userId) {
            userRank = await this.getUserStreakRank(userId, query);
            if (userRank > limit) {
                userData = await UserStreak
                    .findOne({ userId, ...query })
                    .select('userId currentStreak longestStreak totalDaysJoined')
                    .lean();
            }
        }

        return { 
            topUsers, 
            userRank, 
            userData, 
            totalUsers: await UserStreak.countDocuments(query) 
        };
    }

    // Tạo query cho guild streak (PHƯƠNG THỨC MỚI)
    static async getGuildStreakQuery(guildId, client) {
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

            return { 
                userId: { $in: memberIds },
                guildId: guildId // Thêm điều kiện guildId
            };

        } catch (error) {
            console.error('Lỗi khi lấy guild streak query:', error);
            return { userId: null };
        }
    }

    // Lấy rank của user cho streak (PHƯƠNG THỨC MỚI)
    static async getUserStreakRank(userId, query = {}) {
        const userStreak = await UserStreak.findOne({ userId, ...query }).lean();
        if (!userStreak) return null;

        const higherCount = await UserStreak.countDocuments({
            ...query,
            $or: [
                { currentStreak: { $gt: userStreak.currentStreak } },
                { 
                    currentStreak: userStreak.currentStreak,
                    longestStreak: { $gt: userStreak.longestStreak }
                },
                {
                    currentStreak: userStreak.currentStreak,
                    longestStreak: userStreak.longestStreak,
                    totalDaysJoined: { $gt: userStreak.totalDaysJoined }
                }
            ]
        });

        return higherCount + 1;
    }

    // Lấy dữ liệu top cho các type khác (GIỮ NGUYÊN)
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

    // Tạo query cho guild (GIỮ NGUYÊN)
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

    // Tiêu chí sắp xếp - THÊM STREAK
    static getSortCriteria(type) {
        switch (type) {
            case 'level':
                return { lvl: -1, exp: -1 };
            case 'spirit':
                return { spiritLvl: -1, spiritExp: -1 };
            case 'streak':
                return { currentStreak: -1, longestStreak: -1 };
            case 'coin':
            default:
                return { coin: -1 };
        }
    }

    // Lấy rank của user - THÊM STREAK
    static async getUserRank(userId, type, query = {}) {
        const user = await User.findOne({ userId }).lean();
        if (!user) return null;

        const higherCount = await User.countDocuments({
            ...query,
            ...this.getHigherRankCondition(user, type)
        });

        return higherCount + 1;
    }

    // Điều kiện để tìm người có rank cao hơn - THÊM STREAK
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
            case 'streak':
                return {
                    $or: [
                        { currentStreak: { $gt: user.currentStreak } },
                        { currentStreak: user.currentStreak, longestStreak: { $gt: user.longestStreak } }
                    ]
                };
            case 'coin':
            default:
                return { coin: { $gt: user.coin } };
        }
    }

    // Tạo embed leaderboard - CẬP NHẬT CHO STREAK
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

    // Thông tin type - THÊM STREAK
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
            case 'streak':
                return {
                    name: 'STREAK',
                    description: 'Xếp hạng theo Current Streak (nếu cùng thì so Longest Streak)'
                };
            case 'coin':
            default:
                return {
                    name: 'COIN',
                    description: 'Xếp hạng theo số Coin'
                };
        }
    }

    // Lấy medal/huy chương (GIỮ NGUYÊN)
    static getMedal(rank) {
        switch (rank) {
            case 1: return '<a:yellowarr:1433016945589882891><a:crownyellow:1433016964665708574>';
            case 2: return '<a:arroworange:1433016960458948629><a:crownorange:1433016951072100473>:1433017016398123058>';
            case 3: return '<a:arrowpink:1433016973519880265><a:pinkcrown:1433017014166880328>';
            default: return `**<a:arrowpurple:1433017007103676446>${rank}.**`;
        }
    }

    // Hiển thị giá trị theo type - THÊM STREAK
    static getValueDisplay(userData, type) {
        switch (type) {
            case 'level':
                return `Level ${userData.lvl} (${userData.exp.toLocaleString()} EXP)`;
            case 'spirit':
                return `Spirit Level ${userData.spiritLvl} (${userData.spiritExp.toLocaleString()} EXP)`;
            case 'streak':
                return `<a:fire2:1433091789044318332> ${userData.currentStreak} ngày (Cao nhất: ${userData.longestStreak})`;
            case 'coin':
            default:
                return `${userData.coin.toLocaleString()} coin`;
        }
    }

    // Gửi response (GIỮ NGUYÊN)
    static async sendResponse(interactionOrMessage, response, isSlash = false) {
        console.log('Sending response:', response);

        if (isSlash) {
            if (interactionOrMessage.deferred || interactionOrMessage.replied) {
                return await interactionOrMessage.followUp(response);
            } else {
                return await interactionOrMessage.reply(response);
            }
        } else {
            return await interactionOrMessage.reply(response);
        }
    }
}

module.exports = TopController;