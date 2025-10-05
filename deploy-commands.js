const { REST, Routes } = require('discord.js');
const { readdirSync } = require('node:fs'); // Usar node:fs para consistencia
const path = require('node:path'); // Importar path para manejar rutas de carpetas
const dotenv = require('dotenv');

dotenv.config({ path: './sistem.env' }); // Asegúrate de cargar dotenv aquí también

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // Opcional: si está definido, se despliega solo para este gremio

const commands = [];

// Función para cargar comandos de forma recursiva
function loadCommands(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            loadCommands(entryPath); // Recursivamente cargar comandos de subdirectorios
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            const command = require(entryPath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            } else {
                console.warn(`[ADVERTENCIA] El archivo de comando ${entry.name} en ${entryPath} no tiene las propiedades "data" o "execute" requeridas.`);
            }
        }
    }
}

// Cargar todos los comandos desde la carpeta 'commands' y sus subcarpetas
loadCommands(path.join(__dirname, 'commands'));


// deployCommands.js ahora recibe argumentos para un uso más flexible
// Esta función se usará desde index.js
module.exports = async (token, clientId, guildId, commandsToDeploy) => {
    const rest = new REST().setToken(token);

    try {
        console.log(`Comenzando a refrescar ${commandsToDeploy.length} comandos de aplicación (/).`);

        let data;
        if (guildId) {
            // Despliegue de comandos para un gremio específico (útil para desarrollo)
            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commandsToDeploy },
            );
            console.log(`Se recargaron ${data.length} comandos de aplicación para el servidor ID ${guildId}.`);
        } else {
            // Despliegue de comandos global (para producción)
            data = await rest.put(
                Routes.applicationCommands(clientId), // Sin guildId, es global
                { body: commandsToDeploy },
            );
            console.log(`Se recargaron ${data.length} comandos de aplicación GLOBALMENTE.`);
            console.warn('¡Advertencia! Los comandos globales pueden tardar hasta 1 hora en propagarse.');
        }
    } catch (error) {
        console.error('Error al desplegar comandos:', error);
    }
};

// Si quieres ejecutar deploy-commands.js directamente para desplegar todos los comandos:
(async () => {
    if (!TOKEN || !CLIENT_ID) {
        console.error('TOKEN o CLIENT_ID no están configurados en sistem.env. No se pueden desplegar comandos.');
        return;
    }

    const rest = new REST().setToken(TOKEN);

    try {
        console.log(`Comenzando a refrescar ${commands.length} comandos de aplicación (/).`);

        let data;
        if (GUILD_ID) {
            // Despliegue para un gremio específico si GUILD_ID está definido
            data = await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: commands },
            );
            console.log(`Se recargaron ${data.length} comandos de aplicación para el servidor ID ${GUILD_ID}.`);
        } else {
            // Despliegue global si GUILD_ID no está definido
            data = await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commands },
            );
            console.log(`Se recargaron ${data.length} comandos de aplicación GLOBALMENTE.`);
            console.warn('¡Advertencia! Los comandos globales pueden tardar hasta 1 hora en propagarse.');
        }
    } catch (error) {
        console.error('Error al desplegar comandos:', error);
    }
})();
