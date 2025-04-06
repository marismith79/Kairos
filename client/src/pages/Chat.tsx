import { useState, useRef, useEffect } from "react";

export default function Chat() {
  const [recording, setRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadAnimationFrameId = useRef<number | null>(null);
  // Use a ref to store the header from the first complete chunk.
  const storedHeaderRef = useRef<Uint8Array | null>(null);

  // Helper to check if a WebM chunk starts with the expected EBML header.
  function isCompleteWebMChunk(buffer: ArrayBuffer): boolean {
    const header = new Uint8Array(buffer.slice(0, 4));
    return (
      header[0] === 0x1A &&
      header[1] === 0x45 &&
      header[2] === 0xDF &&
      header[3] === 0xA3
    );
  }

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
      
      // Received TTS emitted audio chunks
      wsConnection.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.event === "audioReady" && d.completeAudioBuffer) {
            new Audio(
              URL.createObjectURL(
                new Blob(
                  [Uint8Array.from(atob(d.completeAudioBuffer), (c) => c.charCodeAt(0))],
                  { type: "audio/webm" }
                )
              )
            ).play();
          }
        } catch (err) {
          console.error("Error parsing message from server:", err);
        }
      };

      setWs(wsConnection);

      // Set up MediaRecorder with a 1-second timeslice.
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = async (event: BlobEvent) => {
        if (event.data.size > 0 && wsConnection.readyState === WebSocket.OPEN) {
          try {
            const arrayBuffer = await event.data.arrayBuffer();
            const chunkUint8 = new Uint8Array(arrayBuffer);

            // Check if the chunk contains a complete EBML header.
            if (isCompleteWebMChunk(arrayBuffer)) {
              // Store header if not already stored.
              if (!storedHeaderRef.current) {
                // Store the first 100 bytes (adjust length as necessary).
                storedHeaderRef.current = chunkUint8.slice(0, 100);
              }
              wsConnection.send(arrayBuffer);
            } else {
              if (storedHeaderRef.current) {
                // Prepend the stored header to the incomplete chunk.
                const newChunk = new Uint8Array(storedHeaderRef.current.length + chunkUint8.length);
                newChunk.set(storedHeaderRef.current, 0);
                newChunk.set(chunkUint8, storedHeaderRef.current.length);
                wsConnection.send(newChunk.buffer);
              } else {
                // Fallback: send the chunk as-is if no header is stored.
                console.warn("Chunk is incomplete and no stored header is available. Sending chunk as-is.");
                wsConnection.send(arrayBuffer);
              }
            }
          } catch (err) {
            console.error("Error processing audio chunk:", err);
          }
        }
      };

      recorder.start(1000);
      setMediaRecorder(recorder);
      setRecording(true);

      // VAD monitoring: checks the volume level from the analyser node.
      const startVAD = () => {
        if (!analyserRef.current) return;
        const threshold = 0.008; // Adjust threshold as needed.
        let silenceStart: number | null = null;

        const checkVolume = () => {
          if (!analyserRef.current) return;
          const buffer = new Float32Array(analyserRef.current.fftSize);
          analyserRef.current.getFloatTimeDomainData(buffer);
          const rms = Math.sqrt(buffer.reduce((sum, val) => sum + val * val, 0) / buffer.length);
          console.log("RMS value:", rms);

          if (rms < threshold) {
            console.log("Check 1");
            if (!silenceStart) {
              silenceStart = performance.now();
            } else {
              const silenceDuration = performance.now() - silenceStart;
              console.log("Check 2");
              if (silenceDuration > 1000 && wsConnection.readyState === WebSocket.OPEN) {
                console.log("Check 3");
                console.log("Silence detected, sending VAD event.");
                wsConnection.send(JSON.stringify({ event: "vad", status: "silence" }));
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
      startVAD();
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  const stopCall = () => {
    console.log("Stopping call...");
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
    if (vadAnimationFrameId.current) {
      cancelAnimationFrame(vadAnimationFrameId.current);
      vadAnimationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: "stop" }));
      ws.close();
      setWs(null);
    }
    setRecording(false);
  };

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
