import { useState, useRef, useEffect } from "react";

export default function Chat() {
  const [recording, setRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadAnimationFrameId = useRef<number | null>(null);
  // const wsConnection = new WebSocket("ws://localhost:3000");

  const startCall = async () => {
    const wsConnection = new WebSocket("ws://localhost:3000");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Establish a WebSocket connection to your backend.
      wsConnection.onopen = () => {
        console.log("WebSocket connection opened.");
        wsConnection.send(JSON.stringify({ event: "connected" }));
        wsConnection.send(JSON.stringify({ event: "start", streamSid: "unique-stream-id" }));
      };
      wsConnection.onclose = (e) => {
        console.log("WebSocket closed:", e);
      };
      wsConnection.onerror = (e) => {
        console.error("WebSocket error:", e);
      };
      wsConnection.onmessage = e => { 
        const d = JSON.parse(e.data); 
        if(d.event==="audioReady" && d.completeAudioBuffer)
          new Audio(URL.createObjectURL(new Blob([Uint8Array.from(atob(d.completeAudioBuffer), c=>c.charCodeAt(0))], {type:"audio/mp3"}))).play();
      };

      setWs(wsConnection);

      // Set up the MediaRecorder to capture audio and send chunks every 150ms.
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0 && wsConnection.readyState === WebSocket.OPEN) {
          // Convert the blob to a base64 string.
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result?.toString().split(",")[1];
            wsConnection.send(JSON.stringify({ event: "media", media: { payload: base64data } }));
          };
          reader.readAsDataURL(event.data);
        }
      };
      recorder.start(150);
      setMediaRecorder(recorder);
      setRecording(true);

      // VAD: Checks the volume level from the analyser node.
    const startVAD = () => {
      if (!analyserRef.current) return;
      const threshold = 0.008; // Adjust this threshold based on testing.
      let silenceStart: number | null = null;

      const checkVolume = () => {
        if (!analyserRef.current) return;
        const buffer = new Float32Array(analyserRef.current.fftSize);
        analyserRef.current.getFloatTimeDomainData(buffer);
        // Calculate RMS (root mean square) of the audio data.
        const rms = Math.sqrt(buffer.reduce((sum, val) => sum + val * val, 0) / buffer.length);
        console.log("RMS value:", rms);
        
        if (rms < threshold) {
          if (!silenceStart) {
            silenceStart = performance.now();
            // console.log("check1");
          } else {
            // console.log("check2");
            const silenceDuration = performance.now() - silenceStart;

            // If silence is detected for more than 1 second, send a VAD event.
            if (silenceDuration > 1000 && wsConnection.readyState === WebSocket.OPEN) {
              console.log("check3");
              wsConnection.send(JSON.stringify({ event: "vad", status: "silence" }));
              // Reset to avoid multiple triggers.
              silenceStart = null;
            }
          }
        } else {
          silenceStart = null;
        }
        vadAnimationFrameId.current = requestAnimationFrame(checkVolume);
      };

      vadAnimationFrameId.current = requestAnimationFrame(checkVolume);
    };
      // Start VAD monitoring.
      startVAD();
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  // Stops the call, stops all media, cancels VAD, and sends the "stop" event.
  const stopCall = () => {
    console.log("Stopping call...");
    // Stop the media recorder.
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
    // Cancel VAD animation.
    if (vadAnimationFrameId.current) {
      cancelAnimationFrame(vadAnimationFrameId.current);
      vadAnimationFrameId.current = null;
    }
    // Stop all tracks of the media stream.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    // Close the audio context.
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    // Send a "stop" event to the backend and close the WebSocket.
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: "stop" }));
      ws.close();
      setWs(null);
    }
    setRecording(false);
  };

  // Clean up when the component unmounts.
  useEffect(() => {
    console.log("Chat component mounted.");
    return () => {
      console.log("Chat component unmounted.");
      stopCall();
    };
  }, []);

  return (
    <div style={{ padding: "1rem" }}>
      {!recording ? (
        <button onClick={startCall}>Start Call</button>
      ) : (
        <button onClick={stopCall}>Stop Call</button>
      )}
    </div>
  );
}
