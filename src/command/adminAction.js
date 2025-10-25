// bot/commands/adminCommands.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, Attachment } = require('discord.js');
const actionService = require('../../services/actionService');
const User = require('../../models/User');

module.exports = [
    {
        data: new SlashCommandBuilder()
            .setName('add-action')
            .setDescription('Add a new custom action to the server')
            .addStringOption(option =>
                option.setName('action')
                    .setDescription('Action name (e.g., dance, wave)')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('Message template (use {user} and {target})')
                    .setRequired(true)
            )
            .addAttachmentOption(option =>
                option.setName('image')
                    .setDescription('Upload an image for the action')
                    .setRequired(false)
            )
            .addStringOption(option =>
                option.setName('image-url')
                    .setDescription('Image URL for the action')
                    .setRequired(false)
            )
            .addBooleanOption(option =>
                option.setName('requires-target')
                    .setDescription('Whether this action requires a target user')
                    .setRequired(false)
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

        async execute(interaction) {
            await interaction.deferReply({ ephemeral: true });

            const actionName = interaction.options.getString('action');
            const message = interaction.options.getString('message');
            const imageAttachment = interaction.options.getAttachment('image');
            const imageUrl = interaction.options.getString('image-url');
            const requiresTarget = interaction.options.getBoolean('requires-target') ?? true;

            // Validate that at least one image source is provided
            if (!imageAttachment && !imageUrl) {
                return await interaction.editReply('Please provide either an image upload or an image URL.');
            }

            // Validate that only one image source is provided
            if (imageAttachment && imageUrl) {
                return await interaction.editReply('Please provide only one image source (upload or URL), not both.');
            }

            try {
                let actionData;

                if (imageAttachment) {
                    // Handle file upload from Discord
                    if (!imageAttachment.contentType?.startsWith('image/')) {
                        return await interaction.editReply('Please upload a valid image file (jpg, png, gif, webp).');
                    }

                    // Download the image from Discord CDN
                    const response = await fetch(imageAttachment.url);
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    actionData = {
                        action: actionName,
                        message: message,
                        imageType: 'upload',
                        imageData: {
                            originalname: imageAttachment.name || 'discord_image.png',
                            mimetype: imageAttachment.contentType,
                            buffer: buffer,
                            size: imageAttachment.size
                        },
                        requiresTarget: requiresTarget
                    };
                } else {
                    // Handle URL
                    actionData = {
                        action: actionName,
                        message: message,
                        imageType: 'url',
                        imageData: imageUrl,
                        requiresTarget: requiresTarget
                    };
                }

                const newAction = await actionService.addAction(
                    interaction.guild.id,
                    actionData,
                    interaction.user.id
                );

                await interaction.editReply(`Action "${actionName}" has been added successfully!`);

            } catch (error) {
                console.error('Error adding action:', error);
                await interaction.editReply(`Error: ${error.message}`);
            }
        }
    },

    {
        data: new SlashCommandBuilder()
            .setName('action-stats')
            .setDescription('Check your action usage and token balance')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

        async execute(interaction) {
            await interaction.deferReply({ ephemeral: true });

            try {
                const user = await User.findOne({ userId: interaction.user.id });
                const stats = await actionService.getUserActionsStats(
                    interaction.user.id,
                    interaction.guild.id
                );

                const embed = {
                    color: 0x0099ff,
                    title: 'Action Usage Statistics',
                    fields: [
                        {
                            name: 'Token Balance',
                            value: `**${user?.token || 0}** tokens`,
                            inline: true
                        },
                        {
                            name: 'Uploaded Images',
                            value: `**${stats.uploadCount}/5** used\n**${stats.uploadsRemaining}** remaining`,
                            inline: true
                        },
                        {
                            name: 'Image URLs',
                            value: `**${stats.urlCount}/10** used\n**${stats.urlsRemaining}** remaining`,
                            inline: true
                        },
                        {
                            name: 'Pricing',
                            value: 'Additional uploads: **3 tokens**\nAdditional URLs: **2 tokens**',
                            inline: false
                        }
                    ],
                    timestamp: new Date()
                };

                await interaction.editReply({ embeds: [embed] });

            } catch (error) {
                console.error('Error getting stats:', error);
                await interaction.editReply('An error occurred while fetching your statistics.');
            }
        }
    },

    {
        data: new SlashCommandBuilder()
            .setName('delete-action')
            .setDescription('Delete a custom action')
            .addStringOption(option =>
                option.setName('action')
                    .setDescription('Action name to delete')
                    .setRequired(true)
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

        async execute(interaction) {
            await interaction.deferReply({ ephemeral: true });

            const actionName = interaction.options.getString('action');

            try {
                await actionService.deleteAction(
                    interaction.guild.id,
                    actionName,
                    interaction.user.id
                );

                await interaction.editReply(`Action "${actionName}" has been deleted successfully!`);

            } catch (error) {
                await interaction.editReply(`Error: ${error.message}`);
            }
        }
    }
];