// Initialize variables for WebRTC
let localStream: MediaStream;
let peerConnection: RTCPeerConnection;

const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ]
  };
// Function to initialize WebRTC
async function initializeWebRTC() {
  // Get local audio stream from microphone
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // Create a new peer connection
  peerConnection = new RTCPeerConnection(configuration);

  // Add local stream to the peer connection
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  // Set up event listeners for the peer connection
  peerConnection.onicecandidate = handleICECandidate;
  peerConnection.ontrack = handleRemoteTrack;

  // Create an offer and set it as the local description
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // Send the offer to the remote peer via the signaling server
  signalOffer(offer);
}

// Function to handle incoming ICE candidates
function handleICECandidate(event: RTCPeerConnectionIceEvent) {
  if (event.candidate) {
    // Send the ICE candidate to the remote peer via the signaling server
    signalICECandidate(event.candidate);
  }
}

// Function to handle incoming remote tracks
function handleRemoteTrack(event: RTCTrackEvent) {
  const remoteAudioStream = event.streams[0];
  // Use the remote audio stream in the spatialization function
  spatializeAudio(remoteAudioStream);
}

// Function to handle incoming offers from the signaling server
async function handleOffer(offer: RTCSessionDescriptionInit) {
  await peerConnection.setRemoteDescription(offer);

  // Create an answer and set it as the local description
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  // Send the answer back to the remote peer via the signaling server
  signalAnswer(answer);
}

// Function to handle incoming answers from the signaling server
async function handleAnswer(answer: RTCSessionDescriptionInit) {
  await peerConnection.setRemoteDescription(answer);
}

// Function to handle incoming ICE candidates from the signaling server
async function handleRemoteICECandidate(candidate: RTCIceCandidateInit) {
  await peerConnection.addIceCandidate(candidate);
}

// Functions to send signaling messages (to be implemented based on your signaling server)
function signalOffer(offer: RTCSessionDescriptionInit) {
  // Send the offer to the remote peer via the signaling server
}

function signalAnswer(answer: RTCSessionDescriptionInit) {
  // Send the answer to the remote peer via the signaling server
}

function signalICECandidate(candidate: RTCIceCandidateInit) {
  // Send the ICE candidate to the remote peer via the signaling server
}

async function loadAudioContext(audioUrl: string): Promise<AudioBuffer> {
    const audioContext = new AudioContext();
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    return audioContext.decodeAudioData(arrayBuffer);
}

async function spatializeAudio(audioUrl1: string, audioUrl2: string) {
    const startTime = performance.now();

    const audioBuffer1 = await loadAudioContext(audioUrl1);
    const audioBuffer2 = await loadAudioContext(audioUrl2);

    const audioContext = new AudioContext();
    const pannerOptions = {panningModel: 'HRTF', distanceModel: 'inverse', positionX: 0, positionY: 0, positionZ: 0};
    const panner1 = new PannerNode(audioContext, { panningModel: 'HRTF', distanceModel: 'inverse' });
const panner2 = new PannerNode(audioContext, { panningModel: 'HRTF', distanceModel: 'inverse' });

panner1.positionX.setValueAtTime(0, audioContext.currentTime);
panner1.positionY.setValueAtTime(0, audioContext.currentTime);
panner1.positionZ.setValueAtTime(0, audioContext.currentTime);

panner2.positionX.setValueAtTime(0, audioContext.currentTime);
panner2.positionY.setValueAtTime(0, audioContext.currentTime);
panner2.positionZ.setValueAtTime(0, audioContext.currentTime);

    const source1 = audioContext.createBufferSource();
    source1.buffer = audioBuffer1;
    source1.connect(panner1).connect(audioContext.destination);
    source1.start();

    const source2 = audioContext.createBufferSource();
    source2.buffer = audioBuffer2;
    source2.connect(panner2).connect(audioContext.destination);
    source2.start();

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Create an audio element for output
    const audioElement = document.createElement('audio');
    audioElement.controls = true;
    const mixedAudioStream = audioContext.createMediaStreamDestination();
    source1.connect(mixedAudioStream);
    source2.connect(mixedAudioStream);
    audioElement.srcObject = mixedAudioStream.stream;


    document.getElementById('app').textContent = `Spatialization processing time: ${processingTime.toFixed(2)} ms`;
    document.getElementById('app').appendChild(audioElement); // Append the audio element to the DOM
}

// spatializeAudio('test.mp3', 'test.mp3');
initializeWebRTC();
