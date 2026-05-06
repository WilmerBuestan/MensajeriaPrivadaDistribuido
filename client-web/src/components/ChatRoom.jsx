import { useEffect, useRef, useState } from 'react';
import socket from '../socket';
import MessageBubble from './MessageBubble';

export default function ChatRoom({ username, room, onLeave }) {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [input, setInput] = useState('');
  const [ttl, setTtl] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    // Escuchar mensajes
    socket.on('chat_message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    // Mensaje expirado desde servidor
    socket.on('message_expired', ({ msg_id }) => {
      setMessages(prev => prev.filter(m => m.msg_id !== msg_id));
    });

    socket.on('user_list', (list) => setUsers(list));

    socket.on('user_joined', (data) => {
      setMessages(prev => [...prev, {
        msg_id: null,
        username: 'Sistema',
        message: `${data.username} se unió a la sala`,
        timestamp: new Date().toLocaleTimeString(),
        isNotification: true,
      }]);
    });

    socket.on('user_left', (data) => {
      setMessages(prev => [...prev, {
        msg_id: null,
        username: 'Sistema',
        message: `${data.username} salió de la sala`,
        timestamp: new Date().toLocaleTimeString(),
        isNotification: true,
      }]);
    });

    return () => {
      socket.off('chat_message');
      socket.off('message_expired');
      socket.off('user_list');
      socket.off('user_joined');
      socket.off('user_left');
    };
  }, []);

  // Scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    socket.emit('chat_message', {
      message: input.trim(),
      timestamp: new Date().toLocaleTimeString(),
      ttl: ttl ? parseInt(ttl) : null,
    });
    setInput('');
  };

  const handleLeave = () => {
    socket.disconnect();
    sessionStorage.clear();
    onLeave();
  };

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className="sidebar">
        <h3>👥 Sala: {room}</h3>
        <ul>
          {users.map((u, i) => (
            <li key={i}>{u === username ? `${u} (tú)` : u}</li>
          ))}
        </ul>
        <button
          onClick={handleLeave}
          style={{ marginTop: 'auto', padding: '8px', background: '#ff4444', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
        >
          Salir
        </button>
      </div>

      {/* Chat principal */}
      <div className="chat-main">
        <div className="chat-header">
          <h3>🔒 {room}</h3>
          <span style={{ color: '#aaa', fontSize: '0.85rem' }}>
            Conectado como <strong>{username}</strong>
          </span>
        </div>

        <div className="messages">
          {messages.map((msg, i) =>
            msg.isNotification ? (
              <div key={i} className="notification">{msg.message}</div>
            ) : (
              <MessageBubble key={msg.msg_id || i} msg={msg} currentUser={username} />
            )
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-area">
          <div className="ttl-selector">
            <span>⏱ Mensaje temporal:</span>
            <select value={ttl} onChange={e => setTtl(e.target.value)}>
              <option value="">Sin límite</option>
              <option value="10">10 segundos</option>
              <option value="60">1 minuto</option>
              <option value="300">5 minutos</option>
            </select>
          </div>
          <div className="input-row">
            <input
              placeholder="Escribe un mensaje..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage}>Enviar</button>
          </div>
        </div>
      </div>
    </div>
  );
}