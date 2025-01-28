
import { useEffect, useState, useRef } from "react";
import { humeService } from "../humeService"; // Make sure HumeService is imported
import Messages from "../components/Messages";
import Controls from "../components/Controls";
import StartCall from "../components/StartCall";
import EmotionsLogger from "../components/EmotionsLogger";

// export default function Chat() {
//   const [messages, setMessages] = useState<any[]>([]); // Store messages in state
//   const [connected, setConnected] = useState<boolean>(false);

//   const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
//   const ref = useRef<HTMLDivElement | null>(null);

//   // Subscribe to the store and handle incoming messages
//   useEffect(() => {
//     // Subscribe to store to listen for new messages
//     const unsubscribe = humeService.getStore().subscribe((state) => {
//       setConnected(state.connected);
//       if (state.connected) {
//         humeService.socket?.on("message", (message) => {
//           if (message.type === "assistant_message") {
//             const latestMessage = {
//               type: "assistant_message",
//               message: {
//                 role: "assistant",
//                 content: message.message.content,
//               },
//             };
//             handleMessage(latestMessage);
//       }
//       });
//       }
//     });

//     // Cleanup on unmount: unsubscribe and disconnect
//     return () => {
//       unsubscribe();
//       humeService.disconnect();
//     };
//   }, [humeService]);

//   // Message handling logic to simulate message display
//   const handleMessage = (newMessage: any) => {
//     if (!newMessage || !newMessage.message || !newMessage.message.content) {
//       console.error("Invalid message structure", newMessage);
//       return;
//     }

//     const messageContent = newMessage.message.content;

//     if (!messageContent) {
//       console.error("Message content is empty", newMessage);
//       return;
//     }

//     let index = 0;
//     let displayedContent = "";

//     // Simulate typing effect for the message content
//     const simulateTypingEffect = async () => {
//       while (index < messageContent.length) {
//         displayedContent += messageContent[index];
//         index += 1;

//         setMessages((prevMessages) => {
//           const updatedMessages = [...prevMessages];
//           updatedMessages[updatedMessages.length - 1] = {
//             ...newMessage,
//             message: { ...newMessage.message, content: displayedContent },
//           };
//           return updatedMessages;
//         });

//         await new Promise((resolve) => setTimeout(resolve, 50)); // Adjust typing speed
//       }
//     };

//     setMessages((prevMessages) => [...prevMessages, newMessage]);
//     simulateTypingEffect();

//     if (timeout.current) {
//       clearTimeout(timeout.current);
//     }

//     timeout.current = setTimeout(() => {
//       if (ref.current) {
//         const scrollHeight = ref.current.scrollHeight;
//         ref.current.scrollTo({
//           top: scrollHeight,
//           behavior: "smooth",
//         });
//       }
//     }, 200);
//   };

//   const handleEndCall = () => {
//     console.log("Call ended");
//   };

//   return (
//     <div className="relative grow flex flex-col mx-auto w-full overflow-hidden h-[0px]">
//       <div className="chat-container" ref={ref}>
//         <EmotionsLogger />
//         <Messages messages={messages} />
//       </div>
//       <Controls onEndCall={handleEndCall} />
//       <StartCall />
//     </div>
//   );
// }


import ChatCard from '../components/ChatCard'; 

export default function Chat(): JSX.Element {
  const [messages, setMessages] = useState<any[]>([]);

  const handleEndCall = () => {
    console.log("Call ended");
  };
  
  useEffect(() => {
    // Subscribe to messages from HumeService
    const messageListener = (message: any) => {
      setMessages((prevMessages) => [...prevMessages, message]);
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
      {/* Render each message */}
      <div id="chat">
      <EmotionsLogger />
        {messages.map((message, index) => (
          <ChatCard key={index} message={message} />
        ))}
        <StartCall />
        <Controls onEndCall={handleEndCall} />
      </div>
    </div>
  );
}
