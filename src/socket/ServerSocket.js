const Events = require('events');
const HTTP = require('axios');
const WS = require('ws');

module.exports = class ServerSocket extends Events {

    constructor(url, token, server, cookies = '') { // cookies example: 'cf_clearance=${captcha-token};'
        super(true);

        if (!url || !token || !server) {
            throw new Error('URL, TOKEN or SERVER not found!');
        }

        this.access = {
            panel_url: url, // url of a valid panel
            panel_token: token, // token of a valid panel
            panel_server: server, // Unique server ID of a valid panel
            panel_cookies: cookies, // cookies for panel request

            socket_url: null, // daemon websocket URL
            socket_token: null, // daemon websocket TOKEN
            socket_lastRequest: 0 // last request to the panel
        }

        this.server = { // information shared by websocket
            console: [],
            stats: {
                state: 'offline',
                cpu_absolute: 0,
                disk_bytes: 0,
                memory_bytes: 0,
                memory_limit_bytes: 0,
                network: {
                    rx_bytes: 0,
                    tx_bytes: 0
                }
            },
            status: 'offline'
        }

        this.websocket = null; // websocket connection
    }

    async init() { // init websocket connection
        await this.requestWebSocketData();

        this.websocket = new WS(this.access.socket_url, { origin: this.access.panel_url });
        this.websocket.json = (data) => this.websocket.send(JSON.stringify(data));

        this.websocket.on('open', () => { // authentication in websocket connection
            this.authenticate();
        });

        this.websocket.on('message', (data) => { // messages from websocket connection
            data = JSON.parse(data);

            switch (data.event) {
                case "auth sucess": { // token accepted by daemon
                    this.emit('authenticated');
                    break;
                }

                case "console output": { // [ text, text... ]
                    data.args.forEach((message) => {
                        this.server.console.push(message);
                        this.emit('console', message);
                    });
                    break;
                }

                case "stats": { // [ json ]
                    this.server.stats = JSON.parse(data.args[0]);
                    this.emit('stats', this.server.stats);
                    break;
                }

                case "status": { // [ text ]
                    this.server.status = data.args[0];
                    this.emit('status', this.server.status);
                    break;
                }

                case "token expiring": // renew websocket token
                case "token expired": {
                    this.authenticate();
                    break;
                }

                default: // for unregistered events
                    this.emit('default', data.args);
                    break;
            }
        });

        return this;
    }

    async requestWebSocketData() { // get websocket data
        if (Date.now() <= this.access.socket_lastRequest) { // avoid the flood of requests
            return false;
        }

        return await HTTP.get(`${this.access.panel_url}/api/client/servers/${this.access.panel_server}/websocket`, {
            headers: {
                'accept': 'application/json',
                'authorization': `Bearer ${this.access.panel_token}`,
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36 Edg/91.0.864.59',
                'cookie': this.access.panel_cookies
            }
        }).then(res => {
            this.access.socket_url = res.data.data.socket;
            this.access.socket_token = res.data.data.token;
            this.access.socket_lastRequest = Date.now() + 540000;
        })
    }

    async authenticate() { // send authentication token to websocket
        await this.requestWebSocketData();

        this.websocket.json({ event: "auth", args: [this.socketToken] });
    }
}
