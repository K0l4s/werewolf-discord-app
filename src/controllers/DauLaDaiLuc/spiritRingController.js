const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const SpiritRing = require("../../models/DauLaDaiLuc/SpiritRing");

class SpiritRingController {
    static async getSpiritRingsEmbed(userId, page = 1, sortBy = 'years', rangeFilter = 'all') {
        try {
            // Xây dựng query và sort options
            let query = { userId };
            let sortOptions = {};

            // Áp dụng filter theo range niên đại
            if (rangeFilter !== 'all') {
                switch (rangeFilter) {
                    case 'range1':
                        query.years = { $gte: 1, $lte: 99 };
                        break;
                    case 'range2':
                        query.years = { $gte: 100, $lte: 9999 };
                        break;
                    case 'range3':
                        query.years = { $gte: 10000, $lte: 99999 };
                        break;
                    case 'range4':
                        query.years = { $gte: 100000 };
                        break;
                }
            }

            // Thiết lập sort options
            switch (sortBy) {
                case 'years':
                    sortOptions = { years: -1 }; // Mặc định sort theo niên đại giảm dần
                    break;
                case 'hp':
                    sortOptions = { hp: -1 };
                    break;
                case 'atk':
                    sortOptions = { atk: -1 };
                    break;
                case 'def':
                    sortOptions = { def: -1 };
                    break;
                case 'sp':
                    sortOptions = { sp: -1 };
                    break;
                default:
                    sortOptions = { years: -1 };
            }

            // Tính toán phân trang
            const itemsPerPage = 5;
            const skip = (page - 1) * itemsPerPage;

            // Lấy dữ liệu từ database
            const rings = await SpiritRing.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(itemsPerPage);

            const totalItems = await SpiritRing.countDocuments(query);
            const totalPages = Math.ceil(totalItems / itemsPerPage);

            // Nếu không có hồn hoàn nào
            if (rings.length === 0) {
                const noRingsEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('Danh sách Hồn Hoàn')
                    .setDescription('Người dùng này không có hồn hoàn nào.')
                    .setTimestamp();

                return { embeds: [noRingsEmbed], components: [] };
            }

            // Tạo embed
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`Danh sách Hồn Hoàn - Trang ${page}/${totalPages}`)
                .setDescription(`Hiển thị ${rings.length} trên tổng số ${totalItems} hồn hoàn`)
                .setTimestamp();

            // Thêm thông tin từng hồn hoàn vào embed
            rings.forEach((ring, index) => {
                const position = skip + index + 1;
                embed.addFields({
                    name: `#${position} - ${ring.ringRef} Hồn Hoàn ${ring.icon} ${ring.years.toLocaleString("en-US")} năm`,
                    value: `**HP:** ${ring.hp.toLocaleString("en-US")} | **ATK:** ${ring.atk.toLocaleString("en-US")} | **DEF:** ${ring.def.toLocaleString("en-US")} | **SP:** ${ring.sp.toLocaleString("en-US")}\n**Trạng thái:** ${ring.isAttach ? 'Đã gắn' : 'Chưa gắn'}`,
                    inline: false
                });
            });

            // Tạo các components (buttons và select menus)
            const components = [];

            // Tạo select menu để sort
            const sortSelect = new StringSelectMenuBuilder()
                .setCustomId(`spirit_rings_sort_${userId}`)
                .setPlaceholder('Sắp xếp theo...')
                .addOptions([
                    {
                        label: 'Niên đại (cao nhất)',
                        value: 'years',
                        description: 'Sắp xếp theo niên đại giảm dần',
                        default: sortBy === 'years'
                    },
                    {
                        label: 'HP (cao nhất)',
                        value: 'hp',
                        description: 'Sắp xếp theo HP giảm dần',
                        default: sortBy === 'hp'
                    },
                    {
                        label: 'ATK (cao nhất)',
                        value: 'atk',
                        description: 'Sắp xếp theo ATK giảm dần',
                        default: sortBy === 'atk'
                    },
                    {
                        label: 'DEF (cao nhất)',
                        value: 'def',
                        description: 'Sắp xếp theo DEF giảm dần',
                        default: sortBy === 'def'
                    },
                    {
                        label: 'SP (cao nhất)',
                        value: 'sp',
                        description: 'Sắp xếp theo SP giảm dần',
                        default: sortBy === 'sp'
                    }
                ]);

            // Tạo select menu để lọc theo range niên đại
            const rangeSelect = new StringSelectMenuBuilder()
                .setCustomId(`spirit_rings_range_${userId}`)
                .setPlaceholder('Lọc theo niên đại...')
                .addOptions([
                    {
                        label: 'Tất cả niên đại',
                        value: 'all',
                        description: 'Hiển thị tất cả hồn hoàn',
                        default: rangeFilter === 'all'
                    },
                    {
                        label: '1-99 năm',
                        value: 'range1',
                        description: 'Hồn hoàn 1-99 năm',
                        default: rangeFilter === 'range1'
                    },
                    {
                        label: '100-9999 năm',
                        value: 'range2',
                        description: 'Hồn hoàn 100-9999 năm',
                        default: rangeFilter === 'range2'
                    },
                    {
                        label: '10000-99999 năm',
                        value: 'range3',
                        description: 'Hồn hoàn 10000-99999 năm',
                        default: rangeFilter === 'range3'
                    },
                    {
                        label: 'Trên 100000 năm',
                        value: 'range4',
                        description: 'Hồn hoàn trên 100000 năm',
                        default: rangeFilter === 'range4'
                    }
                ]);

            // Tạo row cho select menus
            const selectRow = new ActionRowBuilder().addComponents(sortSelect);
            const rangeRow = new ActionRowBuilder().addComponents(rangeSelect);

            // Tạo buttons cho phân trang
            const buttons = [];

            // Nút về trang đầu
            if (page > 1) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`spirit_rings_first_${userId}`)
                        .setLabel('« Đầu')
                        .setStyle(ButtonStyle.Primary)
                );
            } else {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('spirit_rings_first_disabled')
                        .setLabel('« Đầu')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
            }

            // Nút trang trước
            if (page > 1) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`spirit_rings_prev_${page - 1}_${userId}`)
                        .setLabel('‹ Trước')
                        .setStyle(ButtonStyle.Primary)
                );
            } else {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('spirit_rings_prev_disabled')
                        .setLabel('‹ Trước')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
            }

            // Nút trang sau
            if (page < totalPages) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`spirit_rings_next_${page + 1}_${userId}`)
                        .setLabel('Sau ›')
                        .setStyle(ButtonStyle.Primary)
                );
            } else {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('spirit_rings_next_disabled')
                        .setLabel('Sau ›')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
            }

            // Nút đến trang cuối
            if (page < totalPages) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`spirit_rings_last_${totalPages}_${userId}`)
                        .setLabel('Cuối »')
                        .setStyle(ButtonStyle.Primary)
                );
            } else {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('spirit_rings_last_disabled')
                        .setLabel('Cuối »')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
            }

            // Tạo row cho buttons
            const buttonRow = new ActionRowBuilder().addComponents(buttons);

            // Thêm các components vào mảng
            components.push(selectRow, rangeRow, buttonRow);

            return { embeds: [embed], components };

        } catch (error) {
            console.error('Lỗi khi lấy danh sách hồn hoàn:', error);

            // Tạo embed lỗi
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Lỗi')
                .setDescription('Đã xảy ra lỗi khi lấy danh sách hồn hoàn. Vui lòng thử lại sau.')
                .setTimestamp();

            return { embeds: [errorEmbed], components: [] };
        }
    }

}

module.exports = SpiritRingController;
