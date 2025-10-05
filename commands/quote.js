// commands/quote.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    // Definición para slash command
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Te da una frase motivadora aleatoria.'),

    // Slash
    async execute(interaction) {
        try {
            const response = await axios.get('https://api.quotable.io/random');
            const { content, author } = response.data;

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📜 Frase motivadora')
                .setDescription(`"${content}"\n\n— **${author}**`)
                .setFooter({ text: `Pedido por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error al obtener la frase:', error);
            await interaction.reply({ content: 'Hubo un error al intentar obtener una frase. Inténtalo más tarde.', ephemeral: true });
        }
    },

    // Prefijo
    async executeMessage(message) {
        try {
            const response = await axios.get('https://api.quotable.io/random');
            const { content, author } = response.data;

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📜 Frase motivadora')
                .setDescription(`"${content}"\n\n— **${author}**`)
                .setFooter({ text: `Pedido por ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error al obtener la frase:', error);
            await message.reply('Hubo un error al intentar obtener una frase. Inténtalo más tarde.');
        }
    }
};
