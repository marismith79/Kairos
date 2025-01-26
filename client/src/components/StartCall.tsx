import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Phone } from "lucide-react";
import { useHume } from '../hooks/useHume';


export default function StartCall() {

  const { 
        connected, 
        connect, 
      } = useHume();

  console.log("StartCall connected:", connected);
  return (
    <>
      {connected !== true && (
        <motion.div
          initial="initial"
          animate="enter"
          exit="exit"
          variants={{
            initial: { opacity: 0 },
            enter: { opacity: 1 },
            exit: { opacity: 0 },
          }}
        >
          <motion.div
            variants={{
              initial: { scale: 0.5 },
              enter: { scale: 1 },
              exit: { scale: 0.5 },
            }}
          >
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
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

