import React, { useEffect, useState, useRef, ComponentRef } from "react";
import { VoiceProvider } from "@humeai/voice-react";
import Messages from "../components/Messages";
import Controls from "../components/Controls";
import StartCall from "../components/StartCall";
import { getHumeAccessToken } from "../humeAuth";
import EmotionsLogger from "../components/EmotionsLogger";

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

  useEffect(() => {
    // Cleanup function to clear messages when the component is unmounted
    return () => {
      setMessages([]);
      localStorage.removeItem("messages");
    };
  }, []);

  const handleMessage = (newMessage: any) => {
     // Check if the message is an interruption or metadata, and skip it
    if (newMessage.type === "user_interruption" || newMessage.type === "assistant_end" || newMessage.type === "chat_metadata") {
    console.log("Skipping interruption or system message:", newMessage);
    return; 
  }

    if (!newMessage || !newMessage.message || !newMessage.message.content) {
      console.error("Invalid message structure", newMessage);
      return; 
    }
  
    const messageContent = newMessage.message.content;
  
    if (!messageContent) {
      console.error("Message content is empty", newMessage);
      return;
    }
  
    let index = 0;
    let displayedContent = "";
  
    const simulateTypingEffect = async () => {
      // Display the message content one character at a time
      while (index < messageContent.length) {
        displayedContent += messageContent[index];
        index += 1;
  
        // Update the last message in the array with the progressively displayed content
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];
          updatedMessages[updatedMessages.length - 1] = {
            ...newMessage,
            message: { ...newMessage.message, content: displayedContent },
          };
          return updatedMessages;
        });
  
        await new Promise((resolve) => setTimeout(resolve, 20)); // Adjust the typing speed (ms)
      }
    };
  
    // Add the initial message to the state (the first message is displayed immediately)
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  
    simulateTypingEffect();
  
    // Scroll the message container to the bottom
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

  const handleStartCall = () => {
    // Clear messages when the StartCall button is pressed
    setMessages([]);
    localStorage.removeItem("messages");
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
        <div className="chat-container">
          <EmotionsLogger/>
          <Messages ref={ref} messages={messages} />
        </div>
        
        <Controls onEndCall={handleEndCall} /> 
        <StartCall />
      </VoiceProvider>
    </div>
  );
}
