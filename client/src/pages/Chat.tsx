import { useEffect, useState } from "react";
import { humeService } from "../humeService"; // Make sure HumeService is imported
import ChatCard from "../components/ChatCard"; 
import Controls from "../components/Controls";
import StartCall from "../components/StartCall";

export default function Chat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  const handleEndCall = () => {
    console.log("Call ended");
    humeService.disconnect();  // Disconnect when ending the call
  };

  useEffect(() => {
    // Subscribe to messages from HumeService
    const messageListener = (message: any) => {
      if (message && message.message && message.message.role && message.message.content) {
        setMessages((prevMessages) => [...prevMessages, message]);
      } else {
        console.error("Invalid message format:", message);
      }
    };

    // Add the message listener when component mounts
    humeService.addMessageListener(messageListener);

    // Cleanup listener when component unmounts
    return () => {
      humeService.removeMessageListener(messageListener);
    };
  }, []);

  return (
    <div className="chat-container">
      <div id="chat">
        {/* Render each message */}
        {messages.map((message, index) => (
          <ChatCard key={index} message={message} />
        ))}
      </div>
      <Controls onEndCall={handleEndCall} />
      <StartCall />
    </div>
  );
}