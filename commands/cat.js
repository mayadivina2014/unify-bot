// commands/cat.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cat')
        .setDescription('Te envía una foto aleatoria de un gato.'),

    async execute(interaction) {
        try {
            const response = await axios.get('https://api.thecatapi.com/v1/images/search');
            const catImage = response.data[0].url;

            const embed = new EmbedBuilder()
                .setColor('#F9C74F')
                .setTitle('🐱 Aquí está tu gato')
                .setImage(catImage)
                .setFooter({ text: `Pedido por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error al obtener la imagen del gato:', error);
            await interaction.reply({ content: 'Hubo un error al intentar obtener la imagen. Inténtalo más tarde.', ephemeral: true });
        }
    },

    async executeMessage(message) {
        try {
            const response = await axios.get('https://api.thecatapi.com/v1/images/search');
            const catImage = response.data[0].url;

            const embed = new EmbedBuilder()
                .setColor('#F9C74F')
                .setTitle('🐱 Aquí está tu gato')
                .setImage(catImage)
                .setFooter({ text: `Pedido por ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error al obtener la imagen del gato:', error);
            await message.reply('Hubo un error al intentar obtener la imagen. Inténtalo más tarde.');
        }
    }
};
