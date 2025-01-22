import React from "react";
// import { cn } from "../lib/utils";
import { useVoice } from "@humeai/voice-react";
import { AnimatePresence, motion } from "framer-motion";
import { ComponentRef, forwardRef } from "react";

const Messages = forwardRef<
  ComponentRef<typeof motion.div>,
  Record<never, never>
>(function Messages(_, ref) {
  const { messages } = useVoice();

  return (
    <motion.div
      layoutScroll
      ref={ref}
    >
      <motion.div>
        {messages.map((msg, index) => {
          if (
            msg.type === "user_message" ||
            msg.type === "assistant_message"
          ) {
            return (
              <motion.div
                key={msg.type + index}
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: 0,
                }}
              >
                <div>
                  {msg.message.role}
                </div>
                <div>{msg.message.content}</div>
              </motion.div>
            );
          }

          return null;
        })}
      </motion.div>
    </motion.div>
  );
});

export default Messages;
