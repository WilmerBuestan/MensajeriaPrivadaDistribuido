import { useEffect, useState } from 'react';
import socket from './socket';
import LoginScreen from './components/LoginScreen';
import ChatRoom from './components/ChatRoom';

export default function App() {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [joined, setJoined] = useState(false);

  const handleJoin = (user, roomName) => {
    setUsername(user);
    setRoom(roomName);

    sessionStorage.setItem('username', user);
    sessionStorage.setItem('room', roomName);

    socket.connect();
    socket.emit('join_room_event', { username: user, room: roomName });
    setJoined(true);
  };

  // Reconexión automática si recarga la página
useEffect(() => {
  const savedUser = sessionStorage.getItem('username');
  const savedRoom = sessionStorage.getItem('room');
  if (savedUser && savedRoom) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleJoin(savedUser, savedRoom);
  }
}, []);



  const handleLeave = () => {
    setJoined(false);
    setUsername('');
    setRoom('');
  };

  return joined
    ? <ChatRoom username={username} room={room} onLeave={handleLeave} />
    : <LoginScreen onJoin={handleJoin} />;
}