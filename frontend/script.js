


const socket = io('http://localhost:5000');
let localStream, remoteStream, peerConnection;
const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const statusText = document.getElementById('status');
const notifications = document.getElementById('notifications');
let roomId = '';

const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

joinBtn.onclick = async () => {
    roomId = roomInput.value;
    if (!roomId) return alert('Enter a room ID');

    setStatus('Joining room...');
    joinBtn.disabled = true;

    socket.emit('join-room', roomId);
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;

        initPeerConnection();
    } catch (err) {
        setStatus('Error accessing media devices.');
        console.error(err);
    }
};

function initPeerConnection() {
    peerConnection = new RTCPeerConnection(config);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = e => {
        if (e.candidate) {
            socket.emit('signal', { roomId, data: { candidate: e.candidate } });
        }
    };

    peerConnection.ontrack = e => {
        remoteVideo.srcObject = e.streams[0];
        setStatus('Connected');
    };

    peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'disconnected') {
            notify('Peer disconnected.');
            remoteVideo.srcObject = null;
            setStatus('Disconnected');
        }
    };
}

socket.on('user-joined', async () => {
    notify('A user joined the room.');
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('signal', { roomId, data: { sdp: peerConnection.localDescription } });
});

socket.on('signal', async ({ data }) => {
    if (data.sdp) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        if (data.sdp.type === 'offer') {
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('signal', { roomId, data: { sdp: peerConnection.localDescription } });
        }
    }
    if (data.candidate) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
            console.error('Error adding received ICE candidate', err);
        }
    }
});

socket.on('user-left', () => {
    notify('A user left the room.');
    remoteVideo.srcObject = null;
    setStatus('Waiting for peer...');
});

// Utility Functions
function setStatus(message) {
    statusText.textContent = `Status: ${message}`;
}

function notify(message) {
    notifications.textContent = message;
}
