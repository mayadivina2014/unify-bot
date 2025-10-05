// roll.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Tira un dado de 1 a 6'),

    name: 'roll', // para prefix
    description: 'Tira un dado de 1 a 6',

    async executeSlash(interaction) {
        const result = Math.floor(Math.random() * 6) + 1;

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('🎲 Tirada de dado')
            .setDescription(`Has sacado un **${result}**`)
            .setFooter({ text: `Pedido por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        const result = Math.floor(Math.random() * 6) + 1;

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('🎲 Tirada de dado')
            .setDescription(`Has sacado un **${result}**`)
            .setFooter({ text: `Pedido por ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }
};
