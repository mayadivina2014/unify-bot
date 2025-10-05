// commands/dog.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dog')
        .setDescription('Te envía una foto aleatoria de un perro.'),

    async execute(interaction) {
        try {
            const response = await axios.get('https://dog.ceo/api/breeds/image/random');
            const dogImage = response.data.message;

            const embed = new EmbedBuilder()
                .setColor('#90BE6D')
                .setTitle('🐶 Aquí está tu perro')
                .setImage(dogImage)
                .setFooter({ text: `Pedido por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error al obtener la imagen del perro:', error);
            await interaction.reply({ content: 'Hubo un error al intentar obtener la imagen. Inténtalo más tarde.', ephemeral: true });
        }
    },

    async executeMessage(message) {
        try {
            const response = await axios.get('https://dog.ceo/api/breeds/image/random');
            const dogImage = response.data.message;

            const embed = new EmbedBuilder()
                .setColor('#90BE6D')
                .setTitle('🐶 Aquí está tu perro')
                .setImage(dogImage)
                .setFooter({ text: `Pedido por ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error al obtener la imagen del perro:', error);
            await message.reply('Hubo un error al intentar obtener la imagen. Inténtalo más tarde.');
        }
    }
};
