// commands/kiss.js
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const axios = require('axios');
const mongoose = require('mongoose');

// -------------------------------------------------
// 1. Modelo de Mongoose para Besos
// -------------------------------------------------
// Definimos el esquema para almacenar los besos.
// Esto es un registro de la cantidad de besos entre un usuario y otro.
const kissSchema = new mongoose.Schema({
    senderId: { type: String, required: true },
    targetId: { type: String, required: true },
    count: { type: Number, default: 0 },
}, { timestamps: true });

// Creamos el modelo, verificando si ya existe para evitar errores de sobrescritura.
// Esto es importante si el archivo se requiere más de una vez.
const KissModel = mongoose.models.Kiss || mongoose.model('Kiss', kissSchema, 'kisses');

// -------------------------------------------------
// 2. Funciones de Utilidad
// -------------------------------------------------
/**
 * Obtiene un GIF aleatorio de un beso desde la API de nekos.best.
 * @returns {Promise<string|null>} La URL del GIF o null si ocurre un error.
 */
async function getKissGif() {
    console.log('[GIF] Buscando GIF en API...');
    try {
        const { data } = await axios.get('https://nekos.best/api/v2/kiss');
        if (data?.results?.[0]?.url) {
            console.log('[GIF] GIF obtenido:', data.results[0].url);
            return data.results[0].url;
        }
        console.warn('[GIF] La API no devolvió un GIF válido.');
        return null;
    } catch (error) {
        console.error('[GIF] Error al obtener el GIF:', error);
        return null;
    }
}

/**
 * Procesa el beso, actualiza el contador en la base de datos y envía el mensaje de respuesta.
 * @param {import('discord.js').Interaction} interaction El objeto de interacción.
 * @param {import('discord.js').User} sender El usuario que envía el beso.
 * @param {import('discord.js').User} targetUser El usuario que recibe el beso.
 * @param {boolean} isInitialCall Indica si es la primera vez que se llama desde el comando principal.
 */
async function processKiss(interaction, sender, targetUser) {
    console.log(`[KISS] Iniciando processKiss | sender=${sender.username} target=${targetUser.username}`);

    try {
        // Busca o crea un registro de beso entre los dos usuarios y lo incrementa.
        const kissEntry = await KissModel.findOneAndUpdate(
            { senderId: sender.id, targetId: targetUser.id },
            { $inc: { count: 1 } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log(`[KISS] Contador actualizado: ${kissEntry.count}`);

        const gifUrl = await getKissGif();
        if (!gifUrl) {
            const errorPayload = { content: 'No pude conseguir un GIF en este momento, pero el beso sigue contando 💔', components: [] };
            return interaction.deferred || interaction.replied
                ? interaction.editReply(errorPayload)
                : interaction.reply(errorPayload);
        }

        // Color aleatorio con 6 dígitos garantizados
        const randomColor = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        console.log(`[KISS] Color random generado: #${randomColor}`);

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: `${sender.username} le da un beso a ${targetUser.username} 💋`, 
                iconURL: sender.displayAvatarURL({ dynamic: true }) 
            })
            .setImage(gifUrl)
            .setColor(`#${randomColor}`)
            .setFooter({ text: `💞 Llevan ${kissEntry.count} beso${kissEntry.count === 1 ? '' : 's'}` })
            .setTimestamp();

        // Botones para la interacción
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`kiss_again_${sender.id}_${targetUser.id}`)
                .setLabel('Volver a besar')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💋'),
            new ButtonBuilder()
                .setCustomId('kiss_no')
                .setLabel('Parar por hoy')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🛑')
        );

        const payload = { embeds: [embed], components: [row] };
        
        return interaction.deferred || interaction.replied
            ? interaction.editReply(payload)
            : interaction.reply(payload);

    } catch (error) {
        console.error('[KISS] Error en processKiss:', error);
        const errorPayload = { content: 'Hubo un error al ejecutar el comando.', components: [] };
        return interaction.deferred || interaction.replied
            ? interaction.editReply(errorPayload)
            : interaction.reply(errorPayload);
    }
}

// -------------------------------------------------
// 3. Exportar Comando
// -------------------------------------------------
module.exports = {
    data: new SlashCommandBuilder()
        .setName('kiss')
        .setDescription('Besa a otro usuario con un gif de anime')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario al que quieres besar')
                .setRequired(true)
        ),

    async execute(interaction) {
        console.log('[CMD] /kiss ejecutado por', interaction.user.username);
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('usuario');
        const sender = interaction.user;

        if (targetUser.id === sender.id) {
            console.log('[KISS] Intento de beso a sí mismo bloqueado.');
            return interaction.editReply({ 
                content: 'No puedes besarte a ti mismo, pero aquí tienes un abrazo virtual 🤗', 
                ephemeral: true, 
                components: [] 
            });
        }
        
        await processKiss(interaction, sender, targetUser);

        // Collector para manejar las interacciones de los botones
        const collector = interaction.channel.createMessageComponentCollector({
            // El filtro se asegura de que solo el usuario que recibe el beso pueda usar los botones.
            filter: btn => btn.user.id === targetUser.id, 
            time: 60_000 // 60 segundos de tiempo de espera
        });

        collector.on('collect', async btn => {
            // El usuario que interactuó con el botón
            const collectorUser = btn.user;
            
            // Verificamos si el usuario es el que fue besado
            if (collectorUser.id !== targetUser.id) {
                return btn.reply({ 
                    content: 'Solo la persona besada puede usar estos botones.', 
                    ephemeral: true 
                });
            }

            if (btn.customId.startsWith('kiss_again_')) {
                console.log('[COLLECTOR] Botón "Volver a besar" presionado por el besado.');
                await btn.deferUpdate();
                
                // Extraemos los IDs del customId
                const [_, __, newSenderId, newTargetId] = btn.customId.split('_');

                const newSender = await interaction.client.users.fetch(newSenderId);
                const newTargetUser = await interaction.client.users.fetch(newTargetId);
                
                // Usamos los IDs extraídos para llamar a processKiss de nuevo.
                // Intercambiamos los roles para que el "besado" sea ahora el "besador".
                await processKiss(btn, newSender, newTargetUser);

            } else if (btn.customId === 'kiss_no') {
                console.log('[COLLECTOR] Botón "Parar por hoy" presionado por el besado.');
                await btn.deferUpdate();
                
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('kiss_again_disabled')
                        .setLabel('Volver a besar')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('kiss_no_disabled')
                        .setLabel('Parar por hoy')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
                
                await interaction.editReply({ content: '¡Hasta la próxima! 😘', components: [disabledRow] });
                collector.stop();
            }
        });

        collector.on('end', async (collected, reason) => {
            console.log(`[COLLECTOR] Finalizado. Razón: ${reason}.`);
            // Si el tiempo se acaba o el usuario presiona "Parar", se deshabilitan los botones.
            if (reason === 'time' || reason === 'user') {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('kiss_again_disabled')
                        .setLabel('Volver a besar')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('kiss_no_disabled')
                        .setLabel('Parar por hoy')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
                
                try {
                    await interaction.editReply({ components: [disabledRow] });
                } catch (e) {
                    // Evitamos el error 10008 (Mensaje desconocido) si el mensaje ya fue eliminado.
                    if (e.code !== 10008) console.error('[COLLECTOR]', e);
                }
            }
        });
    }
};
