import React from "react";
import { useVoice } from "@humeai/voice-react";
import { Button } from "./ui/button";
import { Mic, MicOff, Phone } from "lucide-react";
import MicFFT from "./MicFFT";
import { motion } from "framer-motion";
import { Toggle } from "./ui/toggle";
import { cn } from "../utils/index";

interface ControlsProps {
  onEndCall: () => void; // Accept the onEndCall handler as a prop
}

export default function Controls({ onEndCall }: ControlsProps) {
  const { disconnect, status, isMuted, unmute, mute, micFft } = useVoice();

  return (
    <div className={cn("fixed bottom-0 left-0 w-full p-4 flex items-center justify-center", "bg-gradient-to-t from-card via-card/90 to-card/0")}>
      {status.value === "connected" && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          className={"p-4 bg-card border border-border rounded-lg shadow-sm flex items-center gap-4"}
        >
          <Toggle pressed={!isMuted} onPressedChange={() => (isMuted ? unmute() : mute())}>
            {isMuted ? <MicOff className={"size-4"} /> : <Mic className={"size-4"} />}
          </Toggle>

          <div className={"relative grid h-8 w-48 shrink grow-0"}>
            <MicFFT fft={micFft} className={"fill-current"} />
          </div>

          <Button
            className={"flex items-center gap-1"}
            onClick={() => {
              disconnect();  // Disconnect the call
              onEndCall();   // Call the provided onEndCall handler
            }}
            variant={"destructive"}
          >
            <span>
              <Phone className={"size-4 opacity-50"} strokeWidth={2} stroke={"currentColor"} />
            </span>
            <span>End Call</span>
          </Button>
        </motion.div>
      )}
    </div>
  );
}
