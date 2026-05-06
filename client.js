const io = require('socket.io-client');
const readline = require('readline');

const SERVER_URL = 'http://localhost:5000';
const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let username = '';

const askUsername = () => {
    return new Promise((resolve) => {
        rl.question('Ingresa tu nombre de usuario: ', (name) => {
            username = name.trim(); // ✅ se asigna aquí directamente
            resolve();
        });
    });
};

const sendMessage = (message) => {
    if (message === '/exit') {
        console.log('Saliendo del chat...');
        socket.disconnect();
        rl.close();
        process.exit(0);
    }
    socket.emit('chat_message', { username, message, timestamp: new Date().toLocaleTimeString() });
};

const displayMessage = (data, isOwn = false) => {
    const prefix = isOwn ? 'Tú' : `${data.username}`; // ✅ backticks
    const time = data.timestamp || new Date().toLocaleTimeString();
    console.log(`[${time}] ${prefix}: ${data.message}`);
};

socket.on('connect', async () => {
    console.log('Conectado al servidor de chat');
    await askUsername(); // ✅ username ya queda asignado dentro de askUsername
    socket.emit('set_username', username); // ✅ string, no objeto
    console.log('Puedes empezar a enviar mensajes. Escribe "/exit" para salir.');
    rl.prompt();
});

socket.on('user_joined', (data) => {
    console.log(`${data.username} se ha unido al chat.`);
});

socket.on('user_list', (users) => {
    console.log('Usuarios conectados:', users.join(', ') || 'Ninguno, estás solo'); // ✅ users es array directo
});

socket.on('user_left', (data) => {
    console.log(`${data.username} ha salido del chat.`);
});

socket.on('chat_message', (data) => {
    const isOwn = data.username === username;
    displayMessage(data, isOwn);
    rl.prompt();
});

socket.on('disconnect', () => {
    console.log('Desconectado del servidor de chat');
    rl.close();
    process.exit(0);
});

// ✅ Leer mensajes del teclado
rl.on('line', (line) => {
    sendMessage(line.trim());
    rl.prompt();
});