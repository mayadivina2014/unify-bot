// commands/info/status.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    // Define los datos del comando slash
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Muestra el estado actual del bot, tiempo encendido, ID, etc.'),

    // Función que se ejecuta cuando se usa el comando
    async execute(interaction) {
        // Deferir la respuesta para asegurar que no expire la interacción
        await interaction.deferReply();

        // Calcular el tiempo que el bot lleva encendido
        const uptimeMilliseconds = interaction.client.uptime;
        const seconds = Math.floor(uptimeMilliseconds / 1000) % 60;
        const minutes = Math.floor(uptimeMilliseconds / (1000 * 60)) % 60;
        const hours = Math.floor(uptimeMilliseconds / (1000 * 60 * 60)) % 24;
        const days = Math.floor(uptimeMilliseconds / (1000 * 60 * 60 * 24));

        const uptime = `${days > 0 ? `${days}d ` : ''}${hours > 0 ? `${hours}h ` : ''}${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`;

        // Obtener la información del bot
        const botUserId = interaction.client.user.id;
        const botUsername = interaction.client.user.username;
        const botTag = interaction.client.user.tag;
        const guildCount = interaction.client.guilds.cache.size;
        
        // Calcular el número de usuarios atendidos (suma de miembros en todos los servidores)
        // Esto requiere el intent GatewayIntentBits.GuildMembers en index.js y que el bot tenga permisos de ver miembros
        const userCount = interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

        // Obtener la latencia de la API de Discord
        const apiLatency = Math.round(interaction.client.ws.ping);

        // Crear el embed para mostrar la información
        const statusEmbed = new EmbedBuilder()
            .setColor(0x0099FF) // Un color azul bonito
            .setTitle('📊 Estado del Bot')
            .setDescription('Aquí tienes la información actual de **SISTEM**:')
            .addFields(
                { name: '🟢 Tiempo Encendido', value: `\`${uptime}\``, inline: true },
                { name: '🆔 ID de Usuario del Bot', value: `\`${botUserId}\``, inline: true },
                { name: '👤 Nombre de Usuario del Bot', value: `\`${botUsername}\` (\`${botTag}\`)`, inline: false },
                { name: '🏠 Servidores', value: `\`${guildCount}\``, inline: true },
                { name: '👥 Usuarios Atendidos', value: `\`${userCount}\` (estimado)`, inline: true },
                { name: '📡 Latencia de la API', value: `\`${apiLatency}ms\``, inline: true }
            )
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        // Editar la respuesta diferida con el embed
        await interaction.editReply({ embeds: [statusEmbed] });
    },
};
