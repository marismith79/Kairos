import { useEffect, useState } from "react";
import { humeService } from "../humeService"; 
import ChatCard from "../components/ChatCard"; 
import Controls from "../components/Controls";
import StartCall from "../components/StartCall";

export default function Chat() {
  const [messages, setMessages] = useState<any[]>([]);

  const handleEndCall = () => {
    console.log("Call ended");
    humeService.disconnect();  // Disconnect when ending the call
  };

    // Subscribe to messages from HumeService
  const messageListener = (message: any) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  useEffect(() => {
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
        {messages.map((message, index) => (
          <ChatCard key={index} message={message} />
        ))}
      </div>
      <Controls onEndCall={handleEndCall} />
      <StartCall />
    </div>
  );
}