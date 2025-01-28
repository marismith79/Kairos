import { useEffect, useState, useRef } from "react";
import { VoiceProvider } from "@humeai/voice-react";
import Messages from "../components/Messages";
import Controls from "../components/Controls";
import StartCall from "../components/StartCall";
import EmotionsLogger from "../components/EmotionsLogger";

export default function Chat() {
  const [messages, setMessages] = useState<any[]>([]); // Store messages in state
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  // Add message to state with typing effect
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

    // Simulate typing effect
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

        await new Promise((resolve) => setTimeout(resolve, 50)); // Adjust typing speed
      }
    };

    // Add the initial message to the state
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

  return (
    <div className="relative grow flex flex-col mx-auto w-full overflow-hidden h-[0px]">
      <div className="chat-container" ref={ref}>
        <EmotionsLogger />
        <Messages messages={messages} /> {/* Pass the messages to the Messages component */}
      </div>
      <Controls onEndCall={handleEndCall} />
      <StartCall />
    </div>
  );
}
