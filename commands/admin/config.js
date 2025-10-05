// commands/admin/config.js
const {
    SlashCommandBuilder,
    PermissionsBitField,
    EmbedBuilder,
    ChannelType,
    ActionRowBuilder,
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder,
    ComponentType
} = require('discord.js');
const mongoose = require('mongoose');

// El modelo ya debería estar definido en un lugar central como index.js.
// Lo mantenemos aquí para asegurarnos de que no se sobrescriba.
const serverConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    language: { type: String, default: 'es' },
    prefix: { type: String, default: null },
    dniSettings: {
        country: { type: String, default: null }
    },
    rolePermissions: { type: Object, default: {} },
    logChannelId: { type: String, default: null }
}, { timestamps: true });

const ServerConfigModel = mongoose.models.ServerConfig ||
    mongoose.model('ServerConfig', serverConfigSchema, 'serverconfigs');

// --- Lógica del comando slash ---
module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configura las opciones del bot para este servidor.')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Establece la configuración de idioma, país y prefijo.')
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
                )
                .addStringOption(option =>
                    option.setName('prefixo')
                        .setDescription('Establece un prefijo para los comandos de texto (ej. !).')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-log-channel')
                .setDescription('Establece el canal donde se registrarán los comandos.')
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('Selecciona un canal de texto para registrar los comandos.')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName('permisos')
                .setDescription('Configura permisos específicos del bot para roles.')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('set-rol')
                        .setDescription('Asigna o modifica permisos del bot a un rol específico.')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('eliminar-rol')
                        .setDescription('Elimina las configuraciones de permisos del bot para un rol.')
                        .addRoleOption(option =>
                            option.setName('rol')
                                .setDescription('El rol al que se le eliminarán las configuraciones de permisos.')
                                .setRequired(true)
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Muestra la configuración actual del servidor.')
        ),

    /**
     * Lógica de ejecución del comando.
     * @param {import('discord.js').ChatInputCommandInteraction} interaction El objeto de interacción.
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            console.log(`[${new Date().toISOString()}] ${interaction.user.tag} intentó usar /config sin permisos de administrador.`);
            return interaction.editReply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
        }

        const guildId = interaction.guildId;
        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        let currentServerConfig = await ServerConfigModel.findOne({ guildId });

        if (!currentServerConfig) {
            currentServerConfig = new ServerConfigModel({ guildId });
            await currentServerConfig.save();
        }

        if (subcommand === 'set-log-channel') {
            const logChannel = interaction.options.getChannel('canal');

            currentServerConfig.logChannelId = logChannel.id;
            await currentServerConfig.save();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('⚙️ Canal de Registro Actualizado')
                .setDescription(`Se ha establecido el canal de registro en ${logChannel}.`)
                .setTimestamp()
                .setFooter({ text: `Configurado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.editReply({ embeds: [embed] });
            console.log(`[${new Date().toISOString()}] Canal de log guardado para el servidor ${interaction.guild.name}: ${logChannel.name} (${logChannel.id}).`);
        } else if (subcommand === 'set') {
            const language = interaction.options.getString('idioma');
            const country = interaction.options.getString('pais');
            const prefix = interaction.options.getString('prefixo') || null;

            currentServerConfig.language = language;
            if (!currentServerConfig.dniSettings) currentServerConfig.dniSettings = {};
            currentServerConfig.dniSettings.country = country;
            currentServerConfig.prefix = prefix;
            
            await currentServerConfig.save();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('⚙️ Configuración del Servidor Actualizada')
                .setDescription('¡La configuración de idioma, país y prefijo de este servidor ha sido actualizada con éxito!')
                .addFields(
                    { name: '🌐 Idioma del Bot', value: `\`${language.toUpperCase()}\``, inline: true },
                    { name: '🌍 País del DNI', value: `\`${country}\``, inline: true },
                    { name: '✍️ Prefijo de Comandos', value: prefix ? `\`${prefix}\`` : '`No configurado`', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Configurado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.editReply({ embeds: [embed] });
            console.log(`[${new Date().toISOString()}] Configuración guardada para el servidor ${interaction.guild.name}: Idioma ${language}, País ${country}, Prefijo ${prefix}.`);
        } else if (subcommandGroup === 'permisos') {
            if (interaction.user.id !== interaction.guild.ownerId) {
                console.log(`[${new Date().toISOString()}] ${interaction.user.tag} intentó usar /config permisos sin ser el dueño del servidor.`);
                return interaction.editReply({ content: 'Solo el dueño del servidor puede modificar los permisos de los roles del bot.', ephemeral: true });
            }

            if (!currentServerConfig.rolePermissions) currentServerConfig.rolePermissions = {};

            if (subcommand === 'set-rol') {
                const roleSelectRow = new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('select_role_for_perms')
                        .setPlaceholder('Selecciona un rol...')
                );
                
                await interaction.editReply({ 
                    content: 'Por favor, selecciona el rol al que deseas asignar permisos.', 
                    components: [roleSelectRow] 
                });

                const roleCollector = interaction.channel.createMessageComponentCollector({ 
                    componentType: ComponentType.RoleSelect,
                    filter: i => i.user.id === interaction.user.id,
                    time: 60000 
                });

                roleCollector.on('collect', async i => {
                    await i.deferUpdate();
                    const selectedRole = i.roles.first();
                    const roleId = selectedRole.id;
                    
                    // Obtiene los permisos existentes para el rol
                    const existingPerms = currentServerConfig.rolePermissions[roleId]?.canUse || [];

                    const permsSelectRow = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(`select_perms_${roleId}`)
                            .setPlaceholder('Selecciona los permisos...')
                            .setMinValues(1)
                            .setMaxValues(10) // Aumentamos el maxValues
                            .addOptions(
                                { label: 'Comando DNI (ver/añadir)', value: 'dni' },
                                { label: 'Comando Eliminar DNI', value: 'eliminar_dni' },
                                { label: 'Comando Modificar DNI', value: 'modificar_dni' },
                                { label: 'Comando para Crear un Embed', value: 'embed'},
                                { label: 'Comando Beso', value: 'kiss' },
                                { label: 'Comando Advertencia', value: 'warn' },
                                { label: 'Comando Tiempo de espera', value: 'timeout' },
                                { label: 'Comando Expulsar (kick)', value: 'kick' },
                                { label: 'Comando Purgar (purge)', value: 'purge' },
                                { label: 'Comando Baneo (ban)', value: 'ban' },
                                { label: 'Comando Enviar Mensaje', value: 'send_message' }
                            )
                    );

                    await interaction.editReply({
                        content: `Has seleccionado el rol **${selectedRole.name}**. Ahora, selecciona los comandos que pueden usar.`,
                        components: [permsSelectRow]
                    });

                    roleCollector.stop(); // Detenemos el primer collector

                    const permsCollector = interaction.channel.createMessageComponentCollector({
                        componentType: ComponentType.StringSelect,
                        filter: j => j.user.id === interaction.user.id,
                        time: 60000
                    });

                    permsCollector.on('collect', async j => {
                        await j.deferUpdate();
                        const newSelectedPerms = j.values;

                        // Combina los permisos existentes con los nuevos permisos y elimina duplicados
                        const allPerms = [...new Set([...existingPerms, ...newSelectedPerms])];

                        // Actualiza el objeto con el conjunto completo de permisos
                        currentServerConfig.rolePermissions[roleId] = {
                            canUse: allPerms
                        };
                        
                        // Marcamos el campo como modificado para asegurar que Mongoose lo guarde correctamente.
                        currentServerConfig.markModified('rolePermissions');
                        
                        await currentServerConfig.save();

                        const embed = new EmbedBuilder()
                            .setColor(0x00FF00)
                            .setTitle('✅ Permisos de Rol Actualizados')
                            .setDescription(`Los permisos del rol **${selectedRole.name}** han sido actualizados con éxito.`)
                            .addFields(
                                { name: 'Comandos permitidos', value: `\`${allPerms.join(', ')}\`` }
                            )
                            .setTimestamp();
                            
                        await interaction.editReply({ content: '', embeds: [embed], components: [] });
                        permsCollector.stop();
                    });

                    permsCollector.on('end', async (collected, reason) => {
                        if (reason === 'time') {
                            await interaction.editReply({ content: 'El tiempo de espera para seleccionar los permisos ha expirado.', components: [] });
                        }
                    });
                });

                roleCollector.on('end', async (collected, reason) => {
                    if (reason === 'time') {
                        await interaction.editReply({ content: 'El tiempo de espera para seleccionar el rol ha expirado.', components: [] });
                    }
                });

            } else if (subcommand === 'eliminar-rol') {
                const role = interaction.options.getRole('rol');
                if (role) {
                    delete currentServerConfig.rolePermissions[role.id];
                    currentServerConfig.markModified('rolePermissions');
                    await currentServerConfig.save();
                    await interaction.editReply({ content: `Permisos eliminados para el rol **${role.name}**.` });
                } else {
                    await interaction.editReply({ content: 'Por favor, proporciona un rol válido.', ephemeral: true });
                }
            }
        } else if (subcommand === 'show') {
            const configData = {
                'ID del Servidor': guildId,
                'Idioma': currentServerConfig.language,
                'País del DNI': currentServerConfig.dniSettings?.country || 'No configurado',
                'Prefijo de Comandos': currentServerConfig.prefix || 'No configurado',
                'Canal de Logs': currentServerConfig.logChannelId ? `<#${currentServerConfig.logChannelId}>` : 'No configurado'
            };

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('⚙️ Configuración Actual del Servidor')
                .setDescription('Aquí tienes la configuración actual de este servidor.')
                .setTimestamp()
                .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            for (const [key, value] of Object.entries(configData)) {
                // Se agregó una validación adicional para asegurar que el valor no sea null o undefined.
                embed.addFields({ name: key, value: `\`${value || 'N/A'}\``, inline: true });
            }

            if (Object.keys(currentServerConfig.rolePermissions).length > 0) {
                let permissionsList = '';
                for (const [roleId, perms] of Object.entries(currentServerConfig.rolePermissions)) {
                    const role = interaction.guild.roles.cache.get(roleId);
                    // Se agregó la validación para asegurar que perms.canUse sea un array antes de usar .join()
                    if (role && perms && Array.isArray(perms.canUse)) {
                        permissionsList += `**${role.name}**: \`${perms.canUse.join(', ')}\`\n`;
                    }
                }
                embed.addFields({ name: 'Permisos de Roles', value: permissionsList || 'No hay permisos configurados.', inline: false });
            }

            await interaction.editReply({ embeds: [embed] });
        }
    },
};
