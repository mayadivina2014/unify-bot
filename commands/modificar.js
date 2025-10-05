// commands/modificar.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField } = require('discord.js');
const axios = require('axios');

// --- Funciones de Utilidad ---
function calculateAge(birthDateString) {
    const parts = birthDateString.split('/');
    if (parts.length !== 3) return 'N/A';
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    const birthDate = new Date(year, month, day);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// --- Definición del Comando Slash ---
module.exports = {
    data: new SlashCommandBuilder()
        .setName('modificar')
        .setDescription('Modifica la información de DNI/RUN/NIT de un usuario.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('dni')
                .setDescription('Modifica el DNI de un usuario.')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario cuyo DNI quieres modificar. (Deja vacío para el tuyo)')
                        .setRequired(false)
                )
        ),

    async execute(interaction, client, DniModel) { // Ahora recibe DniModel
        console.log(`[${new Date().toISOString()}] Comando /modificar dni ejecutado por ${interaction.user.tag} en el servidor ${interaction.guild.name}.`);
        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guildId;
        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        const executor = interaction.user;
        const member = interaction.member;

        const serverConfig = client.config.get(guildId);
        const language = serverConfig ? serverConfig.language : 'es';

        const translations = {
            es: {
                noPermission: 'No tienes permisos para usar el comando de modificar DNI.',
                noPermissionOther: 'No tienes permisos para modificar el DNI de otros usuarios.',
                selectField: 'Selecciona un campo a modificar',
                noDNI: `El usuario ${targetUser.username} no tiene un DNI/RUN/NIT registrado en este servidor.`,
                fieldOptions: [
                    { label: 'Primer Nombre', value: 'firstName' },
                    { label: 'Segundo Nombre', value: 'secondName' },
                    { label: 'Primer Apellido', value: 'firstLastName' },
                    { label: 'Segundo Apellido', value: 'secondLastName' },
                    { label: 'Fecha de Nacimiento (DD/MM/YYYY)', value: 'dob' },
                    { label: 'Sexo', value: 'gender' },
                    { label: 'Nacionalidad', value: 'nationality' },
                    { label: 'Nombre de Roblox', value: 'robloxName' },
                ],
                modalTitles: {
                    firstName: 'Modificar Primer Nombre',
                    secondName: 'Modificar Segundo Nombre',
                    firstLastName: 'Modificar Primer Apellido',
                    secondLastName: 'Modificar Segundo Apellido',
                    dob: 'Modificar Fecha Nac.',
                    gender: 'Modificar Sexo',
                    nationality: 'Modificar Nacionalidad',
                    robloxName: 'Modificar Nombre Roblox',
                },
                modalLabels: {
                    firstName: 'Nuevo Primer Nombre',
                    secondName: 'Nuevo Segundo Nombre',
                    firstLastName: 'Nuevo Primer Apellido',
                    secondLastName: 'Nuevo Segundo Apellido',
                    dob: 'Nueva Fecha (DD/MM/YYYY)',
                    gender: 'Nuevo Sexo (Masculino/Femenino/Otro)',
                    nationality: 'Nueva Nacionalidad',
                    robloxName: 'Nuevo Nombre de Roblox',
                },
                newValPlaceholder: 'Ingresa el nuevo valor aquí...',
                confirmUpdate: 'DNI actualizado',
                dniUpdated: 'La información del DNI/RUN/NIT ha sido actualizada correctamente.',
                errorFetchingAvatar: 'Error al actualizar el avatar de Roblox. El resto de los datos fueron guardados.',
                invalidDate: 'Formato de fecha de nacimiento inválido. Debe ser DD/MM/YYYY. El campo no fue actualizado.',
                invalidGender: 'Sexo inválido. Opciones válidas: Masculino, Femenino, Otro. El campo no fue actualizado.',
                dniModifiedSuccessfully: 'DNI modificado exitosamente.',
                selectOptionBelow: 'Selecciona la opción a modificar a continuación:',
                modalTimeout: 'El tiempo para responder al formulario ha caducado o hubo un error.',
                operationFailed: 'La modificación del DNI no se pudo completar. Inténtalo de nuevo.',
                menuTimeout: 'El tiempo para seleccionar una opción de modificación de DNI/RUN/NIT ha caducado.'
            },
        };

        const t = translations[language];

        // --- Verificación de Permisos ---
        const hasDiscordAdminPermission = member.permissions.has(PermissionsBitField.Flags.Administrator);
        let hasBotModifyDNIPermission = false;
        if (serverConfig && serverConfig.rolePermissions) {
            for (const roleId of member.roles.cache.keys()) {
                if (serverConfig.rolePermissions[roleId] && serverConfig.rolePermissions[roleId].canModifyDNI) {
                    hasBotModifyDNIPermission = true;
                    break;
                }
            }
        }

        if (targetUser.id !== executor.id && !hasDiscordAdminPermission && !hasBotModifyDNIPermission) {
            console.log(`[${new Date().toISOString()}] ${executor.tag} intentó modificar el DNI de ${targetUser.tag} sin permisos de Discord ni del bot.`);
            return interaction.editReply({ content: t.noPermissionOther, ephemeral: true });
        }
        
        if (targetUser.id === executor.id && !hasDiscordAdminPermission && !hasBotModifyDNIPermission) {
            console.log(`[${new Date().toISOString()}] ${executor.tag} intentó modificar su propio DNI sin permisos de Discord ni del bot.`);
            return interaction.editReply({ content: t.noPermission, ephemeral: true });
        }

        // --- Búsqueda en MongoDB ---
        let userData = await DniModel.findOne({ guildId: guildId, userId: targetUser.id });

        if (!userData) {
            console.log(`[${new Date().toISOString()}] No se encontró DNI para ${targetUser.tag} en el servidor ${interaction.guild.name}.`);
            return interaction.editReply({ content: t.noDNI, ephemeral: true });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`modificar_dni_select_${targetUser.id}`)
            .setPlaceholder(t.selectField)
            .addOptions(t.fieldOptions.map(option => ({
                label: option.label,
                value: option.value,
            })));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({
            content: `**${targetUser.username}**: ${t.selectOptionBelow}`,
            components: [row],
            ephemeral: true
        });
        console.log(`[${new Date().toISOString()}] Menú de selección de DNI enviado (efímero) para ${targetUser.tag}.`);

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.customId === `modificar_dni_select_${targetUser.id}` && i.user.id === executor.id,
            time: 60000,
            message: await interaction.fetchReply()
        });

        collector.on('collect', async i => {
            console.log(`[${new Date().toISOString()}] ${executor.tag} seleccionó una opción (${i.values[0]}) en el menú de modificación de DNI para ${targetUser.tag}.`);
            collector.stop();

            const selectedField = i.values[0];

            const modalTitle = t.modalTitles[selectedField] || `Modificar ${selectedField}`;
            const modalLabel = t.modalLabels[selectedField] || `Nuevo valor para ${selectedField}`;

            const modal = new ModalBuilder()
                .setCustomId(`modificar_dni_modal_${selectedField}_${targetUser.id}`)
                .setTitle(modalTitle.substring(0, 45));

            const textInput = new TextInputBuilder()
                .setCustomId(`new_value_${selectedField}`)
                .setLabel(modalLabel.substring(0, 45))
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(t.newValPlaceholder)
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(textInput);
            modal.addComponents(firstActionRow);

            try {
                await i.showModal(modal);
                console.log(`[${new Date().toISOString()}] Modal de modificación para '${selectedField}' mostrado a ${executor.tag}.`);

                await interaction.editReply({
                    content: `**${targetUser.username}**: ${t.fieldOptions.find(opt => opt.value === selectedField).label} se está modificando...`,
                    components: [],
                    embeds: []
                }).catch(editErr => {
                    console.error(`[${new Date().toISOString()}] Error al editar el mensaje efímero después de mostrar el modal:`, editErr);
                });
                console.log(`[${new Date().toISOString()}] Mensaje efímero del menú de selección editado y componentes eliminados.`);

            } catch (modalError) {
                console.error(`[${new Date().toISOString()}] Error al mostrar el modal a ${executor.tag}:`, modalError);
                await i.followUp({ content: t.operationFailed, ephemeral: true }).catch(console.error);
                await interaction.editReply({ content: `**${targetUser.username}**: ${t.operationFailed}`, components: [], embeds: [] }).catch(console.error);
                return;
            }

            const modalFilter = (modalInteraction) => modalInteraction.customId === `modificar_dni_modal_${selectedField}_${targetUser.id}` && modalInteraction.user.id === executor.id;
            const submittedModal = await i.awaitModalSubmit({ filter: modalFilter, time: 300000 })
                .catch(error => {
                    console.error(`[${new Date().toISOString()}] Error al esperar el modal de modificación para '${selectedField}': ${error.message}`);
                    interaction.editReply({ content: t.modalTimeout, components: [], embeds: [] }).catch(console.error);
                    return null;
                });

            if (!submittedModal) {
                console.log(`[${new Date().toISOString()}] Modal de modificación para '${selectedField}' no enviado a tiempo por ${executor.tag}.`);
                return;
            }

            console.log(`[${new Date().toISOString()}] Modal de modificación para '${selectedField}' enviado por ${executor.tag}.`);
            await submittedModal.deferReply({ ephemeral: true });

            const newValue = submittedModal.fields.getTextInputValue(`new_value_${selectedField}`);

            let updateData = {};
            let isUpdateValid = true;
            let errorMessage = '';

            switch (selectedField) {
                case 'firstName':
                case 'secondName':
                case 'firstLastName':
                case 'secondLastName':
                case 'nationality':
                    updateData[selectedField] = newValue;
                    break;
                case 'dob':
                    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
                    if (dateRegex.test(newValue)) {
                        updateData.dob = newValue;
                        updateData.age = calculateAge(newValue);
                    } else {
                        isUpdateValid = false;
                        errorMessage = t.invalidDate;
                    }
                    break;
                case 'gender':
                    const validGenders = ['Masculino', 'Femenino', 'Otro'];
                    if (validGenders.includes(newValue)) {
                        updateData.gender = newValue;
                    } else {
                        isUpdateValid = false;
                        errorMessage = t.invalidGender;
                    }
                    break;
                case 'robloxName':
                    updateData.robloxName = newValue;
                    let newRobloxAvatarUrl = null;
                    try {
                        const userSearchResponse = await axios.post('https://users.roblox.com/v1/usernames/users', {
                            usernames: [newValue],
                            excludeBannedUsers: true
                        });
                        if (userSearchResponse.data && userSearchResponse.data.data && userSearchResponse.data.data.length > 0) {
                            const robloxUserId = userSearchResponse.data.data[0].id;
                            const avatarResponse = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${robloxUserId}&size=420x420&format=Png&isCircular=false`);
                            if (avatarResponse.data.data && avatarResponse.data.data.length > 0) {
                                newRobloxAvatarUrl = avatarResponse.data.data[0].imageUrl;
                            } else {
                                console.warn(`[${new Date().toISOString()}] No se pudo obtener el avatar de Roblox para el nuevo nombre: ${newValue}`);
                            }
                        } else {
                            console.warn(`[${new Date().toISOString()}] No se encontró ID de usuario de Roblox para el nuevo nombre: ${newValue}`);
                        }
                    } catch (error) {
                        console.error(`[${new Date().toISOString()}] Error al actualizar avatar de Roblox durante modificación para ${targetUser.tag}: ${error.message}`);
                        await submittedModal.followUp({ content: t.errorFetchingAvatar, ephemeral: true });
                    }
                    updateData.robloxAvatarUrl = newRobloxAvatarUrl;
                    break;
            }

            if (isUpdateValid) {
                try {
                    await DniModel.updateOne({ guildId: guildId, userId: targetUser.id }, { $set: updateData });
                    console.log(`[${new Date().toISOString()}] DNI de ${targetUser.tag} actualizado: Campo '${selectedField}' a '${newValue}'.`);

                    const updatedEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle(t.confirmUpdate)
                        .setDescription(`${t.dniUpdated}\n**Campo modificado:** ${t.fieldOptions.find(opt => opt.value === selectedField).label}\n**Nuevo valor:** ${newValue}`)
                        .setTimestamp();
                    await submittedModal.editReply({ embeds: [updatedEmbed] });

                    await interaction.editReply({
                        content: `¡La información de DNI/RUN/NIT de **${targetUser.username}** ha sido actualizada!`,
                        components: [],
                        embeds: []
                    }).catch(console.error);

                } catch (error) {
                    console.error(`[${new Date().toISOString()}] Error al guardar en MongoDB durante la modificación para ${targetUser.tag}:`, error);
                    await submittedModal.editReply({ content: t.operationFailed });
                    await interaction.editReply({ content: `**${targetUser.username}**: ${t.operationFailed}`, components: [], embeds: [] }).catch(console.error);
                }
            } else {
                console.log(`[${new Date().toISOString()}] El campo '${selectedField}' no se pudo actualizar debido a datos inválidos para ${targetUser.tag}.`);
                await submittedModal.editReply({ content: errorMessage });
                await interaction.editReply({ content: `**${targetUser.username}**: La modificación del campo ${t.fieldOptions.find(opt => opt.value === selectedField).label} no se pudo completar.`, components: [], embeds: [] }).catch(console.error);
            }
        });

        collector.on('end', async collected => {
            if (collected.size === 0) {
                console.log(`[${new Date().toISOString()}] Tiempo de selección de menú caducado para ${executor.tag}.`);
                await interaction.editReply({ content: `**${targetUser.username}**: ${t.menuTimeout}`, components: [], embeds: [] }).catch(console.error);
            }
        });
    }
};