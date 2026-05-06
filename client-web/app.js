
/* global io */
const socket = io('http://localhost:5000');

// ─────────────────────────────────────────
// COMPONENTE: Mensaje individual
// ─────────────────────────────────────────
class ChatMessage extends HTMLElement {
    connectedCallback() {
        const user = this.getAttribute('user');
        const text = this.getAttribute('text');
        const time = this.getAttribute('time');
        const isOwn = this.getAttribute('own') === 'true';

        this.innerHTML = `
            <div style="
                text-align: ${isOwn ? 'right' : 'left'};
                margin: 6px 0;
            ">
                <strong>${isOwn ? 'Tú' : user}</strong>
                <span style="font-size:0.8em; color:gray;">[${time}]</span>
                <div>${text}</div>
            </div>
        `;
    }
}
customElements.define('chat-message', ChatMessage);

// ─────────────────────────────────────────
// COMPONENTE: Lista de usuarios
// ─────────────────────────────────────────
class UserList extends HTMLElement {
    connectedCallback() {
        this.render([]);
    }

    render(users) {
        this.innerHTML = `
            <div>
                <strong>Usuarios conectados:</strong>
                <ul>
                    ${users.map(u => `<li>${u}</li>`).join('') || '<li>Ninguno</li>'}
                </ul>
            </div>
        `;
    }
}
customElements.define('user-list', UserList);

// ─────────────────────────────────────────
// COMPONENTE: Input para enviar mensajes
// ─────────────────────────────────────────
class ChatInput extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div style="display:flex; gap:8px; margin-top:10px;">
                <input id="msg-input" type="text" placeholder="Escribe un mensaje..." style="flex:1; padding:8px;"/>
                <button id="send-btn" style="padding:8px 16px;">Enviar</button>
            </div>
        `;

        const input = this.querySelector('#msg-input');
        const btn = this.querySelector('#send-btn');

        const send = () => {
            const message = input.value.trim();
            if (!message) return;
            this.dispatchEvent(new CustomEvent('send-message', {
                detail: { message },
                bubbles: true  // sube hasta chat-app
            }));
            input.value = '';
        };

        btn.addEventListener('click', send);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') send();
        });
    }
}
customElements.define('chat-input', ChatInput);

// ─────────────────────────────────────────
// COMPONENTE: Login (pedir username)
// ─────────────────────────────────────────
class ChatLogin extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div style="display:flex; gap:8px;">
                <input id="username-input" type="text" placeholder="Tu nombre de usuario" style="padding:8px;"/>
                <button id="join-btn" style="padding:8px 16px;">Entrar</button>
            </div>
        `;

        const input = this.querySelector('#username-input');
        const btn = this.querySelector('#join-btn');

        const join = () => {
            const username = input.value.trim();
            if (!username) return;
            this.dispatchEvent(new CustomEvent('user-joined', {
                detail: { username },
                bubbles: true
            }));
        };

        btn.addEventListener('click', join);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') join();
        });
    }
}
customElements.define('chat-login', ChatLogin);

// ─────────────────────────────────────────
// COMPONENTE RAÍZ: chat-app (como App.jsx en React)
// ─────────────────────────────────────────
class ChatApp extends HTMLElement {
    connectedCallback() {
        this.username = '';

        this.innerHTML = `
            <div style="max-width:600px; margin:40px auto; font-family:sans-serif;">
                <h2>Chat en Tiempo Real</h2>
                <chat-login></chat-login>
                <div id="chat-area" style="display:none;">
                    <user-list id="user-list"></user-list>
                    <div id="messages" style="
                        border:1px solid #ccc;
                        height:300px;
                        overflow-y:auto;
                        padding:10px;
                        margin-top:10px;
                    "></div>
                    <chat-input></chat-input>
                </div>
            </div>
        `;

        // Evento: usuario entra
        this.addEventListener('user-joined', (e) => {
            this.username = e.detail.username;
            socket.emit('set_username', this.username);

            this.querySelector('chat-login').style.display = 'none';
            this.querySelector('#chat-area').style.display = 'block';
        });

        // Evento: usuario envía mensaje
        this.addEventListener('send-message', (e) => {
            socket.emit('chat_message', {
                username: this.username,
                message: e.detail.message,
                timestamp: new Date().toLocaleTimeString()
            });
        });

        // Socket: recibir mensaje
        socket.on('chat_message', (data) => {
            const messages = this.querySelector('#messages');
            const msg = document.createElement('chat-message');
            msg.setAttribute('user', data.username);
            msg.setAttribute('text', data.message);
            msg.setAttribute('time', data.timestamp || new Date().toLocaleTimeString());
            msg.setAttribute('own', data.username === this.username);
            messages.appendChild(msg);
            messages.scrollTop = messages.scrollHeight;
        });

        // Socket: lista de usuarios
        socket.on('user_list', (users) => {
            this.querySelector('#user-list').render(users);
        });

        // Socket: alguien entró
        socket.on('user_joined', (data) => {
            console.log(`${data.username} se unió`);
        });

        // Socket: alguien salió
        socket.on('user_left', (data) => {
            console.log(`${data.username} salió`);
        });
    }
}
customElements.define('chat-app', ChatApp);