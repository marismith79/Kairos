import React, { useEffect, useState, useRef, ComponentRef } from "react";
import { VoiceProvider } from "@humeai/voice-react";
import Messages from "../components/Messages";
import Controls from "../components/Controls";
import StartCall from "../components/StartCall";
import { getHumeAccessToken } from "../humeAuth";

export default function Chat() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]); // Store messages in state
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);

  // Fetch access token on component mount
  useEffect(() => {
    const fetchAccessToken = async () => {
      try {
        const token = await getHumeAccessToken();
        setAccessToken(token);  // Store the access token in state
      } catch (error) {
        console.error("Error fetching access token:", error);
      }
    };
    fetchAccessToken();
  }, []);

  // Store messages in localStorage (optional for persistence)
  useEffect(() => {
    const savedMessages = localStorage.getItem("messages");
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  useEffect(() => {
    // Persist messages to localStorage every time they change
    localStorage.setItem("messages", JSON.stringify(messages));
  }, [messages]);

  const handleMessage = (newMessage: any) => {
    setMessages((prevMessages) => [...prevMessages, newMessage]);
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
  };

  const handleEndCall = () => {
    // Do not reset messages when the call ends
    console.log("Call ended");
  };

  if (!accessToken) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative grow flex flex-col mx-auto w-full overflow-hidden h-[0px]">
      <VoiceProvider
        auth={{ type: "accessToken", value: accessToken }}  // Use the access token here
        onMessage={handleMessage} // Add new message to the state
      >
        <Messages ref={ref} messages={messages} />
        <Controls onEndCall={handleEndCall} /> {/* Pass the onEndCall handler */}
        <StartCall />
      </VoiceProvider>
    </div>
  );
}
