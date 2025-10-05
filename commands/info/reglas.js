// commands/info/reglas.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// --- TRADUCCIONES INTEGRADAS ---
const translations = {
    es: {
        rulesTitle: '📜 Reglas del Servidor',
        rulesDescription: 'Para una convivencia sana y un ambiente de rol inmersivo, por favor, sigue estas reglas:',
        rule1: '1. Respeto mutuo: Trata a todos con respeto, sin importar su rol o estatus.',
        rule2: '2. No spam: Evita el envío excesivo de mensajes o contenido irrelevante.',
        rule3: '3. Contenido apropiado: Mantén el contenido del servidor (mensajes, imágenes, enlaces) apto para todas las edades y libre de NSFW.',
        rule4: '4. Rol serio: Mantén el rol serio en los canales designados. Usa canales OOC (Out Of Character) para hablar fuera del rol.',
        rule5: '5. Uso de comandos: Utiliza los comandos del bot de forma adecuada y en los canales correctos.',
        rule6: '6. No metagaming/powergaming: Evita usar información fuera del rol en el rol, o crear personajes invencibles.',
        rule7: '7. Reporta abusos: Si ves a alguien rompiendo las reglas, repórtalo a un moderador.',
        footerText: '¡Gracias por ser parte de nuestra comunidad de rol!'
    },
    en: {
        rulesTitle: '📜 Server Rules',
        rulesDescription: 'For a healthy coexistence and an immersive roleplay environment, please follow these rules:',
        rule1: '1. Mutual respect: Treat everyone with respect, regardless of their role or status.',
        rule2: '2. No spam: Avoid excessive sending of messages or irrelevant content.',
        rule3: '3. Appropriate content: Keep server content (messages, images, links) suitable for all ages and free of NSFW.',
        rule4: '4. Serious roleplay: Maintain serious roleplay in designated channels. Use OOC (Out Of Character) channels for out-of-role discussion.',
        rule5: '5. Command usage: Use bot commands appropriately and in the correct channels.',
        rule6: '6. No metagaming/powergaming: Avoid using out-of-character information in roleplay, or creating invincible characters.',
        rule7: '7. Report abuses: If you see someone breaking the rules, report it to a moderator.',
        footerText: 'Thank you for being part of our roleplay community!'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reglas')
        .setDescription('Muestra las reglas del servidor.'),

    async execute(interaction, client, DniModel, ServerConfigModel, CharacterModel, WarningModel) {
        await interaction.deferReply();

        const guildId = interaction.guildId;
        const serverConfig = await client.config.loadConfig(guildId);
        const language = serverConfig && serverConfig.language ? serverConfig.language : 'es';
        const t = translations[language];

        const rulesEmbed = new EmbedBuilder()
            .setColor(0x8E44AD) // Un color morado
            .setTitle(t.rulesTitle)
            .setDescription(t.rulesDescription)
            .addFields(
                { name: '\u200b', value: t.rule1 }, // \u200b es un espacio en blanco invisible
                { name: '\u200b', value: t.rule2 },
                { name: '\u200b', value: t.rule3 },
                { name: '\u200b', value: t.rule4 },
                { name: '\u200b', value: t.rule5 },
                { name: '\u200b', value: t.rule6 },
                { name: '\u200b', value: t.rule7 }
            )
            .setTimestamp()
            .setFooter({ text: t.footerText, iconURL: client.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [rulesEmbed] });
    },
};
