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

spatializeAudio('test.mp3', 'test.mp3');

