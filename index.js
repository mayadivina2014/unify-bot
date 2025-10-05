// index.js
// Importaciones de módulos necesarios
const { Client, Collection, GatewayIntentBits, InteractionType, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { readdirSync } = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const deployCommands = require('./deploy-commands.js'); 
const mongoose = require('mongoose');

// Importamos la función para generar el embed de logs
const { getLogEmbed } = require('./models/logEmbedModel.js');

// Carga las variables de entorno desde el archivo 'sistem.env'
dotenv.config({ path: './sistem.env' });

// --- Definición del Esquema y Modelo de Mongoose para DNI ---
const dniSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    firstName: { type: String, default: null },
    secondName: { type: String, default: null },
    firstLastName: { type: String, default: null },
    secondLastName: { type: String, default: null },
    dob: { type: String, default: null },
    age: { type: Number, default: null },
    gender: { type: String, default: null },
    nationality: { type: String, default: null },
    robloxName: { type: String, default: null },
    robloxAvatarUrl: { type: String, default: null },
    idNumber: { type: String, default: null },
    countryCode: { type: String, default: null },
    generatedAt: { type: String, default: null }
});

const DniModel = mongoose.model('Dni', dniSchema);
// --- Fin de la Definición del Modelo DNI ---

// --- Definición del Esquema y Modelo de Mongoose para Fichas de Personaje ---
const characterSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    characterName: { type: String, required: true },
    story: { type: String, default: null },
    age: { type: Number, default: null },
    nationality: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});
const CharacterModel = mongoose.model('Character', characterSchema);
// --- Fin de la Definición del Modelo de Fichas de Personaje ---

// --- Definición del Esquema y Modelo de Mongoose para Advertencias (Warnings) ---
const warningSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
const WarningModel = mongoose.model('Warning', warningSchema);
// --- Fin de la Definición del Modelo de Advertencias ---

// --- Definición del Esquema y Modelo de Mongoose para Configuración del Servidor ---
const serverConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    language: { type: String, default: 'es' },
    dniSettings: {
        country: { type: String, default: 'CL' }
    },
    rolePermissions: { type: Object, default: {} }, 
    prefix: { type: String, default: null },
    logChannelId: { type: String, default: null } // AÑADIDO: Campo para el canal de logs
});

const ServerConfigModel = mongoose.models.ServerConfig || mongoose.model('ServerConfig', serverConfigSchema);
// --- Fin de la Definición del Modelo de Configuración del Servidor ---


// --- Conexión a MongoDB ---
const connectToMongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL); 
        console.log(`[${new Date().toISOString()}] Conectado a MongoDB.`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error crítico: No se pudo conectar a MongoDB. El bot puede no funcionar correctamente.`, error);
    }
};
// --- Fin de la Conexión a MongoDB ---


// --- Clase ConfigManager ---
class ConfigManager {
    constructor(ServerConfigModel) {
        this.ServerConfigModel = ServerConfigModel;
        this.configsCache = new Map();
    }

    async loadConfig(guildId) {
        if (this.configsCache.has(guildId)) {
            return this.configsCache.get(guildId);
        }
        try {
            const config = await this.ServerConfigModel.findOneAndUpdate(
                { guildId: guildId },
                {}, 
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            const mergedConfig = config.toObject(); 
            this.configsCache.set(guildId, mergedConfig);
            return mergedConfig;
        } catch (e) {
            console.error(`[${new Date().toISOString()}] Error al cargar la configuración para el servidor ${guildId}:`, e);
            return {
                language: 'es',
                dniSettings: { country: 'CL' },
                rolePermissions: {},
                prefix: null
            };
        }
    }

    async set(guildId, configObject) {
        try {
            await this.ServerConfigModel.findOneAndUpdate(
                { guildId: guildId },
                { $set: configObject },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            this.configsCache.set(guildId, configObject); 
            console.log(`[${new Date().toISOString()}] Configuración guardada exitosamente en MongoDB para ${guildId}.`);
        } catch (e) {
            console.error(`[${new Date().toISOString()}] Error al guardar la configuración para ${guildId}:`, e);
        }
    }
    
    async delete(guildId) {
        try {
            await this.ServerConfigModel.deleteOne({ guildId: guildId });
            this.configsCache.delete(guildId); 
            console.log(`[${new Date().toISOString()}] Configuración eliminada de MongoDB para ${guildId}.`);
        } catch (e) {
            console.error(`[${new Date().toISOString()}] Error al eliminar la configuración para ${guildId}:`, e);
        }
    }
}
// --- Fin de la Clase ConfigManager ---


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions
    ]
});

client.commands = new Collection(); 
client.config = new ConfigManager(ServerConfigModel);


// --- MANEJADOR DE COMANDOS (Carga comandos de forma recursiva) ---
const commandsPath = path.join(__dirname, 'commands');

// Función para cargar comandos de forma recursiva en client.commands
function loadClientCommands(directory) {
    const entries = readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            loadClientCommands(entryPath); // Recursivamente cargar comandos de subdirectorios
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            try {
                const command = require(entryPath);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    console.log(`[${new Date().toISOString()}] Comando cargado: ${command.data.name} desde ${entryPath}`);
                } else {
                    console.warn(`[${new Date().toISOString()}] [ADVERTENCIA] El comando en ${entryPath} le falta una propiedad "data" o "execute" requerida.`);
                }
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error al cargar el archivo de comando ${entryPath}:`, error);
            }
        }
    }
}

// Cargar todos los comandos al iniciar el bot
loadClientCommands(commandsPath);
// --- FIN DEL MANEJADOR DE COMANDOS ---


client.once('ready', async () => {
    await connectToMongoDB();
    
    console.log(`[${new Date().toISOString()}] ¡Bot está en línea! Conectado como ${client.user.tag}`);

    const allCommandsForDeploy = [];
    for (const command of client.commands.values()) {
        allCommandsForDeploy.push(command.data.toJSON());
    }

    if (!process.env.TOKEN || !process.env.CLIENT_ID) {
        console.error(`[${new Date().toISOString()}] Error: TOKEN o CLIENT_ID no encontrados en sistem.env. No se pueden desplegar los comandos.`);
        return;
    }

    console.log(`[${new Date().toISOString()}] Iniciando despliegue de comandos...`);
    await deployCommands(process.env.TOKEN, process.env.CLIENT_ID, process.env.GUILD_ID, allCommandsForDeploy);
});

// --- Manejador de evento guildCreate ---
client.on('guildCreate', async guild => {
    console.log(`[${new Date().toISOString()}] El bot se ha unido a un nuevo servidor: ${guild.name} (ID: ${guild.id}).`);

    const channel = guild.systemChannel || guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.SendMessages));

    if (!channel) {
        console.warn(`[${new Date().toISOString()}] No se encontró un canal para enviar el mensaje de bienvenida en ${guild.name}.`);
        return;
    }

    const owner = await guild.fetchOwner();
    const welcomeEmbed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🎉 ¡Gracias por invitarme a tu servidor!')
        .setDescription(`¡Hola! Soy el bot **SISTEM** y estoy aquí para ayudarte a gestionar tu comunidad.\n\nPara empezar, por favor, configura el idioma y el país de tu servidor usando el comando \`/setup\`.\n\nSolo el dueño del servidor (${owner.user.tag}) puede usar este comando.`)
        .addFields(
            { name: '🌐 Configuración Rápida', value: `Usa \`/setup\` para establecer el idioma del bot y el país para la generación de DNI. Ejemplo:\n\`/setup idioma:es pais:CL\`` },
            { name: '⚠️ Aviso Importante sobre el prefijo', value: 'Hemos detectado que la implementación de comandos con prefijo (ej: `!`) no está bien implementada y puede causar errores. Te recomendamos encarecidamente utilizar siempre los comandos de barra diagonal (`/`) para una mejor experiencia y estabilidad.' }
        )
        .setThumbnail(client.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: '¡Disfruta de la experiencia con SISTEM!', iconURL: client.user.displayAvatarURL() });

    try {
        await channel.send({ embeds: [welcomeEmbed] });
        console.log(`[${new Date().toISOString()}] Mensaje de bienvenida enviado al canal ${channel.name} del servidor ${guild.name}.`);
    } catch (e) {
        console.error(`[${new Date().toISOString()}] Error al enviar el mensaje de bienvenida en ${guild.name}:`, e);
    }
});
// --- FIN del Manejador de evento guildCreate ---

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.warn(`[${new Date().toISOString()}] Comando no encontrado para /${interaction.commandName}.`);
            if (interaction.deferred || interaction.replied) {
                return interaction.followUp({ content: 'Este comando ya no existe o no está disponible.', ephemeral: true }).catch(e => console.error(`Error al enviar followUp: ${e}`));
            } else {
                return interaction.reply({ content: 'Este comando ya no existe o no está disponible.', ephemeral: true }).catch(e => console.error(`Error al enviar reply: ${e}`));
            }
        }

        try {
            // Pasamos todos los modelos de Mongoose y el cliente a los comandos
            await command.execute(interaction, client, DniModel, ServerConfigModel, CharacterModel, WarningModel); 
            
            // --- NUEVA LÓGICA DE LOGS ---
            const guildId = interaction.guildId;
            const currentServerConfig = await ServerConfigModel.findOne({ guildId });
            if (currentServerConfig && currentServerConfig.logChannelId) {
                const logChannel = await client.channels.fetch(currentServerConfig.logChannelId);
                if (logChannel) {
                    const logEmbed = getLogEmbed(interaction);
                    logChannel.send({ embeds: [logEmbed] }).catch(err => {
                        console.error(`[${new Date().toISOString()}] Error al enviar el embed de log al canal ${currentServerConfig.logChannelId}:`, err);
                    });
                }
            }
            // --- FIN DE LA LÓGICA DE LOGS ---
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error al ejecutar el comando /${interaction.commandName}:`, error);
            const errorMessage = `¡Hubo un error al ejecutar este comando! \`\`\`${error.message}\`\`\``;
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: errorMessage, ephemeral: true }).catch(e => console.error(`Error al enviar followUp: ${e}`));
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true }).catch(e => console.error(`Error al enviar reply: ${e}`));
            }
        }
        return;
    }

    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isRoleSelectMenu() || interaction.isChannelSelectMenu() || interaction.isMentionableSelectMenu() || interaction.isUserSelectMenu()) {
        console.log(`[${new Date().toISOString()}] Interacción de Componente (Tipo: ${interaction.componentType}) recibida: ${interaction.customId}`);
        return;
    }

    if (interaction.type === InteractionType.ModalSubmit) {
        console.log(`[${new Date().toISOString()}] Interacción de Modal Submit recibida: ${interaction.customId}`);
        return;
    }
});


// --- Manejador de mensajes para comandos de prefijo ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const guildConfig = await client.config.loadConfig(message.guild.id);
    const prefix = guildConfig.prefix;

    if (!prefix || !message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (commandName !== 'dni') { // Mantener solo 'dni' para prefijo por ahora
        return;
    }

    const dniCommand = client.commands.get('dni');

    if (!dniCommand) {
        console.warn(`[${new Date().toISOString()}] Comando de prefijo '${commandName}' invocado, pero el comando Slash '${commandName}' no se encontró.`);
        return message.reply('El comando `dni` no está disponible o no se cargó correctamente. Por favor, contacta a un administrador.').catch(console.error);
    }

    const rawSubcommand = args.shift();
    const subcommand = rawSubcommand ? rawSubcommand.toLowerCase() : null;

    if (!subcommand || !['crear', 'ver', 'borrar'].includes(subcommand)) {
        return message.reply(`Uso inválido. Usar: \`${prefix}dni <crear|ver|borrar>\`.`).catch(console.error);
    }

    let optionsMap = new Map();

    if (subcommand === 'crear') {
        let currentKey = null;
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg.startsWith('--')) {
                currentKey = arg.substring(2);
                if (args[i+1] && !args[i+1].startsWith('--')) {
                    optionsMap.set(currentKey, args[i+1].replace(/^["']|["']$/g, ''));
                    i++;
                } else {
                    optionsMap.set(currentKey, null);
                }
            } else if (currentKey) {
                optionsMap.set(currentKey, arg.replace(/^["']|["']$/g, ''));
                currentKey = null;
            }
        }
    } else if (subcommand === 'ver' || subcommand === 'borrar') {
        const targetUser = message.mentions.users.first();
        if (targetUser) {
            optionsMap.set('usuario', targetUser);
        } else if (args[0]) {
            const userId = args[0].replace(/[^0-9]/g, '');
            try {
                const user = await client.users.fetch(userId);
                optionsMap.set('usuario', user);
            } catch (error) {
                console.warn(`[${new Date().toISOString()}] No se pudo encontrar el usuario para el ID: ${userId}`);
            }
        }
    }

    const simulatedInteraction = {
        commandName: 'dni',
        options: {
            getSubcommand: () => subcommand,
            getString: (name) => optionsMap.get(name) || null,
            getUser: (name) => optionsMap.get(name) || null,
            getInteger: (name) => {
                const value = optionsMap.get(name);
                return value !== undefined ? parseInt(value, 10) : null;
            },
            getBoolean: (name) => {
                const value = optionsMap.get(name);
                if (value === 'true') return true;
                if (value === 'false') return false;
                return null;
            },
            getChannel: () => null,
            getRole: () => null,
            getMentionable: () => null,
            get: (name) => optionsMap.get(name) || null,
            getMember: (name) => optionsMap.get(name) || null,
        },
        user: message.author,
        member: message.member,
        guild: message.guild,
        guildId: message.guild.id,
        channel: message.channel,
        channelId: message.channel.id,
        _deferredReply: null,
        _replyMessage: null,

        async reply(options) {
            options.content = options.content || '';
            if (options.embeds) {
                options.embeds = options.embeds.map(e => new EmbedBuilder(e));
            }
            this._replyMessage = await message.channel.send({
                content: options.content,
                embeds: options.embeds,
                components: options.components,
                files: options.files,
                reply: { messageReference: message.id, failIfNotExists: false }
            }).catch(console.error);
            return this._replyMessage;
        },
        async deferReply(options = {}) {
            this._deferredReply = await message.channel.send({
                content: 'Pensando...',
                reply: { messageReference: message.id, failIfNotExists: false }
            }).catch(console.error);
            if (this._deferredReply) {
                this._deferredReply.isDeferred = true;
                this._replyMessage = this._deferredReply;
            }
        },
        async editReply(options) {
            if (this._replyMessage) {
                options.content = options.content || '';
                if (options.embeds) {
                    options.embeds = options.embeds.map(e => new EmbedBuilder(e));
                }
                const editedMessage = await this._replyMessage.edit(options).catch(err => {
                    console.error(`[${new Date().toISOString()}] Error al editar reply (deferred/initial) para comando de prefijo: ${err.message}`);
                });
                return editedMessage;
            } else {
                console.warn(`[${new Date().toISOString()}] Llamada a editReply sin previo reply/deferReply para comando de prefijo. Intentando reply.`);
                return this.reply(options).catch(err => {
                    console.error(`[${new Date().toISOString()}] Error al intentar reply desde editReply para comando de prefijo: ${err.message}`);
                });
            }
        },
        async followUp(options) {
            options.content = options.content || '';
            if (options.embeds) {
                options.embeds = options.embeds.map(e => new EmbedBuilder(e));
            }
            return message.channel.send(options).catch(console.error);
        },
        
        get deferred() { return !!this._deferredReply; },
        get replied() { return !!this._replyMessage && !this._deferredReply; },

        channel: {
            createMessageComponentCollector: (filterOptions) => {
                const collector = message.channel.createMessageComponentCollector({
                    filter: i => {
                        const baseFilter = i.user.id === message.author.id;
                        if (filterOptions.filter) {
                            return baseFilter && filterOptions.filter(i);
                        }
                        return baseFilter;
                    },
                    time: filterOptions.time || 60000,
                    max: filterOptions.max || 1,
                    componentType: filterOptions.componentType
                });
                return collector;
            }
        }
    };

    try {
        console.log(`[${new Date().toISOString()}] Ejecutando comando de prefijo: ${prefix}${commandName} ${subcommand} con args: ${args.join(' ')}`);
        // Pasamos todos los modelos de Mongoose y el cliente a los comandos de prefijo
        await dniCommand.execute(simulatedInteraction, client, DniModel, ServerConfigModel, CharacterModel, WarningModel); 
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error al ejecutar comando de prefijo ${commandName} ${subcommand}:`, error);
        if (simulatedInteraction.deferred || simulatedInteraction.replied) {
            await simulatedInteraction.followUp({ content: `Hubo un error al ejecutar el comando \`${prefix}${commandName} ${subcommand}\`. Por favor, revisa los argumentos.\n\`\`\`${error.message}\`\`\``, ephemeral: false }).catch(console.error);
        } else {
            await message.reply(`Hubo un error al ejecutar el comando \`${prefix}${commandName} ${subcommand}\`. Por favor, revisa los argumentos.\n\`\`\`${error.message}\`\`\``).catch(console.error);
        } 
    }
});

if (!process.env.TOKEN) {
    console.error(`[${new Date().toISOString()}] Error: La variable de entorno TOKEN no está definida en sistem.env. El bot no puede iniciar sesión.`);
    process.exit(1);
}

client.login(process.env.TOKEN);