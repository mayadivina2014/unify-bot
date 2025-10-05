const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('flip')
        .setDescription('Lanza una moneda'),
    name: 'flip',
    description: 'Lanza una moneda',

    async executeSlash(interaction) {
        const result = Math.random() < 0.5 ? 'Cara' : 'Cruz';
        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('🪙 Lanzamiento de moneda')
            .setDescription(`Ha salido **${result}**`)
            .setFooter({ text: `Pedido por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message) {
        const result = Math.random() < 0.5 ? 'Cara' : 'Cruz';
        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('🪙 Lanzamiento de moneda')
            .setDescription(`Ha salido **${result}**`)
            .setFooter({ text: `Pedido por ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();
        await message.channel.send({ embeds: [embed] });
    }
};
