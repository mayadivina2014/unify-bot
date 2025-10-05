// commands/moderacion/warn.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

// --- TRADUCCIONES INTEGRADAS ---
const translations = {
    es: {
        noPermission: 'No tienes permiso para usar este comando. Necesitas el permiso de `Expulsar miembros` o un rol con permiso `canWarn`.',
        warnSuccess: 'Usuario advertido exitosamente.',
        warnedBy: 'Advertido por',
        reason: 'Razón',
        timestamp: 'Fecha',
        warnEmbedTitle: '⚠️ Advertencia de Moderación',
        warnEmbedDescription: 'Has recibido una advertencia en el servidor **{guildName}**.',
        dmDisabled: 'No pude enviar un mensaje directo al usuario, pero la advertencia ha sido registrada.',
        unknownError: 'Ocurrió un error inesperado al registrar la advertencia.',
        noUserProvided: 'Debes proporcionar un usuario para advertir.',
        cannotWarnSelf: 'No puedes advertirte a ti mismo.',
        cannotWarnBot: 'No puedes advertir a un bot.',
        cannotWarnHigher: 'No puedes advertir a un usuario con un rol igual o superior al tuyo.',
        warnListTitle: 'Historial de Advertencias de {userTag}',
        noWarnings: 'Este usuario no tiene advertencias registradas.',
        warnEntry: 'ID: {warnId}\nModerador: {moderatorTag}\nRazón: {reason}\nFecha: <t:{timestamp}:F>',
        warnListFooter: 'Total de advertencias: {totalWarnings}',
        warnListSubcommand: 'Muestra el historial de advertencias de un usuario.',
        clearWarnsSubcommand: 'Elimina todas las advertencias de un usuario.',
        clearWarnsSuccess: 'Todas las advertencias de {userTag} han sido eliminadas.',
        clearWarnsConfirm: '¿Estás seguro de que quieres eliminar TODAS las advertencias de {userTag}? Esta acción es irreversible.',
        confirmButton: 'Sí, eliminar', cancelButton: 'No, cancelar',
        clearWarnsCancelled: 'Eliminación de advertencias cancelada.',
        noPermissionClear: 'No tienes permiso para eliminar advertencias.'
    },
    en: {
        noPermission: 'You do not have permission to use this command. You need `Kick Members` permission or a role with `canWarn` permission.',
        warnSuccess: 'User warned successfully.',
        warnedBy: 'Warned by',
        reason: 'Reason',
        timestamp: 'Date',
        warnEmbedTitle: '⚠️ Moderation Warning',
        warnEmbedDescription: 'You have received a warning in the **{guildName}** server.',
        dmDisabled: 'Could not DM the user, but the warning has been logged.',
        unknownError: 'An unexpected error occurred while logging the warning.',
        noUserProvided: 'You must provide a user to warn.',
        cannotWarnSelf: 'You cannot warn yourself.',
        cannotWarnBot: 'You cannot warn a bot.',
        cannotWarnHigher: 'You cannot warn a user with a role equal to or higher than yours.',
        warnListTitle: '{userTag}\'s Warning History',
        noWarnings: 'This user has no recorded warnings.',
        warnEntry: 'ID: {warnId}\nModerator: {moderatorTag}\nReason: {reason}\nDate: <t:{timestamp}:F>',
        warnListFooter: 'Total warnings: {totalWarnings}',
        warnListSubcommand: 'Shows a user\'s warning history.',
        clearWarnsSubcommand: 'Deletes all warnings for a user.',
        clearWarnsSuccess: 'All warnings for {userTag} have been deleted.',
        clearWarnsConfirm: 'Are you sure you want to delete ALL warnings for {userTag}? This action is irreversible.',
        confirmButton: 'Yes, delete', cancelButton: 'No, cancel',
        clearWarnsCancelled: 'Warning deletion cancelled.',
        noPermissionClear: 'You do not have permission to delete warnings.'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Advierte a un usuario por una razón específica.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Añade una advertencia a un usuario.')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('El usuario a advertir.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('motivo')
                        .setDescription('La razón de la advertencia.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription(translations.es.warnListSubcommand) // Usar traducción
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('El usuario cuyo historial de advertencias deseas ver.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription(translations.es.clearWarnsSubcommand) // Usar traducción
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('El usuario cuyas advertencias serán eliminadas.')
                        .setRequired(true))),
    
    async execute(interaction, client, DniModel, ServerConfigModel, CharacterModel, WarningModel) {
        console.log(`[${new Date().toISOString()}] Comando /warn ejecutado por ${interaction.user.tag} en el servidor ${interaction.guild.name}.`);

        const guildId = interaction.guildId;
        const moderator = interaction.user;
        const serverConfig = await client.config.loadConfig(guildId);
        const language = serverConfig && serverConfig.language ? serverConfig.language : 'es';
        const t = translations[language];

        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('usuario');
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // Comprobación de permisos
        let hasPermission = false;
        if (interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            hasPermission = true;
        } else {
            const rolePermissions = serverConfig && serverConfig.rolePermissions ? serverConfig.rolePermissions : {};
            for (const roleId of interaction.member.roles.cache.keys()) {
                if (rolePermissions[roleId] && rolePermissions[roleId].canWarn) {
                    hasPermission = true;
                    break;
                }
            }
        }

        if (!hasPermission) {
            console.log(`[${new Date().toISOString()}] ${moderator.tag} intentó usar /warn sin permisos.`);
            return interaction.reply({ content: t.noPermission, ephemeral: true });
        }

        if (!targetUser) {
            return interaction.reply({ content: t.noUserProvided, ephemeral: true });
        }
        if (targetUser.id === moderator.id) {
            return interaction.reply({ content: t.cannotWarnSelf, ephemeral: true });
        }
        if (targetUser.bot) {
            return interaction.reply({ content: t.cannotWarnBot, ephemeral: true });
        }
        
        if (targetMember && interaction.member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0 && !interaction.user.id === interaction.guild.ownerId) {
            return interaction.reply({ content: t.cannotWarnHigher, ephemeral: true });
        }

        if (subcommand === 'add') {
            await interaction.deferReply();
            const reason = interaction.options.getString('motivo');

            try {
                const newWarning = {
                    userId: targetUser.id,
                    guildId: guildId,
                    moderatorId: moderator.id,
                    reason: reason,
                    timestamp: new Date()
                };
                await WarningModel.create(newWarning);
                console.log(`[${new Date().toISOString()}] Advertencia registrada para ${targetUser.tag} por ${moderator.tag}.`);

                const warnEmbed = new EmbedBuilder()
                    .setColor(0xFFA500) // Naranja para advertencias
                    .setTitle(t.warnEmbedTitle)
                    .setDescription(t.warnEmbedDescription.replace('{guildName}', interaction.guild.name))
                    .addFields(
                        { name: t.reason, value: reason, inline: false },
                        { name: t.warnedBy, value: moderator.tag, inline: true },
                        { name: t.timestamp, value: `<t:${Math.floor(new Date().getTime() / 1000)}:F>`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() });

                try {
                    await targetUser.send({ embeds: [warnEmbed] });
                    await interaction.editReply({ content: t.warnSuccess, embeds: [warnEmbed] });
                } catch (dmError) {
                    console.warn(`[${new Date().toISOString()}] No se pudo enviar DM a ${targetUser.tag}: ${dmError.message}`);
                    await interaction.editReply({ content: `${t.warnSuccess} ${t.dmDisabled}`, embeds: [warnEmbed] });
                }

            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error al añadir advertencia en MongoDB:`, error);
                await interaction.editReply({ content: t.unknownError, ephemeral: true });
            }
        } else if (subcommand === 'list') {
            await interaction.deferReply();

            try {
                const warnings = await WarningModel.find({ userId: targetUser.id, guildId: guildId }).sort({ timestamp: 1 });

                if (warnings.length === 0) {
                    return interaction.editReply({ content: t.noWarnings, ephemeral: true });
                }

                let description = '';
                for (const warn of warnings) {
                    const moderatorUser = await client.users.fetch(warn.moderatorId).catch(() => ({ tag: 'Usuario Desconocido' }));
                    description += t.warnEntry
                        .replace('{warnId}', warn._id.toString().substring(0, 8)) // Mostrar un ID corto
                        .replace('{moderatorTag}', moderatorUser.tag)
                        .replace('{reason}', warn.reason)
                        .replace('{timestamp}', Math.floor(warn.timestamp.getTime() / 1000)) + '\n\n';
                }

                const warnListEmbed = new EmbedBuilder()
                    .setColor(0x007FFF)
                    .setTitle(t.warnListTitle.replace('{userTag}', targetUser.tag))
                    .setDescription(description)
                    .setTimestamp()
                    .setFooter({ text: t.warnListFooter.replace('{totalWarnings}', warnings.length), iconURL: client.user.displayAvatarURL() });

                await interaction.editReply({ embeds: [warnListEmbed] });

            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error al listar advertencias en MongoDB:`, error);
                await interaction.editReply({ content: t.unknownError, ephemeral: true });
            }
        } else if (subcommand === 'clear') {
            await interaction.deferReply({ ephemeral: true });

            // Solo el dueño del servidor o un administrador puede borrar advertencias
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && interaction.user.id !== interaction.guild.ownerId) {
                return interaction.editReply({ content: t.noPermissionClear, ephemeral: true });
            }

            const confirmEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Confirmación de Eliminación')
                .setDescription(t.clearWarnsConfirm.replace('{userTag}', targetUser.tag));

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_clear_warns')
                        .setLabel(t.confirmButton)
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancel_clear_warns')
                        .setLabel(t.cancelButton)
                        .setStyle(ButtonStyle.Secondary)
                );

            const response = await interaction.editReply({ embeds: [confirmEmbed], components: [row], ephemeral: true });

            const collectorFilter = i => i.user.id === interaction.user.id;

            try {
                const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60000, componentType: ComponentType.Button });

                if (confirmation.customId === 'confirm_clear_warns') {
                    await WarningModel.deleteMany({ userId: targetUser.id, guildId: guildId });
                    console.log(`[${new Date().toISOString()}] Todas las advertencias de ${targetUser.tag} eliminadas.`);
                    await confirmation.update({ content: t.clearWarnsSuccess.replace('{userTag}', targetUser.tag), embeds: [], components: [], ephemeral: true });
                } else if (confirmation.customId === 'cancel_clear_warns') {
                    await confirmation.update({ content: t.clearWarnsCancelled, embeds: [], components: [], ephemeral: true });
                }
            } catch (e) {
                console.error(`[${new Date().toISOString()}] Error al recolectar interacción de botón para borrar advertencias:`, e);
                await interaction.editReply({ content: t.unknownError, components: [] });
            }
        }
    }
};
