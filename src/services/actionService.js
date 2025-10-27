// services/actionService.js
const Action = require('../models/Action');
const User = require('../models/User');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const UserService = require('./userService')
class ActionService {
    // System default actions
    systemActions = [
        {
            action: 'punch',
            message: '{user} punched {target}! 💥',
            imgUrl: '/system/punch.gif',
            requiresTarget: true,
            isSystemDefault: true
        },
        {
            action: 'kiss',
            message: '{user} kissed {target}! 💋',
            imgUrl: '/system/kiss.gif',
            requiresTarget: true,
            isSystemDefault: true
        },
        {
            action: 'hug',
            message: '{user} hugged {target}! 🤗',
            imgUrl: '/system/hug.gif',
            requiresTarget: true,
            isSystemDefault: true
        }
    ];

    async initializeSystemActions(guildId) {
        for (const systemAction of this.systemActions) {
            await Action.findOneAndUpdate(
                { guildId, action: systemAction.action },
                { ...systemAction, guildId },
                { upsert: true, new: true }
            );
        }
    }


    async addAction(guildId, actionData, userId = null) {
        const { action, message, imageType, imageData, requiresTarget = true } = actionData;
        const IMGBB_API_KEY = process.env.IMGBB_API_KEY || 'YOUR_IMGBB_API_KEY';

        const existingAction = await Action.findOne({ guildId, action });
        if (existingAction && !existingAction.isSystemDefault) {
            throw new Error('Action already exists in this server');
        }

        let imgUrl;
        let uploadId = null;

        if (imageType === 'upload') {
            if (userId) {
                const userUploadCount = await this.getServerUploadCount(guildId);
                console.log(userUploadCount)
                if (userUploadCount >= 10) {
                    // const user = await .findOne({ userId });
                    const user = await UserService.findUserById(userId)
                    if (!user || user.token < 3) {
                        throw new Error('Insufficient tokens. Need 3 tokens to upload more images');
                    }
                    user.token -= 3;
                    await user.save();
                }
            }

            // 🧠 Upload base64 image (cho memoryStorage)
            const base64Image = imageData.buffer.toString('base64');
            const form = new FormData();
            form.append('image', base64Image);

            const res = await axios.post(
                `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
                form,
                { headers: form.getHeaders() }
            );

            if (!res.data?.data?.url) {
                throw new Error('Failed to upload image to ImgBB');
            }

            imgUrl = res.data.data.url;
        } else if (imageType === 'url') {
            if (userId) {
                const userUrlCount = await this.getServerUploadCount(guildId);
                if (userUrlCount >= 10) {
                    const user = await UserService.findUserById(userId)
                    if (!user || user.token < 3) {
                        throw new Error('Insufficient tokens. Need 3 tokens to add more URLs');
                    }
                    user.token -= 3;
                    await user.save();
                }
            }

            imgUrl = imageData;
            if (!this.isImageUrl(imageData)) {
                throw new Error('URL must point to an image file');
            }
        }

        const newAction = new Action({
            guildId,
            action: action.toLowerCase(),
            message,
            imgUrl,
            uploadId,
            requiresTarget,
            createdBy:userId || null
        });

        return await newAction.save();
    }

    isImageUrl(url) {
        return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url);
    }
    async getServerUploadCount(guildId) {
        return await Action.countDocuments({
            guildId: guildId,
            isSystemDefault: false
        })
    }
    // async getServerUrlCount(guildId) {
    //     return await Action.countDocuments({ guildId: guildId, imageType: 'url', isSystemDefault: false });
    // }
    // async getUserUploadCount(userId) {
    //     return await Action.countDocuments({ createdBy: userId });
    // }

    async getUserUrlCount(userId) {
        return await Action.countDocuments({ createdBy: userId });
    }

    async getUserUploadCount(userId) {
        return await Action.countDocuments({
            uploadId: { $ne: null },
            'metadata.uploaderId': userId
        });
    }

    async getUserUrlCount(userId) {
        return await Action.countDocuments({
            uploadId: null,
            isSystemDefault: false,
            'metadata.uploaderId': userId
        });
    }

    isImageUrl(url) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        return imageExtensions.some(ext => url.toLowerCase().includes(ext));
    }

    async getAction(guildId, actionName) {
        return await Action.findOne({
            guildId,
            action: actionName.toLowerCase()
        });
    }

    async getServerActions(guildId) {
        return await Action.find({ guildId });
    }

    async deleteAction(guildId, actionName) {
        const action = await Action.findOne({ guildId, action: actionName });
        if (!action) {
            throw new Error('Action not found');
        }

        if (action.isSystemDefault) {
            throw new Error('Cannot delete system default actions');
        }

        // Delete uploaded file if exists
        if (action.uploadId) {
            const filename = path.basename(action.imgUrl);
            try {
                await fs.unlink(path.join(storageService.uploadDir, filename));
            } catch (error) {
                console.error('Error deleting file:', error);
            }
        }

        return await Action.deleteOne({ guildId, action: actionName });
    }
}

module.exports = new ActionService();