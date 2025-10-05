// commands/joke.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    // Definición para el comando de barra diagonal
    data: new SlashCommandBuilder()
        .setName('joke')
        .setDescription('Te cuenta un chiste aleatorio.'),

    // Lógica para el comando de barra diagonal
    async execute(interaction) {
        try {
            const response = await axios.get('https://v2.jokeapi.dev/joke/Any?lang=es');
            const data = response.data;
            let jokeText = '';
            if (data.type === 'single') {
                jokeText = data.joke;
            } else if (data.type === 'twopart') {
                jokeText = `${data.setup}\n\n||${data.delivery}||`;
            }
            const embed = new EmbedBuilder()
                .setColor(0xFF5733)
                .setTitle('😂 Chiste del día')
                .setDescription(jokeText);
            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error) {
            console.error('Error al obtener el chiste:', error);
            await interaction.reply({ content: 'Hubo un error al intentar obtener un chiste. Inténtalo de nuevo más tarde.', ephemeral: true });
        }
    },

    // Lógica para el comando de prefijo
    async executeMessage(message) {
        try {
            const response = await axios.get('https://v2.jokeapi.dev/joke/Any?lang=es');
            const data = response.data;
            let jokeText = '';
            if (data.type === 'single') {
                jokeText = data.joke;
            } else if (data.type === 'twopart') {
                jokeText = `${data.setup}\n\n||${data.delivery}||`;
            }
            const embed = new EmbedBuilder()
                .setColor(0xFF5733)
                .setTitle('😂 Chiste del día')
                .setDescription(jokeText);
            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error al obtener el chiste:', error);
            await message.reply('Hubo un error al intentar obtener un chiste. Inténtalo de nuevo más tarde.');
        }
    }
};
