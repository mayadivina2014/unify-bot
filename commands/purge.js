const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const moment = require('moment'); // Asegúrate de tener 'moment' instalado: npm install moment

// No es necesario importar la configuración aquí, ya que se pasa en el objeto `client` en index.js.

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Elimina un número específico de mensajes del canal actual.')
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('El número de mensajes a eliminar (entre 1 y 99).')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(99) // Discord bulkDelete max is 100, so 99 is a safe value for user input
        )
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Solo elimina mensajes de un usuario específico.')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('contiene')
                .setDescription('Solo elimina mensajes que contengan este texto.')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('solo_bots')
                .setDescription('Solo elimina mensajes de bots.')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('solo_archivos')
                .setDescription('Solo elimina mensajes con archivos adjuntos.')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('solo_links')
                .setDescription('Solo elimina mensajes que contengan enlaces.')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('antes_de_id')
                .setDescription('Elimina mensajes antes de un ID de mensaje específico.')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('despues_de_id')
                .setDescription('Elimina mensajes después de un ID de mensaje específico.')
                .setRequired(false)
        )
        .setDMPermission(false), // Este comando solo puede ser usado en servidores

    async execute(interaction, client) {
        console.log(`[${new Date().toISOString()}] Comando /purge ejecutado por ${interaction.user.tag} en el canal ${interaction.channel.name} del servidor ${interaction.guild.name}.`);

        // Deferir la respuesta para dar tiempo al procesamiento, y hacerla efímera
        await interaction.deferReply({ ephemeral: true });

        // --- Verificación de Permisos ---
        // 1. Permiso de Discord (Discord nativo)
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            console.log(`[${new Date().toISOString()}] ${interaction.user.tag} intentó usar /purge sin permiso de ManageMessages.`);
            return interaction.editReply({ content: 'No tienes el permiso de Discord `Gestionar Mensajes` para usar este comando.', ephemeral: true });
        }

        // 2. Permiso del Bot (configurable por /config)
        const guildId = interaction.guild.id;
        let guildConfig;

        try {
            // Usamos el método loadConfig de la clase ConfigManager para obtener la configuración
            guildConfig = await client.config.loadConfig(guildId);
        } catch (e) {
            console.error(`[${new Date().toISOString()}] Error al cargar la configuración en /purge:`, e);
            return interaction.editReply({ content: 'Hubo un error al cargar la configuración del servidor. Por favor, inténtalo de nuevo más tarde.', ephemeral: true });
        }

        // Si el usuario tiene el permiso de Administrador de Discord, implícitamente tiene todos los permisos del bot.
        // O si su rol tiene la bandera 'canPurge' activada en la configuración del bot.
        const hasBotPurgePerm = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                                (guildConfig && guildConfig.rolePermissions && interaction.member.roles.cache.some(role => guildConfig.rolePermissions[role.id]?.canPurge));

        if (!hasBotPurgePerm) {
            console.log(`[${new Date().toISOString()}] ${interaction.user.tag} intentó usar /purge sin el permiso 'canPurge' del bot.`);
            return interaction.editReply({ content: 'Tu rol no tiene el permiso del bot para `Limpiar Mensajes`. Un administrador puede configurarlo con `/config permisos set-rol`.', ephemeral: true });
        }
        // --- Fin Verificación de Permisos ---

        const amount = interaction.options.getInteger('cantidad');
        const user = interaction.options.getUser('usuario');
        const contains = interaction.options.getString('contiene');
        const soloBots = interaction.options.getBoolean('solo_bots');
        const soloArchivos = interaction.options.getBoolean('solo_archivos');
        const soloLinks = interaction.options.getBoolean('solo_links');
        const antesDeId = interaction.options.getString('antes_de_id');
        const despuesDeId = interaction.options.getString('despues_de_id');

        // Asegurarse de que sea un canal de texto
        if (interaction.channel.type !== ChannelType.GuildText) {
            return interaction.editReply({ content: 'Este comando solo puede ser usado en canales de texto.', ephemeral: true });
        }

        let messages;
        try {
            // Fetch messages
            messages = await interaction.channel.messages.fetch({
                limit: amount,
                before: antesDeId || undefined,
                after: despuesDeId || undefined,
            });

            // Convert to array and filter
            const filteredMessages = messages.filter(msg => {
                // Ignore the command message itself and any deferral reply message
                if (msg.id === interaction.id || (interaction.fetchReply && msg.id === interaction.fetchReply().id)) {
                    return false;
                }
                
                // Filter by user
                if (user && msg.author.id !== user.id) {
                    return false;
                }
                // Filter by content
                if (contains && !msg.content.toLowerCase().includes(contains.toLowerCase())) {
                    return false;
                }
                // Filter by bots
                if (soloBots && !msg.author.bot) {
                    return false;
                }
                // Filter by attachments
                if (soloArchivos && msg.attachments.size === 0) {
                    return false;
                }
                // Filter by links
                if (soloLinks && !/(https?:\/\/[^\s]+)/g.test(msg.content)) {
                    return false;
                }
                return true;
            }).toJSON().slice(0, amount);

            if (filteredMessages.length === 0) {
                return interaction.editReply({ content: 'No se encontraron mensajes que coincidan con tus criterios para eliminar.', ephemeral: true });
            }

            // Separate messages into deletable by bulk (less than 14 days) and individual (14+ days)
            const fourteenDaysAgo = moment().subtract(14, 'days');
            const bulkDeletable = filteredMessages.filter(msg => moment(msg.createdAt).isAfter(fourteenDaysAgo));
            const individualDeletable = filteredMessages.filter(msg => moment(msg.createdAt).isSameOrBefore(fourteenDaysAgo));

            let deletedCount = 0;
            let individualDeletedCount = 0;

            // Perform bulk delete
            if (bulkDeletable.length > 0) {
                try {
                    const deletedBulk = await interaction.channel.bulkDelete(bulkDeletable, true);
                    deletedCount += deletedBulk.size;
                    console.log(`[${new Date().toISOString()}] Se eliminaron ${deletedBulk.size} mensajes en bloque.`);
                } catch (bulkError) {
                    console.error(`[${new Date().toISOString()}] Error al intentar eliminar mensajes en bloque:`, bulkError);
                    // Fallback to individual delete if bulk delete fails
                    for (const msg of bulkDeletable) {
                        try {
                            await msg.delete();
                            deletedCount++;
                        } catch (e) {
                            console.error(`[${new Date().toISOString()}] Error al eliminar mensaje ID ${msg.id} individualmente (después de fallo en bulk):`, e.message);
                        }
                    }
                }
            }

            // Perform individual delete for older messages
            if (individualDeletable.length > 0) {
                console.log(`[${new Date().toISOString()}] Eliminando ${individualDeletable.length} mensajes individualmente (potencialmente más de 14 días o no aptos para bulk).`);
                for (const msg of individualDeletable) {
                    try {
                        await msg.delete();
                        individualDeletedCount++;
                    } catch (e) {
                        console.error(`[${new Date().toISOString()}] Error al eliminar mensaje ID ${msg.id} individualmente:`, e.message);
                    }
                }
                deletedCount += individualDeletedCount;
            }

            let replyMessage = `✅ Se eliminaron **${deletedCount}** mensajes.`;
            if (user) replyMessage += ` del usuario ${user.tag}`;
            if (contains) replyMessage += ` que contenían "${contains}"`;
            if (soloBots) replyMessage += ` de bots`;
            if (soloArchivos) replyMessage += ` con archivos adjuntos`;
            if (soloLinks) replyMessage += ` con enlaces`;
            replyMessage += '.';

            if (individualDeletedCount > 0) {
                replyMessage += `\n\n⚠️ *Nota: ${individualDeletedCount} mensajes fueron eliminados uno por uno debido a su antigüedad (más de 14 días) o por otras limitaciones de Discord.*`;
            }

            await interaction.editReply({ content: replyMessage, ephemeral: true });
            console.log(`[${new Date().toISOString()}] Purga completada en #${interaction.channel.name}. Eliminados: ${deletedCount}.`);

        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error inesperado al ejecutar el comando /purge:`, error);
            await interaction.editReply({ content: 'Hubo un error inesperado al intentar eliminar los mensajes. Por favor, revisa los logs del bot y asegúrate de que el bot tenga los permisos necesarios (`Gestionar Mensajes`).', ephemeral: true });
        }
    },
};