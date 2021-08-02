const ServerSocket = require('./socket/ServerSocket');

let panel_SERVER = '246b7dae'
let panel_URL = 'https://demo.pterodactyl.io'
let panel_TOKEN = 'ylssiGvKk65ZDD8RU31UAYpJ5mhWZsjkJZAoY680ZA0Gontv'

let socket = new ServerSocket(panel_URL, panel_TOKEN, panel_SERVER);

socket.on('authenticated', () => {
    console.log('autenticado ao websocket!');
});

socket.on('console', (data) => {
    console.log('[CONSOLE OUTPUT]:', data);
});

socket.on('stats', (data) => {
    console.log('[CONSOLE STATS]:', data);
});

socket.on('status', (data) => {
    console.log('[CONSOLE STATUS]:', data);
});

socket.on('default', (data) => {
    console.log('[CONSOLE DEFAULT]:', data);
});

socket.init();