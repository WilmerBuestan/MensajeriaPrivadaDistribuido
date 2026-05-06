import { useState } from 'react';

export default function LoginScreen({ onJoin }) {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');

  const handleJoin = () => {
    if (!username.trim() || !room.trim()) return;
    onJoin(username.trim(), room.trim());
  };

  return (
    <div className="login-container">
      <h2>💬 Chat Privado</h2>
      <input
        placeholder="Tu nombre de usuario"
        value={username}
        onChange={e => setUsername(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleJoin()}
      />
      <input
        placeholder="Código de sala privada"
        value={room}
        onChange={e => setRoom(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleJoin()}
      />
      <button onClick={handleJoin}>Entrar a la sala</button>
    </div>
  );
}