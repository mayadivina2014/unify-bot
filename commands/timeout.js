// commands/mod/timeout.js
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Aísla a un usuario por un tiempo determinado.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario a aislar.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duracion')
                .setDescription('Duración del aislamiento en minutos (máx 28 días).')
                .setRequired(true)
                .setMinValue(1) // Mínimo 1 minuto
                .setMaxValue(28 * 24 * 60)) // Máximo 28 días en minutos
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('El motivo del aislamiento.')
                .setRequired(false)), // Motivo opcional

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('usuario');
        const durationMinutes = interaction.options.getInteger('duracion');
        const reason = interaction.options.getString('motivo') || 'No se proporcionó un motivo.';
        const moderator = interaction.user;
        const guild = interaction.guild;
        const member = guild.members.cache.get(targetUser.id);

        // Duración en milisegundos
        const durationMs = durationMinutes * 60 * 1000;
        const maxTimeoutMs = 28 * 24 * 60 * 60 * 1000; // 28 días en ms

        if (durationMs > maxTimeoutMs) {
            return interaction.editReply({ content: 'La duración máxima del aislamiento es de 28 días.', ephemeral: true });
        }

        // --- Verificación de Permisos del Bot (Discord API) ---
        if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.editReply({ content: 'No tengo permiso para aislar miembros. Necesito el permiso "Moderar miembros".', ephemeral: true });
        }

        // --- Verificación de Permisos Personalizados del Bot (desde config.yaml) ---
        // Asegurarse de que client.config.configs sea un Map y esté cargado
        if (!client.config || !(client.config.configs instanceof Map)) {
            console.warn(`[${new Date().toISOString()}] client.config no cargado correctamente en timeout.js. Intentando cargar.`);
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
                    console.error(`[${new Date().toISOString()}] Error al cargar config.yaml en timeout.js:`, err);
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
                if (moderatorPermissions[roleId]?.canTimeout) {
                    hasPermission = true;
                    break;
                }
            }
        }
        
        if (moderator.id === guild.ownerId) {
            hasPermission = true;
        }

        if (!hasPermission) {
            return interaction.editReply({ content: 'No tienes permiso para usar el comando de aislamiento del bot. Necesitas el permiso `Timeout (Aislar)` asignado a tu rol en la configuración del bot.', ephemeral: true });
        }

        // --- Validaciones Adicionales ---
        if (!member) {
            return interaction.editReply({ content: 'El usuario no está en este servidor o no se pudo encontrar.', ephemeral: true });
        }
        if (targetUser.id === moderator.id) {
            return interaction.editReply({ content: 'No puedes aislarte a ti mismo.', ephemeral: true });
        }
        if (targetUser.id === client.user.id) {
            return interaction.editReply({ content: 'No puedes aislar al bot.', ephemeral: true });
        }
        if (member.isCommunicationDisabled()) {
            return interaction.editReply({ content: 'Este usuario ya está aislado.', ephemeral: true });
        }
        if (!member.moderatable) {
            // Verificar si el bot puede aislar al miembro (jerarquía de roles)
            return interaction.editReply({ content: 'No puedo aislar a este usuario. Podría tener un rol superior al mío, ser el dueño del servidor, o ya estar en timeout.', ephemeral: true });
        }

        try {
            // --- Enviar DM al Usuario Aislado ---
            const dmEmbed = new EmbedBuilder()
                .setColor(0xFFA500) // Naranja
                .setTitle(`⏳ Has sido aislado en ${guild.name}`)
                .setDescription(`**Moderador:** ${moderator.tag}\n**Duración:** ${durationMinutes} minutos\n**Motivo:** ${reason}`)
                .setTimestamp()
                .setFooter({ text: 'Durante el aislamiento, no podrás enviar mensajes ni unirte a canales de voz.' });

            try {
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.warn(`[${new Date().toISOString()}] No se pudo enviar DM a ${targetUser.tag} (${targetUser.id}) sobre el aislamiento:`, dmError.message);
            }

            // --- Aislar al usuario ---
            await member.timeout(durationMs, reason);

            // --- Enviar Embed de Confirmación al Canal ---
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Usuario Aislado Temporalmente')
                .addFields(
                    { name: 'Usuario', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
                    { name: 'Moderador', value: `${moderator.tag} (${moderator.id})`, inline: false },
                    { name: 'Duración', value: `${durationMinutes} minutos`, inline: false },
                    { name: 'Motivo', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [timeoutEmbed], ephemeral: false });

            console.log(`[${new Date().toISOString()}] ${targetUser.tag} aislado por ${moderator.tag} durante ${durationMinutes} minutos. Motivo: ${reason}`);

        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error al aislar a ${targetUser.tag}:`, error);
            await interaction.editReply({ content: 'Ocurrió un error al intentar aislar a este usuario. Por favor, revisa mis permisos y la jerarquía de roles.', ephemeral: true });
        }
    },
};