module.exports = {
    // Puerto en el que se ejecutará el servidor API
    port: process.env.API_PORT || 3001,
    
    // Configuración de CORS
    cors: {
        origin: [
            'http://localhost:3000', // Desarrollo local
            'https://unify-dashboard.onrender.com', // Producción en Render
            'http://217.160.125.125:13869', // Wispbyte
            // Dominios adicionales
            /^\.?unify-dashboard\.onrender\.com$/, // Subdominios
            /^\.?wispbyte\.com$/ // Subdominios de Wispbyte
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
        // Configuración adicional para manejar múltiples orígenes
        preflightContinue: false,
        optionsSuccessStatus: 204
    },
    
    // Configuración de autenticación
    auth: {
        // Tiempo de expiración del token (en segundos)
        tokenExpiration: 3600, // 1 hora
        // Prefijo del token de autenticación
        tokenPrefix: 'Bot'
    },
    
    // Configuración de la base de datos
    database: {
        // Opciones de conexión a MongoDB
        mongoOptions: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            appName: 'roleplay-sistem-bot-api'
        },
        // Tiempo máximo de espera para conexiones (ms)
        connectTimeoutMS: 5000,
        // Tiempo máximo de espera para operaciones (ms)
        socketTimeoutMS: 45000
    },
    
    // Configuración de logs
    logging: {
        // Nivel de log (error, warn, info, debug, trace)
        level: 'debug',
        // Formato de los logs (json, pretty, simple)
        format: 'pretty',
        // Archivo de log (opcional)
        file: 'api.log'
    },
    
    // Configuración de la API
    api: {
        // Prefijo de las rutas de la API
        prefix: '/api',
        // Versión de la API
        version: 'v1',
        // Tamaño máximo del cuerpo de la solicitud (en bytes)
        maxBodySize: '10mb',
        // Tasa límite de solicitudes
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100 // límite de 100 solicitudes por ventana por IP
        }
    },
    
    // Configuración de seguridad
    security: {
        // Cabeceras de seguridad HTTP
        headers: {
            xssProtection: '1; mode=block',
            noSniff: 'nosniff',
            xFrameOptions: 'SAMEORIGIN',
            contentSecurityPolicy: "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data:",
            strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
            referrerPolicy: 'same-origin'
        },
        // Configuración de CORS
        cors: {
            enabled: true,
            // Lista blanca de orígenes permitidos
            whitelist: [
                // Dominios
                'https://unify-dashboard.onrender.com',
                'http://217.160.125.125:13869',
                // IPs de Render
                '35.160.120.126',
                '44.233.151.27',
                '34.211.200.85',
                // Rangos de IP de Render
                '74.220.48.0/24',
                '74.220.56.0/24',
                // Desarrollo local
                'http://localhost:3000',
                // Patrones para subdominios
                /^\.?unify-dashboard\.onrender\.com$/,
                /^\.?wispbyte\.com$/
            ],
            // Métodos HTTP permitidos
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            // Cabeceras permitidas
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            // Credenciales
            credentials: true
        }
    },
    
    // Configuración de desarrollo
    development: {
        // Habilitar modo de depuración
        debug: true,
        // Registrar todas las solicitudes
        logRequests: true,
        // Registrar todas las respuestas
        logResponses: false
    },
    
    // Configuración de producción
    production: {
        // Deshabilitar modo de depuración
        debug: false,
        // Registrar solo errores
        logRequests: false,
        // No registrar respuestas
        logResponses: false
    }
};
