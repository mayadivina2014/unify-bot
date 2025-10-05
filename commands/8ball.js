// commands/8ball.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    // Definición para el comando de barra diagonal
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Responde a tu pregunta estilo bola 8 mágica.')
        .addStringOption(option =>
            option.setName('pregunta')
                .setDescription('La pregunta que quieres hacer.')
                .setRequired(true)
        ),

    // Lógica para el comando de barra diagonal
    async execute(interaction) {
        const responses = [
            'Sí, sin duda.', 'Parece prometedor.', 'Probablemente sí.', 'Claro que sí.', 'Es incierto, inténtalo de nuevo.',
            'Mejor no te digo ahora.', 'No puedo predecirlo ahora.', 'No cuentes con ello.', 'Mis fuentes dicen que no.', 'Dudo mucho que sí.'
        ];
        const question = interaction.options.getString('pregunta');
        const response = responses[Math.floor(Math.random() * responses.length)];
        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('🎱 Bola 8 Mágica')
            .addFields(
                { name: 'Tu pregunta', value: question },
                { name: 'Mi respuesta', value: response }
            );
        await interaction.reply({ embeds: [embed], ephemeral: false });
    },

    // Lógica para el comando de prefijo
    async executeMessage(message, args) {
        if (!args.length) {
            return message.reply('Por favor, haz una pregunta.');
        }
        const responses = [
            'Sí, sin duda.', 'Parece prometedor.', 'Probablemente sí.', 'Claro que sí.', 'Es incierto, inténtalo de nuevo.',
            'Mejor no te digo ahora.', 'No puedo predecirlo ahora.', 'No cuentes con ello.', 'Mis fuentes dicen que no.', 'Dudo mucho que sí.'
        ];
        const question = args.join(' ');
        const response = responses[Math.floor(Math.random() * responses.length)];
        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('🎱 Bola 8 Mágica')
            .addFields(
                { name: 'Tu pregunta', value: question },
                { name: 'Mi respuesta', value: response }
            );
        await message.reply({ embeds: [embed] });
    }
};
