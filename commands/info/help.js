// commands/info/help.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const path = require('node:path');
const { readdirSync } = require('node:fs');

// --- TRADUCCIONES INTEGRADAS ---
const translations = {
    es: {
        helpTitle: '📚 Guía de Comandos de {botName}',
        helpDescription: 'Selecciona una categoría para ver los comandos disponibles.',
        categoryModeration: '🛡️ Moderación',
        categoryRol: '🎭 Rol de Personaje',
        categoryInfo: 'ℹ️ Información',
        categoryAdmin: '⚙️ Administración del Bot',
        noCommandsInCategory: 'No hay comandos disponibles en esta categoría.',
        selectPlaceholder: 'Selecciona una categoría...',
        footerText: 'Usa /help para ver esta guía.',
        commandName: 'Comando',
        commandDescription: 'Descripción'
    },
    en: {
        helpTitle: '📚 {botName} Command Guide',
        helpDescription: 'Select a category to view available commands.',
        categoryModeration: '🛡️ Moderation',
        categoryRol: '🎭 Character Roleplay',
        categoryInfo: 'ℹ️ Information',
        categoryAdmin: '⚙️ Bot Administration',
        noCommandsInCategory: 'No commands available in this category.',
        selectPlaceholder: 'Select a category...',
        footerText: 'Use /help to view this guide.',
        commandName: 'Command',
        commandDescription: 'Description'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Muestra una guía de todos los comandos del bot.'),

    async execute(interaction, client, DniModel, ServerConfigModel, CharacterModel, WarningModel) {
        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guildId;
        const serverConfig = await client.config.loadConfig(guildId);
        const language = serverConfig && serverConfig.language ? serverConfig.language : 'es';
        const t = translations[language];

        // Mapeo de categorías a nombres de carpetas y títulos traducidos
        const categories = {
            'Moderación': { folder: 'moderacion', title: t.categoryModeration },
            'Rol de Personaje': { folder: 'rol', title: t.categoryRol },
            'Información': { folder: 'info', title: t.categoryInfo },
            'Administración del Bot': { folder: 'admin', title: t.categoryAdmin }
        };

        const initialEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle(t.helpTitle.replace('{botName}', client.user.username))
            .setDescription(t.helpDescription)
            .setTimestamp()
            .setFooter({ text: t.footerText, iconURL: client.user.displayAvatarURL() });

        const options = Object.keys(categories).map(categoryName => ({
            label: categories[categoryName].title,
            description: `Ver comandos de ${categories[categoryName].title.toLowerCase()}`,
            value: categoryName // Usamos el nombre de la categoría como valor
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder(t.selectPlaceholder)
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({ embeds: [initialEmbed], components: [row], ephemeral: true });

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.customId === 'help_category_select' && i.user.id === interaction.user.id,
            time: 120000 // 2 minutos para interactuar
        });

        collector.on('collect', async i => {
            await i.deferUpdate();
            const selectedCategoryName = i.values[0]; // Obtener el nombre de la categoría seleccionada
            const categoryInfo = categories[selectedCategoryName];

            if (!categoryInfo) {
                return i.editReply({ content: 'Categoría no válida.', embeds: [], components: [row], ephemeral: true });
            }

            const categoryFolder = categoryInfo.folder;
            const categoryTitle = categoryInfo.title;

            const categoryCommands = client.commands.filter(cmd => {
                const cmdPath = cmd.data.name; // Asumiendo que el nombre del comando es suficiente para inferir la carpeta
                // Esto es una simplificación. Un enfoque más robusto sería guardar la ruta completa en client.commands
                // o tener un mapeo explícito de comandos a categorías.
                // Por ahora, inferimos la categoría por el nombre del comando o por su ubicación en el sistema de archivos.
                // Para este ejemplo, asumimos que los comandos en 'admin' son de admin, 'info' de info, etc.
                if (categoryFolder === 'admin' && ['config', 'setup'].includes(cmdPath)) return true;
                if (categoryFolder === 'info' && ['status', 'help', 'reglas'].includes(cmdPath)) return true;
                if (categoryFolder === 'moderacion' && ['warn'].includes(cmdPath)) return true; // Añadir aquí otros comandos de moderación
                if (categoryFolder === 'rol' && ['dni'].includes(cmdPath)) return true; // Añadir aquí otros comandos de rol
                
                // Si el comando no está en las listas explícitas, intentamos inferir por la ruta del archivo
                // Esto requiere que los comandos se carguen con su ruta completa o que se añada un campo 'category'
                // al objeto 'command' al cargarlo en index.js.
                // Por simplicidad para este ejemplo, nos basamos en los nombres de comandos conocidos.
                return false; 
            });

            let commandsList = '';
            if (categoryCommands.size > 0) {
                for (const cmd of categoryCommands.values()) {
                    commandsList += `**\`/${cmd.data.name}\`**: ${cmd.data.description}\n`;
                }
            } else {
                commandsList = t.noCommandsInCategory;
            }

            const categoryEmbed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle(`${categoryTitle} ${t.commandName}s`)
                .setDescription(commandsList)
                .setTimestamp()
                .setFooter({ text: t.footerText, iconURL: client.user.displayAvatarURL() });

            await i.editReply({ embeds: [categoryEmbed], components: [row], ephemeral: true });
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                await interaction.editReply({ content: 'El tiempo para interactuar con la guía de ayuda ha caducado.', embeds: [], components: [], ephemeral: true }).catch(console.error);
            }
        });
    }
};
