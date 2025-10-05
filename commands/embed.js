// commands/embed.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    // Define el comando de barra diagonal.
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Crea un mensaje embed personalizado con tus propios datos.')
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('El título del embed. (Requerido)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('descripcion')
                .setDescription('La descripción principal del embed. (Requerido)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('El color del borde del embed en formato hexadecimal (ej: #FF0000).'))
        .addStringOption(option =>
            option.setName('imagen')
                .setDescription('URL de la imagen grande en el embed.'))
        .addStringOption(option =>
            option.setName('thumbnail')
                .setDescription('URL de la miniatura en la esquina superior derecha.'))
        .addStringOption(option =>
            option.setName('url')
                .setDescription('URL del enlace del título.'))
        .addStringOption(option =>
            option.setName('footer')
                .setDescription('El texto que se mostrará en el pie de página.'))
        .addBooleanOption(option =>
            option.setName('timestamp')
                .setDescription('Si se debe incluir una marca de tiempo en el embed (True/False).')),
        
    // Lógica para ejecutar el comando.
    async execute(interaction) {
        // Obtenemos los valores de las opciones.
        const title = interaction.options.getString('titulo');
        const description = interaction.options.getString('descripcion');
        const color = interaction.options.getString('color');
        const image = interaction.options.getString('imagen');
        const thumbnail = interaction.options.getString('thumbnail');
        const url = interaction.options.getString('url');
        const footerText = interaction.options.getString('footer');
        const addTimestamp = interaction.options.getBoolean('timestamp');

        try {
            // Respondemos de forma efímera para ocultar el mensaje de "usuario usó /embed".
            // Agregamos un mensaje para que veas que la primera respuesta es efímera.
            await interaction.reply({ content: 'Creando tu embed...', ephemeral: true });

            // Crea una nueva instancia de EmbedBuilder.
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description);

            // Si se proporciona un color válido, lo establece.
            if (color) {
                // Validación simple del formato hex.
                const hexColor = color.startsWith('#') ? color : `#${color}`;
                if (/^#([0-9A-F]{3}){1,2}$/i.test(hexColor)) {
                    embed.setColor(hexColor);
                } else {
                    console.warn(`[${new Date().toISOString()}] Color hexadecimal inválido proporcionado: ${color}`);
                    embed.setColor(0x0099FF); // Color por defecto (un azul claro)
                }
            } else {
                embed.setColor(0x0099FF); // Color por defecto si no se especifica.
            }
            
            // Si las opciones opcionales están presentes, las agrega al embed.
            if (image) {
                embed.setImage(image);
            }
            if (thumbnail) {
                embed.setThumbnail(thumbnail);
            }
            if (url) {
                embed.setURL(url);
            }
            if (footerText) {
                embed.setFooter({ text: footerText });
            }
            if (addTimestamp) {
                embed.setTimestamp();
            }

            // Usamos followUp para enviar el embed como un mensaje nuevo, visible para todos.
            await interaction.followUp({ embeds: [embed], ephemeral: false });

        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error al ejecutar el comando /embed:`, error);
            const errorMessage = `Hubo un error al ejecutar este comando. \`\`\`${error.message}\`\`\``;
            
            // Si la interacción ya ha sido respondida, editamos la respuesta inicial efímera.
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: errorMessage, embeds: [], components: [] });
            } else {
                // Si no, respondemos con un mensaje efímero de error.
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
};
