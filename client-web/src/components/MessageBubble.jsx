import { useEffect, useRef, useState } from 'react';
import socket from '../socket';

export default function MessageBubble({ msg, currentUser }) {
  const isOwn = msg.username === currentUser;
  const ref = useRef(null);
  const [secondsLeft, setSecondsLeft] = useState(msg.ttl || null);
  const [expired, setExpired] = useState(false);
  const [read, setRead] = useState(false);

  // IntersectionObserver — emite message_read cuando el mensaje es visible
  useEffect(() => {
    if (isOwn || !msg.msg_id) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        socket.emit('message_read', {
          msg_id: msg.msg_id,
          sender_sid: msg.sender_sid,
        });
        observer.disconnect();
      }
    });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
}, [isOwn, msg.msg_id, msg.sender_sid]);

  // Escuchar read_receipt para este mensaje
  useEffect(() => {
    const handler = (data) => {
      if (data.msg_id === msg.msg_id) setRead(true);
    };
    socket.on('read_receipt', handler);
    return () => socket.off('read_receipt', handler);
  }, [msg.msg_id]);

  // Countdown TTL
  useEffect(() => {
    if (!msg.ttl) return;

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [msg.ttl]);

  if (expired) return null;

  return (
    <div className={`bubble-wrapper ${isOwn ? 'own' : 'other'}`} ref={ref}>
      {!isOwn && (
        <span style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: 2 }}>
          {msg.username}
        </span>
      )}
      <div className={`bubble ${isOwn ? 'own' : 'other'}`}>
        {msg.message}
      </div>
      <div className="bubble-meta">
        <span>{msg.timestamp}</span>
        {msg.ttl && (
          <span className="ttl-badge">⏱ {secondsLeft}s</span>
        )}
        {isOwn && (
          <span className={`read-check ${read ? 'read' : 'sent'}`}>
            {read ? '✓✓' : '✓'}
          </span>
        )}
      </div>
    </div>
  );
}