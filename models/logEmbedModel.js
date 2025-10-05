// models/logEmbedModel.js
const { EmbedBuilder } = require('discord.js');

/**
 * Crea y retorna un embed para el registro de comandos.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction El objeto de interacción.
 * @returns {EmbedBuilder} El embed de registro.
 */
function getLogEmbed(interaction) {
    const user = interaction.user;
    const command = interaction.commandName;
    const channel = interaction.channel;

    const logEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('✍️ Comando Registrado')
        .addFields(
            { name: 'Usuario', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'Comando', value: `\`/${command}\``, inline: true },
            // Modificado: Se utiliza <#id> para que el canal sea clicable
            { name: 'Canal', value: `<#${channel.id}>`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Ejecutado en ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() });

    return logEmbed;
}

module.exports = {
    getLogEmbed
};