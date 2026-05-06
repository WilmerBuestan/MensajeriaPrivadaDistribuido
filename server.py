import os
from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import uuid
import threading

app = Flask(__name__) # <--- ¡Asegúrate de que esta línea esté aquí!
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default_dev_key')
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*")

# { sid: { username, room } }
usuarios = {}

# { msg_id: { timer, room } } — solo metadatos, nunca el contenido
mensajes_activos = {}

# CONEXIÓN

@socketio.on('connect')
def handle_connect():
    print(f'Cliente conectado: {request.sid}')


# UNIRSE A UNA SALA

@socketio.on('join_room_event')
def handle_join(data):
    username = data.get('username', '').strip()
    room = data.get('room', '').strip()

    if not username or not room:
        return

    usuarios[request.sid] = {'username': username, 'room': room}
    join_room(room)

    emit('user_joined', {'username': username}, to=room)
    
    users_in_room = [v['username'] for v in usuarios.values() if v['room'] == room]
    emit('user_list', users_in_room, to=room)

    print(f'{username} entró a la sala {room}')

# ─────────────────────────────────────────
# MENSAJE CON TTL
# ─────────────────────────────────────────
@socketio.on('chat_message')
def handle_message(data):
    user = usuarios.get(request.sid)
    if not user:
        return

    msg_id = str(uuid.uuid4())
    room = user['room']
    ttl = data.get('ttl', None)  # en segundos, None = sin límite

    payload = {
        'msg_id': msg_id,
        'username': user['username'],
        'message': data.get('message', ''),
        'timestamp': data.get('timestamp', ''),
        'ttl': ttl,
        'sender_sid': request.sid
    }

    emit('chat_message', payload, to=room)

    # Si tiene TTL, programar invalidación en servidor
    if ttl:
        def invalidar():
            if msg_id in mensajes_activos:
                del mensajes_activos[msg_id]
                socketio.emit('message_expired', {'msg_id': msg_id}, to=room)

        timer = threading.Timer(ttl, invalidar)
        timer.start()
        mensajes_activos[msg_id] = {'timer': timer, 'room': room}

    print(f'[{room}] {user["username"]}: {data.get("message")} (ttl={ttl})')

# ─────────────────────────────────────────
# CONFIRMACIÓN DE LECTURA
# ─────────────────────────────────────────
@socketio.on('message_read')
def handle_read(data):
    msg_id = data.get('msg_id')
    sender_sid = data.get('sender_sid')

    # Notificar solo al emisor original
    emit('read_receipt', {'msg_id': msg_id}, to=sender_sid)


# DESCONEXIÓN
@socketio.on('disconnect')
def handle_disconnect():
    user = usuarios.pop(request.sid, None)
    if user:
        room = user['room']
        leave_room(room)
        emit('user_left', {'username': user['username']}, to=room)

        users_in_room = [v['username'] for v in usuarios.values() if v['room'] == room]
        emit('user_list', users_in_room, to=room)

        print(f'{user["username"]} salió de la sala {room}')

if __name__ == '__main__':
    socketio.run(app, host='localhost', port=5000, debug=True)