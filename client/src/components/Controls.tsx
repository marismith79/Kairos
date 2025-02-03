import { useVoice } from "@humeai/voice-react";
import { Button } from "./ui/button";
import { Mic, MicOff, Phone } from "lucide-react";
import MicFFT from "./MicFFT";
import { motion } from "framer-motion";
import { Toggle } from "./ui/toggle";
import { cn } from "../lib/utils";
import { useHume } from '../hooks/useHume';

interface ControlsProps {
  onEndCall: () => void; 
}

export default function Controls({ onEndCall }: ControlsProps) {
  // const { disconnect, status, isMuted, unmute, mute, micFft } = useVoice();


  const { 
    connected, 
    disconnect, 
    connect,
  } = useHume();

  console.log("Controls connected:", connected);

  return (
    <div className="controls">
      {connected === true && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          className={"p-4 bg-card border border-border rounded-lg shadow-sm flex items-center gap-4"}
        >
          {/* <Toggle pressed={!isMuted} onPressedChange={() => (isMuted ? unmute() : mute())}>
            {isMuted ? <MicOff className={"size-4"} /> : <Mic className={"size-4"} />}
          </Toggle> */}

          {/* <div className={"relative grid h-8 w-48 shrink grow-0"}>
            <MicFFT fft={micFft} className={"fill-current"} />
          </div> */}

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
         {connected !== true && (
        // <motion.div
        //   initial="initial"
        //   animate="enter"
        //   exit="exit"
        //   variants={{
        //     initial: { opacity: 0 },
        //     enter: { opacity: 1 },
        //     exit: { opacity: 0 },
        //   }}
        // >
        //   <motion.div
        //     variants={{
        //       initial: { scale: 0.5 },
        //       enter: { scale: 1 },
        //       exit: { scale: 0.5 },
        //     }}
        //   >
            <Button
              onClick={() => {
                console.log(connected);
                connect()
                  .then(() => console.log(connected))
                  .catch((error) => console.error("Connection error:", error))
                  .finally(() => console.log("Connection attempt finished", connected));
              }}
            >
              <span>
                <Phone strokeWidth={2} stroke={"currentColor"} />
              </span>
              <span>Start Call</span>
            </Button>
        //   </motion.div>
        // </motion.div>
      )}
    </div>
  );
}
