import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:3000");

export default function Chat() {
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"transcriptions" | "notes">("transcriptions");

  useEffect(() => {
    socket.on("resetChat", () => {
      setTranscriptions([]);
      setNotes([]);
    });
    socket.on("finalTranscription", (data: string) => {
      setTranscriptions((prev) => [...prev, data]);
    });
    socket.on("notes", (data: any) => {
      if (data?.notes) {
        setNotes(data.notes);
      } else {
        setNotes((prev) => [...prev, data]);
      }
    });
    return () => {
      socket.off("resetChat");
      socket.off("finalTranscription");
      socket.off("notes");
    };
  }, []);

  return (
    <div className="container">
      <div className="chat-container">
        <div className="toggle-buttons" style={{ marginBottom: "1rem" }}>
          <button onClick={() => setActiveView("transcriptions")}>Transcriptions</button>
          <button onClick={() => setActiveView("notes")}>Generated Notes</button>
        </div>
        {activeView === "transcriptions" && (
          <div className="view-container">
            <h3>Transcriptions:</h3>
            {transcriptions.length > 0 ? (
              transcriptions.map((text, index) => (
                <div key={index} className="chat-card">{text}</div>
              ))
            ) : (
              <p>No transcriptions available.</p>
            )}
          </div>
        )}
        {activeView === "notes" && (
          <div className="view-container">
            <h3>Generated Notes:</h3>
            {notes.length > 0 ? (
              <ul style={{ display: "flex", flexDirection: "column", listStyleType: "disc", paddingLeft: "1rem" }}>
                {notes.map((note, index) => {
                  const content = note?.choices?.[0]?.message?.content || note?.choices?.[0]?.text;
                  return (
                    <li key={index}>
                      <strong>{note.title || "Note"}</strong>: {content ? content : "No content available"}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>No generated notes available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
