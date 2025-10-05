const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configura las opciones iniciales del bot para este servidor (solo para el dueño).')
        .addStringOption(option =>
            option.setName('idioma')
                .setDescription('Selecciona el idioma preferido para el bot.')
                .setRequired(true)
                .addChoices(
                    { name: 'Español (ES)', value: 'es' },
                    { name: 'Português (PT)', value: 'pt' },
                    { name: 'English (EN)', value: 'en' }
                )
        )
        .addStringOption(option =>
            option.setName('pais')
                .setDescription('Selecciona el país asociado al DNI/RUN/NIT.')
                .setRequired(true)
                .addChoices(
                    { name: 'Chile (CL)', value: 'CL' },
                    { name: 'Argentina (AR)', value: 'AR' },
                    { name: 'Brasil (BR)', value: 'BR' },
                    { name: 'Bolivia (BO)', value: 'BO' },
                    { name: 'Perú (PE)', value: 'PE' },
                    { name: 'Colombia (CO)', value: 'CO' },
                    { name: 'México (MX)', value: 'MX' },
                    { name: 'Uruguay (UY)', value: 'UY' },
                    { name: 'Paraguay (PY)', value: 'PY' },
                    { name: 'Ecuador (EC)', value: 'EC' },
                    { name: 'Venezuela (VE)', value: 'VE' },
                    { name: 'Guatemala (GT)', value: 'GT' },
                    { name: 'El Salvador (SV)', value: 'SV' },
                    { name: 'Honduras (HN)', value: 'HN' },
                    { name: 'Nicaragua (NI)', value: 'NI' },
                    { name: 'Costa Rica (CR)', value: 'CR' },
                    { name: 'Panamá (PA)', value: 'PA' },
                    { name: 'Rep. Dominicana (DO)', value: 'DO' },
                    { name: 'Cuba (CU)', value: 'CU' }
                )
        ),
    
    // Este comando ahora solo recibe interaction, client y ServerConfigModel
    async execute(interaction, client, DniModel, ServerConfigModel) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            console.log(`[${new Date().toISOString()}] ${interaction.user.tag} intentó usar /setup sin ser el dueño del servidor.`);
            return interaction.reply({ content: 'Solo el dueño del servidor puede usar este comando.', ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guildId;
        const language = interaction.options.getString('idioma');
        const country = interaction.options.getString('pais');

        const newConfig = {
            language: language,
            dniSettings: { country: country }
        };

        try {
            await client.config.set(guildId, newConfig);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Configuración Inicial Completada')
                .setDescription('¡La configuración de tu servidor ha sido establecida con éxito! Ya puedes usar los demás comandos del bot.')
                .addFields(
                    { name: '🌐 Idioma del Bot', value: `\`${language.toUpperCase()}\``, inline: true },
                    { name: '🌍 País Predeterminado', value: `\`${country}\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Configurado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.editReply({ embeds: [embed], ephemeral: true });
            console.log(`[${new Date().toISOString()}] Configuración inicial guardada para el servidor ${interaction.guild.name}.`);

        } catch (e) {
            console.error(`[${new Date().toISOString()}] Error al guardar la configuración inicial en MongoDB:`, e);
            await interaction.editReply({ content: 'Hubo un error al guardar la configuración inicial. Por favor, revisa los logs del bot.', ephemeral: true });
        }
    }
};
