// // Controls.tsx
// import { Button } from "./ui/button";
// import { Phone } from "lucide-react";
// import { motion } from "framer-motion";
// import { humeService } from "../humeServiceSenti";

// interface ControlsProps {
//   onEndCall: () => void;
// }

// export default function Controls({ onEndCall }: ControlsProps) {
//   return (
//     <div className="controls">
//       <motion.div
//         initial={{ y: "100%", opacity: 0 }}
//         animate={{ y: 0, opacity: 1 }}
//         exit={{ y: "100%", opacity: 0 }}
//         className="p-4 bg-card border border-border rounded-lg shadow-sm flex items-center"
//       >
//         <Button
//           className="flex items-center"
//           onClick={() => {
//             humeService.disconnect();
//             onEndCall();
//           }}
//           variant="destructive"
//         >
//           <span>
//             <Phone className="size-5 opacity-50" strokeWidth={2} stroke="currentColor" />
//           </span>
//           <span>End Call</span>
//         </Button>
//       </motion.div>
//     </div>
//   );
// }
