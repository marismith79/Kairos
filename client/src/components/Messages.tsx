import { cn } from "../lib/utils";
import { motion } from "framer-motion";
import { ComponentRef, forwardRef } from "react";

const Messages = forwardRef<ComponentRef<typeof motion.div>, { messages: any[] }>(function Messages({ messages }, ref) {
  return (
    <motion.div className="message-container" ref={ref}>
      {messages.map((msg, index) => {
        if (msg.type === "user_message" || msg.type === "assistant_message") {
          return (
            <motion.div
              key={msg.type + index}
              className={cn("message", msg.type === "user_message" ? "user" : "assistant")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 0 }}
            >
              <div className="role">{msg.message.role}</div>
              <div className="content">{msg.message.content}</div>
              {/* <Expressions values={msg.models.prosody?.scores} /> */}
            </motion.div>
          );
        }
        return null;
      })}
    </motion.div>
  );
});

export default Messages;
