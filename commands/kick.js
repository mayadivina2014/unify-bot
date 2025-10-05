// commands/mod/kick.js
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un usuario del servidor.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario a expulsar.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('El motivo de la expulsión.')
                .setRequired(false)), // Motivo opcional

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true }); // Responde de forma efímera mientras procesa

        const targetUser = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo') || 'No se proporcionó un motivo.';
        const moderator = interaction.user;
        const guild = interaction.guild;
        const member = guild.members.cache.get(targetUser.id);

        // --- Verificación de Permisos del Bot (Discord API) ---
        if (!guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.editReply({ content: 'No tengo permiso para expulsar miembros. Necesito el permiso "Expulsar miembros".', ephemeral: true });
        }

        // --- Verificación de Permisos Personalizados del Bot (desde config.yaml) ---
        // Asegurarse de que client.config.configs sea un Map y esté cargado
        if (!client.config || !(client.config.configs instanceof Map)) {
            // Esto solo se ejecutará si client.config no se inicializó correctamente en index.js
            // En un bot bien configurado, esto ya debería estar cargado.
            console.warn(`[${new Date().toISOString()}] client.config no cargado correctamente en kick.js. Intentando cargar.`);
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
                    console.error(`[${new Date().toISOString()}] Error al cargar config.yaml en kick.js:`, err);
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
        // Obtener roles del moderador
        const moderatorMember = guild.members.cache.get(moderator.id);
        if (moderatorMember) {
            for (const roleId of moderatorMember.roles.cache.keys()) {
                if (moderatorPermissions[roleId]?.canKick) {
                    hasPermission = true;
                    break;
                }
            }
        }
        
        // Si el moderador es el dueño del servidor, siempre tiene permiso
        if (moderator.id === guild.ownerId) {
            hasPermission = true;
        }

        if (!hasPermission) {
            return interaction.editReply({ content: 'No tienes permiso para usar el comando de expulsión del bot. Necesitas el permiso `Expulsar (Kick)` asignado a tu rol en la configuración del bot.', ephemeral: true });
        }

        // --- Validaciones Adicionales ---
        if (!member) {
            return interaction.editReply({ content: 'El usuario no está en este servidor o no se pudo encontrar.', ephemeral: true });
        }
        if (targetUser.id === moderator.id) {
            return interaction.editReply({ content: 'No puedes expulsarte a ti mismo.', ephemeral: true });
        }
        if (targetUser.id === client.user.id) {
            return interaction.editReply({ content: 'No puedes expulsar al bot.', ephemeral: true });
        }
        if (member.kickable === false) {
            // Verificar si el bot puede expulsar al miembro (jerarquía de roles)
            return interaction.editReply({ content: 'No puedo expulsar a este usuario. Podría tener un rol superior al mío o ser el dueño del servidor.', ephemeral: true });
        }

        try {
            // --- Enviar DM al Usuario Expulsado ---
            const dmEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(`🚨 Has sido expulsado de ${guild.name}`)
                .setDescription(`**Moderador:** ${moderator.tag}\n**Motivo:** ${reason}`)
                .setTimestamp()
                .setFooter({ text: 'Puedes intentar unirte de nuevo si la expulsión es temporal.' });

            try {
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.warn(`[${new Date().toISOString()}] No se pudo enviar DM a ${targetUser.tag} (${targetUser.id}) sobre la expulsión:`, dmError.message);
            }

            // --- Expulsar al usuario ---
            await member.kick(reason);

            // --- Enviar Embed de Confirmación al Canal ---
            const kickEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Usuario Expulsado')
                .addFields(
                    { name: 'Usuario', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
                    { name: 'Moderador', value: `${moderator.tag} (${moderator.id})`, inline: false },
                    { name: 'Motivo', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [kickEmbed], ephemeral: false }); // Responde públicamente en el canal donde se ejecutó

            console.log(`[${new Date().toISOString()}] ${targetUser.tag} expulsado por ${moderator.tag}. Motivo: ${reason}`);

        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error al expulsar a ${targetUser.tag}:`, error);
            await interaction.editReply({ content: 'Ocurrió un error al intentar expulsar a este usuario. Por favor, revisa mis permisos y la jerarquía de roles.', ephemeral: true });
        }
    },
};