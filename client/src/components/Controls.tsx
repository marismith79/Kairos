import React from "react";
import { useVoice } from "@humeai/voice-react";
import { Button } from "./ui/button";
import { Mic, MicOff, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Toggle } from "./ui/toggle";

export default function Controls() {
  const { disconnect, status, isMuted, unmute, mute, micFft } = useVoice();

  return (
    <div>
      <AnimatePresence>
        {status.value === "connected" ? (
          <motion.div
            initial={{
              y: "100%",
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: "100%",
              opacity: 0,
            }}
          >
            <Toggle
              pressed={!isMuted}
              onPressedChange={() => {
                if (isMuted) {
                  unmute();
                } else {
                  mute();
                }
              }}
            >
              {isMuted ? <MicOff /> : <Mic />}
            </Toggle>

            <div>
              {/* <MicFFT fft={micFft} /> */}
            </div>

            <Button
              onClick={() => {
                disconnect();
              }}
              variant={"destructive"}
            >
              <span>
                <Phone strokeWidth={2} stroke={"currentColor"} />
              </span>
              <span>End Call</span>
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
