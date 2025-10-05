// commands/dni.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionsBitField } = require('discord.js');
const axios = require('axios');

// --- Funciones de Utilidad ---
/**
 * Calcula la edad a partir de una cadena de fecha de nacimiento.
 * @param {string} birthDateString - La fecha de nacimiento en formato DD/MM/YYYY.
 * @returns {number|null} La edad calculada o null si la fecha es inválida.
 */
function calculateAge(birthDateString) {
    if (!birthDateString || typeof birthDateString !== 'string') {
        console.warn(`[${new Date().toISOString()}] calculateAge recibió una fecha inválida (nula/indefinida/no-string): "${birthDateString}"`);
        return null;
    }

    const parts = birthDateString.split('/');
    
    if (parts.length !== 3) {
        console.warn(`[${new Date().toISOString()}] calculateAge recibió un formato de fecha incorrecto (no 3 partes): "${birthDateString}"`);
        return null;
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
        console.warn(`[${new Date().toISOString()}] calculateAge no pudo parsear los números de la fecha: "${birthDateString}"`);
        return null;
    }

    const birthDate = new Date(year, month, day);

    if (isNaN(birthDate.getTime()) || birthDate.getDate() !== day || birthDate.getMonth() !== month || birthDate.getFullYear() !== year) {
        console.warn(`[${new Date().toISOString()}] calculateAge creó una fecha inválida (componentes no coinciden): "${birthDateString}"`);
        return null;
    }

    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// Función auxiliar para generar números aleatorios con padding
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad(num, size) {
    let s = num.toString();
    while (s.length < size) s = "0" + s;
    return s;
}

function generateCountryID(countryCode) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    switch (countryCode) {
        case 'CL': // Chile - RUT / RUN
            let rutBaseCL = String(getRandomInt(4000000, 25999999));
            let sumCL = 0;
            let multiplierCL = 2;
            for (let i = rutBaseCL.length - 1; i >= 0; i--) {
                sumCL += parseInt(rutBaseCL[i]) * multiplierCL;
                multiplierCL++;
                if (multiplierCL > 7) {
                    multiplierCL = 2;
                }
            }
            const remainderCL = sumCL % 11;
            let dvCL = 11 - remainderCL;
            if (dvCL === 11) dvCL = '0';
            if (dvCL === 10) dvCL = 'K';
            return `${rutBaseCL.slice(0, rutBaseCL.length - 6)}.${rutBaseCL.slice(rutBaseCL.length - 6, rutBaseCL.length - 3)}.${rutBaseCL.slice(rutBaseCL.length - 3)}-${dvCL}`;

        case 'AR': // Argentina - CUIT / CUIL
            const prefixesAR = ['20', '23', '24', '27', '30', '33', '34'];
            const prefixAR = prefixesAR[getRandomInt(0, prefixesAR.length - 1)];
            const midPartAR = pad(getRandomInt(0, 99999999), 8);
            let sumAR = 0;
            const fullNumAR = prefixAR + midPartAR;
            const factorsAR = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
            for (let i = 0; i < 10; i++) {
                sumAR += parseInt(fullNumAR[i]) * factorsAR[i];
            }
            const remainderAR = sumAR % 11;
            const dvAR = (remainderAR === 0) ? 0 : (remainderAR === 1) ? 9 : (11 - remainderAR);
            return `${prefixAR}-${midPartAR}-${dvAR}`;

        case 'BR': // Brasil - CPF
            const cpfNumBR = pad(getRandomInt(1, 999999999), 9);
            const dvBR = pad(getRandomInt(0, 99), 2); 
            return `${cpfNumBR.substring(0,3)}.${cpfNumBR.substring(3,6)}.${cpfNumBR.substring(6,9)}-${dvBR}`;

        case 'BO': // Bolivia - NIT
            return String(getRandomInt(1000000, 99999999));

        case 'PE': // Perú - RUC
            const rucPrefixPE = getRandomInt(0, 1) === 0 ? '10' : '20';
            const rucNumPE = pad(getRandomInt(0, 999999999), 9);
            const rucDvPE = getRandomInt(0, 9);
            return `${rucPrefixPE}${rucNumPE}${rucDvPE}`;

        case 'CO': // Colombia - NIT
            const nitColBase = pad(getRandomInt(1000000000, 9999999999), 10);
            const dvCol = getRandomInt(0, 9);
            return `${nitColBase.substring(0,1)}.${nitColBase.substring(1,4)}.${nitColBase.substring(4,7)}.${nitColBase.substring(7,10)}-${dvCol}`;

        case 'MX': // México - RFC persona
            let rfcMX = '';
            for (let i = 0; i < 4; i++) rfcMX += chars.charAt(getRandomInt(0, chars.length - 1));
            const yearMX = pad(getRandomInt(0, 99), 2);
            const monthMX = pad(getRandomInt(1, 12), 2);
            const dayMX = pad(getRandomInt(1, 28), 2); 
            rfcMX += `${yearMX}${monthMX}${dayMX}`;
            for (let i = 0; i < 3; i++) rfcMX += (Math.random() < 0.5 ? chars : numbers).charAt(getRandomInt(0, (Math.random() < 0.5 ? chars : numbers).length - 1));
            return rfcMX;

        case 'UY': // Uruguay - RUT
            const rutUY = pad(getRandomInt(1000000, 99999999), 8);
            const dvUY = getRandomInt(0, 9);
            return `${rutUY}-${dvUY}`;

        case 'PY': // Paraguay - RUC
            const rucParaguayNum = pad(getRandomInt(1000000, 9999999), 7);
            const dvParaguay = getRandomInt(0, 9);
            return `${rucParaguayNum.substring(0,1)}.${rucParaguayNum.substring(1,4)}.${rucParaguayNum.substring(4,7)}-${dvParaguay}`;

        case 'EC': // Ecuador - RUC
            const cedulaEcBase = pad(getRandomInt(100000000, 999999999), 9);
            return `${cedulaEcBase}001`;

        case 'VE': // Venezuela - RIF
            const rifPrefixesVE = ['V', 'E', 'J', 'G', 'C', 'P']; 
            const rifPrefixVE = rifPrefixesVE[getRandomInt(0, rifPrefixesVE.length - 1)];
            const rifNumVE = pad(getRandomInt(1, 99999999), 8);
            const rifDvVE = getRandomInt(0, 9);
            return `${rifPrefixVE}-${rifNumVE}-${rifDvVE}`;

        case 'GT': // Guatemala - NIT
            const nitGuatemalaNum = pad(getRandomInt(1000000, 99999999), getRandomInt(7, 8));
            const dvGuatemala = getRandomInt(0, 9);
            return `${nitGuatemalaNum}-${dvGuatemala}`;

        case 'SV': // El Salvador - NIT
            const p1SV = pad(getRandomInt(0, 9999), 4);
            const p2SV = pad(getRandomInt(0, 999996), 6);
            const p3SV = pad(getRandomInt(0, 999), 3);
            const p4SV = getRandomInt(0, 9);
            return `${p1SV}-${p2SV}-${p3SV}-${p4SV}`;

        case 'HN': // Honduras - RTN
            const r1HN = pad(getRandomInt(0, 9999), 4);
            const r2HN = pad(getRandomInt(0, 99), 2);
            const r3HN = pad(getRandomInt(0, 99999), 5);
            return `${r1HN}-${r2HN}-${r3HN}`;

        case 'NI': // Nicaragua - RUC
            const rucNiP1 = pad(getRandomInt(1, 999), 3);
            const rucNiP2 = pad(getRandomInt(0, 999996), 6);
            const rucNiP3 = pad(getRandomInt(0, 99999), 5);
            return `${rucNiP1}-${rucNiP2}-${rucNiP3}`;

        case 'CR': // Costa Rica - NITE (Cédula)
            const c1CR = getRandomInt(1, 9);
            const c2CR = pad(getRandomInt(0, 999), 3);
            const c3CR = pad(getRandomInt(0, 999999), 6);
            return `${c1CR}-${c2CR}-${c3CR}`;

        case 'PA': // Panamá - RUC
            const firstDigitPA = getRandomInt(1, 8); 
            const ptyP2PA = pad(getRandomInt(0, 999), 3);
            const ptyP3PA = pad(getRandomInt(0, 9999), 4);
            const dvPA = pad(getRandomInt(0, 99), 2);
            return `${firstDigitPA}-${ptyP2PA}-${ptyP3PA}-${dvPA}`;

        case 'DO': // República Dominicana - RNC
            return pad(getRandomInt(1000000000, 9999999999), 10);

        case 'CU': // Cuba - NIF
            return pad(getRandomInt(0, 99999999999), 11);

        default:
            return `GENERICO-${pad(getRandomInt(100000000, 999999999), 9)}`;
    }
}

// --- TRADUCCIONES INTEGRADAS Y MEJORADAS ---
const translations = {
    es: {
        firstName: 'Primer Nombre', secondName: 'Segundo Nombre', firstLastName: 'Primer Apellido',
        secondLastName: 'Segundo Apellido', dob: 'Fecha de Nacimiento', age: 'Edad',
        gender: 'Sexo', nationality: 'Nacionalidad', robloxName: 'Nombre de Roblox',
        robloxAvatar: 'Avatar de Roblox', idNumber: 'Número de Identificación', 
        error: 'Hubo un error al generar la información.', titleGenerate: 'Información DNI/RUN/NIT Generada',
        savedSuccess: '¡Información de DNI guardada exitosamente!', footerText: `Generado por {botName}`,
        alreadyHasDNI: 'Ya tienes una identidad de DNI/RUN/NIT registrada en este servidor. Solo puedes tener una. Usa `/dni ver` para verla o `/dni borrar` para eliminarla.',
        noDniFound: 'No tienes ninguna información de DNI/RUN/NIT registrada en este servidor. Usa `/dni crear` para generar una.',
        dniDeleted: 'Tu información de DNI/RUN/NIT ha sido eliminada de este servidor.',
        deleteConfirm: '¿Estás seguro de que quieres eliminar tu DNI? Esta acción es irreversible.',
        confirmButton: 'Sí, eliminar', cancelButton: 'No, cancelar',
        deleteCancelled: 'Eliminación de DNI cancelada.',
        unknownError: 'Ocurrió un error inesperado.',
        noCountryConfigured: 'Por favor, configura el país para este servidor usando `/config set` antes de usar este comando.',
        noPermissionCmd: 'No tienes permiso para usar el comando `/dni`. Por favor, contacta a un administrador del servidor.',
        dniViewDescription: 'Aquí está tu información de DNI/RUN/NIT guardada.',
        noAvatar: 'No se pudo obtener el avatar de Roblox.', 
        tooYoung: 'Debes tener al menos 13 años para crear un DNI. Tu edad calculada es de {age} años.',
        dniNotFoundGeneral: 'Este usuario no tiene un DNI creado.',
        noPermissionDeleteOther: 'No tienes permiso para borrar el DNI de otro usuario.',
        deletedOther: 'El DNI de {userTag} ha sido borrado correctamente.',
        invalidDate: 'La fecha de nacimiento proporcionada no es válida o tiene un formato incorrecto. Usa el formato DD/MM/YYYY.',
        
    },
    pt: {
        firstName: 'Primeiro Nome', secondName: 'Segundo Sobrenome', firstLastName: 'Sobrenome',
        secondLastName: 'Segundo Sobrenome', dob: 'Data de Nascimento', age: 'Idade',
        gender: 'Gênero', nationality: 'Nacionalidade', robloxName: 'Nome do Roblox',
        robloxAvatar: 'Avatar do Roblox', idNumber: 'Número de Identificação', 
        error: 'Ocorreu um erro ao gerar as informações.', titleGenerate: 'Informações de DNI/RUN/NIT Geradas',
        savedSuccess: 'Informações de DNI salvas com sucesso!', footerText: `Gerado por {botName}`,
        alreadyHasDNI: 'Você já tem uma identidade DNI/RUN/NIT registrada neste servidor. Você só pode ter uma. Use `/dni ver` para vê-la ou `/dni borrar` para excluí-la.',
        noDniFound: 'Você não tem nenhuma informação de DNI/RUN/NIT registrada neste servidor. Use `/dni criar` para gerar uma.',
        dniDeleted: 'Suas informações de DNI/RUN/NIT foram excluídas deste servidor.',
        deleteConfirm: 'Tem certeza de que deseja excluir seu DNI? Esta ação é irreversível.',
        confirmButton: 'Sim, excluir', cancelButton: 'Não, cancelar',
        deleteCancelled: 'Exclusão de DNI cancelada.',
        unknownError: 'Ocorreu um erro inesperado.',
        noCountryConfigured: 'Por favor, configure o país para este servidor usando `/config set` antes de usar este comando.',
        noPermissionCmd: 'Você não tem permissão para usar o comando `/dni`. Por favor, contate um administrador do servidor.',
        dniViewDescription: 'Aqui estão suas informações de DNI/RUN/NIT salvas.',
        noAvatar: 'Não foi possível obter o avatar do Roblox.',
        tooYoung: 'Você deve ter pelo menos 13 anos para criar um DNI. Sua idade calculada é de {age} anos.',
        dniNotFoundGeneral: 'Este usuário não tem um DNI criado.',
        noPermissionDeleteOther: 'Você não tem permissão para excluir o DNI de outro usuário.',
        deletedOther: 'O DNI de {userTag} foi excluído com sucesso.',
        invalidDate: 'A data de nascimento fornecida é inválida ou tem o formato incorreto. Use o formato DD/MM/AAAA.',
    },
    en: {
        firstName: 'First Name', secondName: 'Middle Name', firstLastName: 'Last Name',
        secondLastName: 'Second Last Name', dob: 'Date of Birth', age: 'Age',
        gender: 'Gender', nationality: 'Nationality', robloxName: 'Roblox Username',
        robloxAvatar: 'Roblox Avatar', idNumber: 'Identification Number', 
        error: 'An error occurred while generating the information.', titleGenerate: 'Generated DNI/RUN/NIT Information',
        savedSuccess: 'DNI information saved successfully!', footerText: `Generated by {botName}`,
        alreadyHasDNI: 'You already have DNI/RUN/NIT identity registered on this server. You can only have one. Use `/dni view` to see it or `/dni delete` to remove it.',
        noDniFound: 'You do not have any DNI/RUN/NIT information registered on this server. Use `/dni create` to generate one.',
        dniDeleted: 'Your DNI/RUN/NIT information has been deleted from this server.',
        deleteConfirm: 'Are you sure you want to delete your DNI? This action is irreversible.',
        confirmButton: 'Yes, delete', cancelButton: 'No, cancel',
        deleteCancelled: 'DNI deletion cancelled.',
        unknownError: 'An unexpected error occurred.',
        noCountryConfigured: 'Please set the country for this server using `/config set` before using this command.',
        noPermissionCmd: 'You do not have permission to use the `/dni` command. Please contact a server administrator.',
        dniViewDescription: 'Here is your saved DNI/RUN/NIT information.',
        noAvatar: 'Could not fetch Roblox avatar.',
        tooYoung: 'You must be at least 13 years old to create an ID. Your calculated age is {age} years.',
        dniNotFoundGeneral: 'This user has not created an ID.',
        noPermissionDeleteOther: 'You do not have permission to delete another user\'s ID.',
        deletedOther: '{userTag}\'s ID has been successfully deleted.',
        invalidDate: 'The provided birth date is invalid or has an incorrect format. Use DD/MM/YYYY format.',
    }
};

const MIN_AGE_DNI = 13;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dni')
        .setDescription('Gestión de identidad de DNI/RUN/NIT para tu personaje de rol.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('crear')
                .setDescription('Crea una nueva identidad de DNI/RUN/NIT para tu personaje.')
                .addStringOption(option =>
                    option.setName('primer_nombre')
                        .setDescription('Primer nombre de la persona.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('primer_apellido')
                        .setDescription('Primer apellido de la persona.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('fecha_nacimiento')
                        .setDescription('Fecha de nacimiento (DD/MM/YYYY).')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('sexo')
                        .setDescription('Sexo de la persona.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Masculino', value: 'Masculino' },
                            { name: 'Femenino', value: 'Femenino' },
                            { name: 'Otro', value: 'Otro' }
                        ))
                .addStringOption(option =>
                    option.setName('nacionalidad')
                        .setDescription('Nacionalidad de la persona.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('nombre_roblox')
                        .setDescription('Nombre de usuario de Roblox para buscar su avatar.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('segundo_nombre')
                        .setDescription('Segundo nombre de la persona.')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('segundo_apellido')
                        .setDescription('Segundo apellido de la persona.')
                        .setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ver')
                .setDescription('Muestra tu información de DNI/RUN/NIT guardada.')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('El usuario cuyo DNI deseas ver (dejar en blanco para el tuyo).')
                        .setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('borrar')
                .setDescription('Elimina tu información de DNI/RUN/NIT guardada o la de otro usuario.')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('El usuario cuyo DNI deseas borrar (dejar en blanco para el tuyo).')
                        .setRequired(false))
        ),

    async execute(interaction, client, DniModel, ServerConfigModel) {
        console.log(`[${new Date().toISOString()}] Comando /dni ejecutado por ${interaction.user.tag} en el servidor ${interaction.guild.name}.`);
        
        const guildId = interaction.guildId;
        const requestingUserId = interaction.user.id;

        // Cargar la configuración del servidor de forma asíncrona
        const serverConfig = await client.config.loadConfig(guildId);
        const language = serverConfig && serverConfig.language ? serverConfig.language : 'es';
        const t = translations[language];

        let hasPermissionToUseDNI = false;
        if (interaction.user.id === interaction.guild.ownerId) {
            hasPermissionToUseDNI = true;
        } 
        else if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            hasPermissionToUseDNI = true;
        } else {
            const rolePermissions = serverConfig && serverConfig.rolePermissions ? serverConfig.rolePermissions : {};
            for (const roleId of interaction.member.roles.cache.keys()) {
                if (rolePermissions[roleId] && rolePermissions[roleId].canUseDNI) {
                    hasPermissionToUseDNI = true;
                    break;
                }
            }
        }

        if (!hasPermissionToUseDNI) {
            console.log(`[${new Date().toISOString()}] ${interaction.user.tag} intentó usar /dni sin permisos configurados.`);
            return interaction.reply({ content: t.noPermissionCmd, ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        let targetUser = interaction.options.getUser('usuario') || interaction.user;
        let targetUserId = targetUser.id;

        if (subcommand === 'crear') {
            await interaction.deferReply(); 

            if (!serverConfig || !serverConfig.dniSettings || !serverConfig.dniSettings.country) {
                console.log(`[${new Date().toISOString()}] Error: País no configurado para el servidor ${interaction.guild.name}.`);
                return interaction.editReply({ content: t.noCountryConfigured, ephemeral: true });
            }

            if (targetUserId !== requestingUserId) {
                return interaction.editReply({ content: 'Solo puedes crear tu propio DNI.', ephemeral: true });
            }

            const existingDni = await DniModel.findOne({ userId: targetUserId, guildId: guildId });
            if (existingDni) {
                console.log(`[${new Date().toISOString()}] ${interaction.user.tag} intentó crear un DNI, pero ya tiene uno registrado.`);
                return interaction.editReply({ content: t.alreadyHasDNI, ephemeral: true }); 
            }

            const countryCode = serverConfig.dniSettings.country;
            const primerNombre = interaction.options.getString('primer_nombre');
            const segundoNombre = interaction.options.getString('segundo_nombre') || 'N/A';
            const primerApellido = interaction.options.getString('primer_apellido');
            const segundoApellido = interaction.options.getString('segundo_apellido') || 'N/A';
            const fechaNacimiento = interaction.options.getString('fecha_nacimiento');
            const sexo = interaction.options.getString('sexo');
            const nacionalidad = interaction.options.getString('nacionalidad');
            const nombreRoblox = interaction.options.getString('nombre_roblox');

            const edadCalculada = calculateAge(fechaNacimiento);

            if (edadCalculada === null || edadCalculada < 0 || edadCalculada > 120) { 
                return interaction.editReply({ content: t.invalidDate, ephemeral: true });
            }

            if (edadCalculada < MIN_AGE_DNI) {
                return interaction.editReply({ content: t.tooYoung.replace('{age}', edadCalculada), ephemeral: true });
            }

            let robloxAvatarUrl = t.noAvatar;
            let robloxUserId = null;

            console.log(`[${new Date().toISOString()}] Buscando avatar de Roblox para ${nombreRoblox}...`);
            try {
                const userSearchResponse = await axios.post('https://users.roblox.com/v1/usernames/users', {
                    usernames: [nombreRoblox],
                    excludeBannedUsers: true
                });

                if (userSearchResponse.data && userSearchResponse.data.data && userSearchResponse.data.data.length > 0) {
                    robloxUserId = userSearchResponse.data.data[0].id;
                    console.log(`[${new Date().toISOString()}] ID de Roblox encontrado: ${robloxUserId}.`);
                } else {
                    console.warn(`[${new Date().toISOString()}] No se encontró el ID de usuario para Roblox: ${nombreRoblox}`);
                }

                if (robloxUserId) {
                    const avatarResponse = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${robloxUserId}&size=420x420&format=Png&isCircular=false`);
                    if (avatarResponse.data.data && avatarResponse.data.data.length > 0) {
                        robloxAvatarUrl = avatarResponse.data.data[0].imageUrl;
                        console.log(`[${new Date().toISOString()}] Avatar de Roblox obtenido: ${robloxAvatarUrl}.`);
                    } else {
                        robloxAvatarUrl = t.noAvatar;
                        console.warn(`[${new Date().toISOString()}] No se pudo obtener el avatar de Roblox para ${nombreRoblox}.`);
                    }
                } else {
                    robloxAvatarUrl = t.noAvatar;
                }
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error al obtener ID o avatar de Roblox para ${nombreRoblox}: ${error.message}`);
                robloxAvatarUrl = t.noAvatar;
            }

            const identificationNumber = generateCountryID(countryCode);
            console.log(`[${new Date().toISOString()}] ID de país (${countryCode}) generado: ${identificationNumber}.`);
            
            const dniData = {
                userId: targetUserId,
                guildId: guildId,
                firstName: primerNombre,
                secondName: segundoNombre,
                firstLastName: primerApellido,
                secondLastName: segundoApellido,
                dob: fechaNacimiento,
                age: edadCalculada,
                gender: sexo,
                nationality: nacionalidad,
                robloxName: nombreRoblox,
                robloxAvatarUrl: robloxAvatarUrl,
                idNumber: identificationNumber,
                countryCode: countryCode,
                generatedAt: new Date().toISOString()
            };

            await DniModel.create(dniData);
            console.log(`[${new Date().toISOString()}] DNI de ${interaction.user.tag} guardado en MongoDB.`);

            const dniEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(t.titleGenerate)
                .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
                .setDescription(t.savedSuccess)
                .addFields(
                    { name: t.firstName, value: dniData.firstName, inline: true },
                    { name: t.secondName, value: dniData.secondName, inline: true },
                    { name: t.firstLastName, value: dniData.firstLastName, inline: true },
                    { name: t.secondLastName, value: dniData.secondLastName, inline: true },
                    { name: t.dob, value: dniData.dob, inline: true },
                    { name: t.age, value: String(dniData.age), inline: true },
                    { name: t.gender, value: dniData.gender, inline: true },
                    { name: t.nationality, value: dniData.nationality, inline: true },
                    { name: t.idNumber + ` (${dniData.countryCode || 'N/A'})`, value: `\`${dniData.idNumber || 'N/A'}\``, inline: false },
                    { name: t.robloxName, value: dniData.robloxName, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: t.footerText.replace('{botName}', client.user.username), iconURL: client.user.displayAvatarURL() });

            if (robloxAvatarUrl && robloxAvatarUrl.startsWith('http')) {
                dniEmbed.setThumbnail(robloxAvatarUrl);
            }

            await interaction.editReply({ embeds: [dniEmbed] }); 
            console.log(`[${new Date().toISOString()}] Embed de DNI público enviado para ${interaction.user.tag}.`);

        } else if (subcommand === 'ver') {
            await interaction.deferReply();

            const targetUserDni = await DniModel.findOne({ userId: targetUserId, guildId: guildId });
            
            console.log(`[${new Date().toISOString()}] Datos de DNI recuperados para ${targetUser.tag}:`, JSON.stringify(targetUserDni, null, 2));

            if (!targetUserDni) {
                console.log(`[${new Date().toISOString()}] DNI no encontrado para ${targetUser.tag}.`);
                return interaction.editReply({ content: t.dniNotFoundGeneral, ephemeral: true }); 
            }

            const dniEmbed = new EmbedBuilder()
                .setColor(0x007FFF)
                .setTitle(t.titleGenerate) 
                .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
                .setDescription(t.dniViewDescription)
                .addFields(
                    { name: t.firstName, value: targetUserDni.firstName || 'N/A', inline: true },
                    { name: t.secondName, value: targetUserDni.secondName || 'N/A', inline: true },
                    { name: t.firstLastName, value: targetUserDni.firstLastName || 'N/A', inline: true },
                    { name: t.secondLastName, value: targetUserDni.secondLastName || 'N/A', inline: true },
                    { name: t.dob, value: targetUserDni.dob || 'N/A', inline: true },
                    { name: t.age, value: String(targetUserDni.age || 'N/A'), inline: true },
                    { name: t.gender, value: targetUserDni.gender || 'N/A', inline: true },
                    { name: t.nationality, value: targetUserDni.nationality || 'N/A', inline: true },
                    { name: t.idNumber + ` (${targetUserDni.countryCode || 'N/A'})`, value: `\`${targetUserDni.idNumber || 'N/A'}\``, inline: false },
                    { name: t.robloxName, value: targetUserDni.robloxName || 'N/A', inline: true }
                );
            
            let timestampDate;
            try {
                const parsedDate = new Date(targetUserDni.generatedAt);
                if (!isNaN(parsedDate.getTime())) {
                    timestampDate = parsedDate;
                } else {
                    console.warn(`[${new Date().toISOString()}] DNI para ${targetUser.tag} tiene un valor de 'generatedAt' inválido: "${targetUserDni.generatedAt}". Usando la fecha actual.`);
                    timestampDate = new Date(); 
                }
            } catch (e) {
                console.error(`[${new Date().toISOString()}] Error al parsear generatedAt para ${targetUser.tag}:`, e);
                timestampDate = new Date(); 
            }
            dniEmbed.setTimestamp(timestampDate);

            dniEmbed.setFooter({ text: `${t.footerText.replace('{botName}', client.user.username)} (Creado el)`, iconURL: client.user.displayAvatarURL() });

            if (targetUserDni.robloxAvatarUrl && targetUserDni.robloxAvatarUrl.startsWith('http')) {
                dniEmbed.setThumbnail(targetUserDni.robloxAvatarUrl);
            } else {
                dniEmbed.setThumbnail(null); 
            }

            await interaction.editReply({ embeds: [dniEmbed] }); 
            console.log(`[${new Date().toISOString()}] Embed de DNI público mostrado para ${targetUser.tag}.`);

        } else if (subcommand === 'borrar') {
            await interaction.deferReply({ ephemeral: true });

            if (targetUserId !== requestingUserId) {
                if (requestingUserId !== interaction.guild.ownerId && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    console.log(`[${new Date().toISOString()}] ${interaction.user.tag} intentó borrar el DNI de ${targetUser.tag} sin permisos.`);
                    return interaction.editReply({ content: t.noPermissionDeleteOther, ephemeral: true });
                }
            }

            const dniToDelete = await DniModel.findOne({ userId: targetUserId, guildId: guildId });
            if (!dniToDelete) {
                console.log(`[${new Date().toISOString()}] No se encontró DNI para borrar de ${targetUser.tag}.`);
                return interaction.editReply({ content: t.dniNotFoundGeneral, ephemeral: true });
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_delete')
                        .setLabel(t.confirmButton)
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancel_delete')
                        .setLabel(t.cancelButton)
                        .setStyle(ButtonStyle.Secondary)
                );

            const response = await interaction.editReply({
                content: targetUserId === requestingUserId ? t.deleteConfirm : `¿Estás seguro de que quieres eliminar el DNI de ${targetUser.tag}? Esta acción es irreversible.`,
                components: [row]
            });

            const collectorFilter = i => i.user.id === requestingUserId;

            try {
                const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60000, componentType: ComponentType.Button });

                if (confirmation.customId === 'confirm_delete') {
                    await DniModel.findOneAndDelete({ userId: targetUserId, guildId: guildId });
                    console.log(`[${new Date().toISOString()}] DNI de ${targetUser.tag} borrado de MongoDB.`);
                    if (targetUserId === requestingUserId) {
                        await confirmation.update({ content: t.dniDeleted, embeds: [], components: [], ephemeral: true });
                    } else {
                        await confirmation.update({ content: t.deletedOther.replace('{userTag}', targetUser.tag), embeds: [], components: [], ephemeral: true });
                    }
                } else if (confirmation.customId === 'cancel_delete') {
                    await confirmation.update({ content: t.deleteCancelled, embeds: [], components: [], ephemeral: true });
                }
            } catch (e) {
                console.error(`[${new Date().toISOString()}] Error al recolectar interacción de botón para borrar DNI:`, e);
                await interaction.editReply({ content: t.unknownError, components: [] });
            }
        }
    }
};