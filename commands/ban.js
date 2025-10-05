// commands/mod/ban.js
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea a un usuario del servidor.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario a banear.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('dias_eliminar_mensajes')
                .setDescription('Número de días de mensajes a eliminar (0-7).')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7))
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('El motivo del baneo.')
                .setRequired(false)),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('usuario');
        const deleteMessageDays = interaction.options.getInteger('dias_eliminar_mensajes') || 0;
        const reason = interaction.options.getString('motivo') || 'No se proporcionó un motivo.';
        const moderator = interaction.user;
        const guild = interaction.guild;
        const member = guild.members.cache.get(targetUser.id); // Intentar obtener el miembro si está en el guild

        // --- Verificación de Permisos del Bot (Discord API) ---
        if (!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.editReply({ content: 'No tengo permiso para banear miembros. Necesito el permiso "Banear miembros".', ephemeral: true });
        }

        // --- Verificación de Permisos Personalizados del Bot (desde config.yaml) ---
        // Asegurarse de que client.config.configs sea un Map y esté cargado
        if (!client.config || !(client.config.configs instanceof Map)) {
            console.warn(`[${new Date().toISOString()}] client.config no cargado correctamente en ban.js. Intentando cargar.`);
            const yaml = require('js-yaml');
            const fs = require('node:fs');
            function loadFullConfig() {
                try {
                    if (fs.existsSync('./config.yaml')) {
                        const data = fs.readFileSync('./config.yaml', 'utf8');
                        const parsed = yaml.load(data);
                        return new Map(Object.entries(parsed.servers || {}));
                    }
                } catch (err) {
                    console.error(`[${new Date().toISOString()}] Error al cargar config.yaml en ban.js:`, err);
                }
                return new Map();
            }
            client.config = {
                configs: loadFullConfig(),
                get: function(id) { return this.configs.get(id); }
            };
        }

        const serverConfig = client.config.get(guild.id);
        const moderatorPermissions = serverConfig?.rolePermissions || {};

        let hasPermission = false;
        const moderatorMember = guild.members.cache.get(moderator.id);
        if (moderatorMember) {
            for (const roleId of moderatorMember.roles.cache.keys()) {
                if (moderatorPermissions[roleId]?.canBan) {
                    hasPermission = true;
                    break;
                }
            }
        }
        
        if (moderator.id === guild.ownerId) {
            hasPermission = true;
        }

        if (!hasPermission) {
            return interaction.editReply({ content: 'No tienes permiso para usar el comando de baneo del bot. Necesitas el permiso `Banear (Ban)` asignado a tu rol en la configuración del bot.', ephemeral: true });
        }

        // --- Validaciones Adicionales ---
        if (targetUser.id === moderator.id) {
            return interaction.editReply({ content: 'No puedes banearte a ti mismo.', ephemeral: true });
        }
        if (targetUser.id === client.user.id) {
            return interaction.editReply({ content: 'No puedes banear al bot.', ephemeral: true });
        }
        // Si el usuario está en el servidor, verificar jerarquía
        if (member && member.bannable === false) {
            return interaction.editReply({ content: 'No puedo banear a este usuario. Podría tener un rol superior al mío o ser el dueño del servidor.', ephemeral: true });
        }

        try {
            // --- Enviar DM al Usuario Baneado ---
            const dmEmbed = new EmbedBuilder()
                .setColor(0xDC143C) // Rojo oscuro
                .setTitle(`🚫 Has sido baneado de ${guild.name}`)
                .setDescription(`**Moderador:** ${moderator.tag}\n**Motivo:** ${reason}`)
                .setTimestamp()
                .setFooter({ text: 'Este es un baneo permanente. Contacta con los administradores si crees que es un error.' });

            try {
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.warn(`[${new Date().toISOString()}] No se pudo enviar DM a ${targetUser.tag} (${targetUser.id}) sobre el baneo:`, dmError.message);
            }

            // --- Banear al usuario ---
            await guild.members.ban(targetUser.id, { deleteMessageDays, reason });

            // --- Enviar Embed de Confirmación al Canal ---
            const banEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Usuario Baneado')
                .addFields(
                    { name: 'Usuario', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
                    { name: 'Moderador', value: `${moderator.tag} (${moderator.id})`, inline: false },
                    { name: 'Motivo', value: reason, inline: false },
                    { name: 'Mensajes Eliminados (días)', value: `${deleteMessageDays}`, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [banEmbed], ephemeral: false });

            console.log(`[${new Date().toISOString()}] ${targetUser.tag} baneado por ${moderator.tag}. Motivo: ${reason}. Mensajes eliminados de ${deleteMessageDays} días.`);

        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error al banear a ${targetUser.tag}:`, error);
            await interaction.editReply({ content: 'Ocurrió un error al intentar banear a este usuario. Por favor, revisa mis permisos y la jerarquía de roles.', ephemeral: true });
        }
    },
};