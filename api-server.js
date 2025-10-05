const express = require('express');
const { Client } = require('discord.js');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: './sistem.env' });

// Configuración del servidor
const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importar el cliente de Discord
const client = new Client({
    intents: [
        'Guilds',
        'GuildMessages',
        'MessageContent'
    ]
});

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error al conectar a MongoDB:', err));

// Esquema de DNI
const DNI = mongoose.model('DNI', {
    userId: String,
    guildId: String,
    firstName: String,
    secondName: String,
    firstLastName: String,
    secondLastName: String,
    dob: String,
    age: Number,
    gender: String,
    nationality: String,
    robloxName: String,
    robloxAvatarUrl: String,
    idNumber: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Middleware de autenticación
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || authHeader !== `Bot ${process.env.TOKEN}`) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    
    next();
};

// Endpoint para verificar el estado del bot
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        bot: client.user ? client.user.tag : 'Desconectado',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Endpoint para crear un DNI
app.post('/api/dni', authenticate, async (req, res) => {
    try {
        const { guildId, userId, ...dniData } = req.body;
        
        // Validar datos requeridos
        if (!guildId || !userId) {
            return res.status(400).json({ error: 'Se requieren guildId y userId' });
        }
        
        // Crear o actualizar DNI
        const dni = await DNI.findOneAndUpdate(
            { guildId, userId },
            { ...dniData, updatedAt: new Date() },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        
        res.json(dni);
    } catch (error) {
        console.error('Error al crear/actualizar DNI:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para obtener un DNI
app.get('/api/dni', authenticate, async (req, res) => {
    try {
        const { guildId, userId } = req.query;
        
        if (!guildId || !userId) {
            return res.status(400).json({ error: 'Se requieren guildId y userId' });
        }
        
        const dni = await DNI.findOne({ guildId, userId });
        
        if (!dni) {
            return res.status(404).json({ error: 'DNI no encontrado' });
        }
        
        res.json(dni);
    } catch (error) {
        console.error('Error al obtener DNI:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor API escuchando en el puerto ${PORT}`);
});

// Iniciar el bot
client.login(process.env.TOKEN)
    .then(() => {
        console.log(`Bot conectado como ${client.user.tag}`);
    })
    .catch(error => {
        console.error('Error al iniciar el bot:', error);
        process.exit(1);
    });

// Manejo de errores no capturados
process.on('unhandledRejection', error => {
    console.error('Error no manejado:', error);
});

process.on('uncaughtException', error => {
    console.error('Excepción no capturada:', error);
    process.exit(1);
});
