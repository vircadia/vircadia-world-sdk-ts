import { createLibp2p, Libp2p } from 'libp2p'
import { webRTC } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { bootstrap } from '@libp2p/bootstrap'

const relayMultiaddr = '/ip4/127.0.0.1/tcp/9090/ws/p2p/12D3KooWDpJ7As7BWAwRMfu1VU2WCqNjvq387JEYKDBj4kx6nXTN'

export async function createNode(): Promise<Libp2p> {
    const node = await createLibp2p({
        addresses: {
            listen: ['/webrtc']
        },
        transports: [
            webRTC(),
            webSockets()
        ],
        connectionEncryption: [noise()],
        streamMuxers: [mplex()],
        peerDiscovery: [
            bootstrap({
                list: [relayMultiaddr]
            })
        ]
    })

    return node
}

export async function initNode(): Promise<void> {
    try {
        const node = await createNode();
        await node.start();

        updateStatus('Node started');
        updatePeerId(node.peerId.toString());

        node.addEventListener('peer:connect', (evt) => {
            const conn = evt.detail;
            const peerId = conn.remotePeer.toString();
            console.log('Connected to:', peerId);
            updateConnections(node);
        });

        node.addEventListener('peer:disconnect', (evt) => {
            const conn = evt.detail;
            const peerId = conn.remotePeer.toString();
            console.log('Disconnected from:', peerId);
            updateConnections(node);
        });

        updateConnections(node);
    } catch (error) {
        console.error('Failed to initialize node:', error);
        updateStatus('Failed to initialize node');
    }
}

function updateStatus(message: string): void {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function updatePeerId(peerId: string): void {
    const peerIdElement = document.getElementById('peerId');
    if (peerIdElement) {
        peerIdElement.textContent = `PeerId: ${peerId}`;
    }
}

function updateConnections(node: Libp2p): void {
    const connectionsDiv = document.getElementById('connections');
    if (connectionsDiv) {
        connectionsDiv.innerHTML = '<h3>Connected Peers:</h3>';
        const peers = node.getPeers();
        peers.forEach(peer => {
            const peerDiv = document.createElement('div');
            peerDiv.textContent = peer.toString();
            connectionsDiv.appendChild(peerDiv);
        });
    }
}
