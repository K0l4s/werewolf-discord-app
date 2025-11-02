const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { authenticateAndCheckPermission } = require('../../utils/checkPermission');
const TicketController = require('../../controllers/ticketController');
const TicketService = require('../../services/ticketService');
const Notification = require('../../models/Notification');

// Middleware xử lý lỗi validation
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }
    next();
};

// router.use("/:guildId", authenticateAndCheckPermission);

// Tạo category mới
router.post('/:guildId/',
    [
        // body('guildId').notEmpty().withMessage('guildId là bắt buộc'),
        param('guildId').notEmpty().withMessage('guildId là bắt buộc'),
        body('cateType').notEmpty().withMessage('cateType là bắt buộc'),
        body('description').notEmpty().withMessage('description là bắt buộc'),
        body('cateName').optional().isString(),
        body('requiredRoleIds').optional().isArray(),
        body('notifyRoleIds').optional().isArray(),
        body('notifyUserIds').optional().isArray()
    ],

    handleValidationErrors,
    async (req, res) => {
        try {
            const {
                guildId,
                cateName,
                cateType,
                description,
                requiredRoleIds = [],
                notifyRoleIds = [],
                notifyUserIds = []
            } = req.body;
            const client = req.app.get('discordClient')
            const result = await TicketController.createCategory(
                client, // Giả sử client Discord được đính kèm vào request
                guildId,
                cateName,
                cateType,
                description,
                notifyRoleIds,
                notifyUserIds,
                requiredRoleIds
            );

            if (result.success) {
                res.status(201).json({
                    success: true,
                    message: result.message,
                    data: {
                        categoryId: result.category.cateId,
                        categoryType: result.category.cateType,
                        discordCategory: {
                            id: result.category.discordCategory.id,
                            name: result.category.discordCategory.name
                        },
                        permissions: {
                            requiredRoles: requiredRoleIds,
                            notifyRoles: notifyRoleIds,
                            notifyUsers: notifyUserIds
                        }
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message
                });
            }
        } catch (error) {
            console.error('Lỗi API tạo category:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi tạo category',
                error: error.message
            });
        }
    }
);

// Lấy thông tin tất cả categories
router.get('/:guildId/categories',
    [
        param('guildId').notEmpty().withMessage('guildId là bắt buộc')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { guildId } = req.params;
            const client = req.app.get('discordClient');
            const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId);

            if (!guild) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy guild'
                });
            }

            const result = await Notification.findOne({ guildId });
            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy cấu hình ticket'
                });
            }

            // Map lại dữ liệu categories
            const categories = await Promise.all(result.ticketCate.map(async cate => {
                // Lấy thông tin roles
                const roleDetails = await Promise.all(
                    (cate.roleIds || []).map(async id => {
                        const role = guild.roles.cache.get(id) || await guild.roles.fetch(id).catch(() => null);
                        return role ? { id, name: role.name } : { id, name: 'Unknown Role' };
                    })
                );

                // Lấy thông tin users
                const userDetails = await Promise.all(
                    (cate.userIds || []).map(async id => {
                        const user = client.users.cache.get(id) || await client.users.fetch(id).catch(() => null);
                        return user ? { id, name: user.username } : { id, name: 'Unknown User' };
                    })
                );

                return {
                    ...cate.toObject(),
                    roleIds: roleDetails,
                    userIds: userDetails
                };
            }));

            res.status(200).json({
                success: true,
                data: categories
            });

        } catch (error) {
            console.error('Lỗi API lấy categories:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy categories',
                error: error.message
            });
        }
    }
);


// Chỉnh sửa category - Thêm roles/users
router.put('/:guildId/:cateType/add',
    [
        param('guildId').notEmpty().withMessage('guildId là bắt buộc'),
        param('cateType').notEmpty().withMessage('cateType là bắt buộc'),
        body('roles').optional().isArray().withMessage('roles phải là mảng'),
        body('users').optional().isArray().withMessage('users phải là mảng'),
        body('requiredRoles').optional().isArray().withMessage('requiredRoles phải là mảng')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { guildId, cateType } = req.params;
            const { roles = [], users = [], requiredRoles = [] } = req.body;

            let result;
            let message = '';
            const client = req.app.get('discordClient')
            // Xử lý thêm roles/users thông thường
            if (roles.length > 0 || users.length > 0) {
                result = await TicketController.addRolesAndUsersToCategory(
                    client,
                    guildId,
                    cateType,
                    users,
                    roles
                );
                message += result.message + ' ';
            }

            // Xử lý thêm required roles
            if (requiredRoles.length > 0) {
                const requiredResult = await TicketController.addRolesRequired(
                    client,
                    guildId,
                    cateType,
                    requiredRoles
                );
                message += requiredResult.message;
                result = result || requiredResult;
            }

            if (result && result.success) {
                res.status(200).json({
                    success: true,
                    message: message.trim(),
                    data: {
                        updatedCategory: result.updatedCategory
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result?.message || 'Có lỗi xảy ra khi cập nhật category'
                });
            }
        } catch (error) {
            console.error('Lỗi API thêm roles/users vào category:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi cập nhật category',
                error: error.message
            });
        }
    }
);

// Chỉnh sửa category - Xóa roles/users
router.put('/:guildId/:cateType/remove',
    [
        param('guildId').notEmpty().withMessage('guildId là bắt buộc'),
        param('cateType').notEmpty().withMessage('cateType là bắt buộc'),
        body('roles').optional().isArray().withMessage('roles phải là mảng'),
        body('users').optional().isArray().withMessage('users phải là mảng'),
        body('requiredRoles').optional().isArray().withMessage('requiredRoles phải là mảng')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { guildId, cateType } = req.params;
            const { roles = [], users = [], requiredRoles = [] } = req.body;

            let result;
            let message = '';

            // Xử lý xóa roles/users thông thường
            if (roles.length > 0 || users.length > 0) {
                result = await TicketController.removeRolesAndUsersFromCategory(
                    client,
                    guildId,
                    cateType,
                    users,
                    roles
                );
                message += result.message + ' ';
            }

            // Xử lý xóa required roles
            if (requiredRoles.length > 0) {
                const requiredResult = await TicketController.removeRolesRequired(
                    client,
                    guildId,
                    cateType,
                    requiredRoles
                );
                message += requiredResult.message;
                result = result || requiredResult;
            }

            if (result && result.success) {
                res.status(200).json({
                    success: true,
                    message: message.trim(),
                    data: {
                        updatedCategory: result.updatedCategory
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result?.message || 'Có lỗi xảy ra khi cập nhật category'
                });
            }
        } catch (error) {
            console.error('Lỗi API xóa roles/users khỏi category:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi cập nhật category',
                error: error.message
            });
        }
    }
);

// Cập nhật thông tin category
router.put('/:guildId/:cateType',
    [
        param('guildId').notEmpty().withMessage('guildId là bắt buộc'),
        param('cateType').notEmpty().withMessage('cateType là bắt buộc'),
        body('description').optional().isString(),
        body('cateName').optional().isString(),
        body('requiredRoleIds').optional().isArray(),
        body('notifyRoleIds').optional().isArray(),
        body('notifyUserIds').optional().isArray()
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { guildId, cateType } = req.params;
            const {
                description,
                cateName,
                requiredRoleIds,
                notifyRoleIds,
                notifyUserIds
            } = req.body;

            // TODO: Triển khai logic cập nhật thông tin category
            // Hiện tại có thể sử dụng kết hợp các API có sẵn

            res.status(200).json({
                success: true,
                message: 'Cập nhật category thành công',
                data: {
                    guildId,
                    cateType,
                    updatedFields: req.body
                }
            });

        } catch (error) {
            console.error('Lỗi API cập nhật category:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi cập nhật category',
                error: error.message
            });
        }
    }
);

// Xóa category
router.delete('/:guildId/:cateType',
    [
        param('guildId').notEmpty().withMessage('guildId là bắt buộc'),
        param('cateType').notEmpty().withMessage('cateType là bắt buộc')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { guildId, cateType } = req.params;

            // TODO: Triển khai logic xóa category
            // Cần xóa cả trong database và Discord

            res.status(200).json({
                success: true,
                message: `Đã xóa category ${cateType} thành công`,
                data: {
                    guildId,
                    cateType,
                    deletedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Lỗi API xóa category:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi xóa category',
                error: error.message
            });
        }
    }
);

// Lấy thông tin chi tiết một category
router.get('/:guildId/:cateType',
    [
        param('guildId').notEmpty().withMessage('guildId là bắt buộc'),
        param('cateType').notEmpty().withMessage('cateType là bắt buộc')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { guildId, cateType } = req.params;

            // TODO: Triển khai logic lấy thông tin chi tiết category

            res.status(200).json({
                success: true,
                data: {
                    guildId,
                    cateType,
                    info: 'Thông tin chi tiết category'
                }
            });

        } catch (error) {
            console.error('Lỗi API lấy thông tin category:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy thông tin category',
                error: error.message
            });
        }
    }
);

module.exports = router;