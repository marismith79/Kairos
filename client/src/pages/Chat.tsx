import React, { useEffect, useRef, useState, ComponentRef } from "react";
import { VoiceProvider } from "@humeai/voice-react";
import Messages from "../components/Messages";
import Controls from "../components/Controls";
import StartCall from "../components/StartCall";

import { getHumeAccessToken } from "../humeAuth";
const apiKey = 'ocPhYbHTfeKulrbozQyjtW4SAvKEXdk9FtfoSY6Plz8ZJXtH'

export default function Chat() {

  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchAccessToken = async () => {
      try {
        const token = await getHumeAccessToken();
        setAccessToken(token);
      } catch (error) {
        console.error("Error fetching access token:", error);
      }
    };
    fetchAccessToken();
  }, []);

  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);

  // Show a loader while fetching the token
  if (!accessToken) {
    return <div>Loading...</div>;
  }

  console.log(accessToken)

  return (
    <div>
      <VoiceProvider
        auth={{ type: "apiKey", value: apiKey }}
        onMessage={() => {
          if (timeout.current) {
            clearTimeout(timeout.current);
          }

          timeout.current = setTimeout(() => {
            if (ref.current) {
              const scrollHeight = ref.current.scrollHeight;

              ref.current.scrollTo({
                top: scrollHeight,
                behavior: "smooth",
              });
            }
          }, 200);
        }}
      >
        <Messages ref={ref} />
        <Controls />
        <StartCall />
      </VoiceProvider>
    </div>
  );
}
