import { useEffect, useState } from "react";
import io from "socket.io-client";
import SentimentChart from "../components/SentimentChart";
import { FormattedNote } from "../components/ui/FormattedNote";

const socket = io("http://localhost:3000");

export default function Chat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editedNotes, setEditedNotes] = useState<any[]>([]);
  const [notesStable, setNotesStable] = useState(false);

  useEffect(() => {
    // Listen for final transcription events.
    socket.on("finalTranscription", (data: string) => {
      console.log("Received final transcription:", data);
      setMessages(prev => [...prev, data]);
      setCurrentMessage("");
    });

    // Listen for interim transcription events.
    socket.on("interimTranscription", (data: string) => {
      console.log("Received interim transcription:", data);
      setCurrentMessage(data);
    });

    // Listen for top3 emotions updates.
    socket.on("top3emotionsUpdate", (data: any) => {
      console.log("Received sentiment update:", data);
      setPredictions(prev => [...prev, ...data]);
    });

    // Listen for generated notes events.
    socket.on("notesGenerated", (data: any) => {
      console.log("Received generated notes:", data);
      setNotes(prev => [...prev, data]);
    });

    return () => {
      socket.off("finalTranscription");
      socket.off("interimTranscription");
      socket.off("top3emotionsUpdate");
      socket.off("notesGenerated");
    };
  }, []);

  // When new notes arrive, mark the notes as not stable and reset the edit mode if active.
  useEffect(() => {
    if (notes.length > 0) {
      setNotesStable(false);
      // If a new note comes in during edit mode, exit edit mode and update the edited notes.
      if (editMode) {
        setEditMode(false);
      }
      // Reset the timer each time notes change.
      const timer = setTimeout(() => {
        setNotesStable(true);
        // Mirror the current notes into the editable state.
        setEditedNotes(notes);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [notes, editMode]);

  // Ensure that, when not in edit mode, our editable notes match the actual notes.
  useEffect(() => {
    if (!editMode) {
      setEditedNotes(notes);
    }
  }, [notes, editMode]);

  const handleNoteChange = (index: number, value: string) => {
    setEditedNotes(prev => {
      const updated = [...prev];
      // Ensure we maintain the correct structure
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          choices: [{
            message: {
              content: value
            }
          }]
        };
      }
      return updated;
    });
  };

  const toggleEditMode = () => {
    if (notesStable) {
      if (editMode) {
        // Save changes
        setNotes(editedNotes);
        console.log("Saved notes:", editedNotes);
      } else {
        // Enter edit mode
        setEditedNotes(notes);
        console.log("Entered edit mode with notes:", notes);
      }
      setEditMode(prev => !prev);
    }
  };

  return (
    <div className="container">
      <div className="chat-container">
        <h3>Chat</h3>
        {messages.map((text, index) => (
          <div key={index} className="chat-card">
            {text}
            <hr style={{ border: '1px solid #cccccc', margin: '5px 0' }} />
            <div style={{ fontSize: '0.9em', color: '#000000' }}>
              Top emotions: {predictions[index]?.emotions.join(', ')}
            </div>
          </div>
        ))}
        {currentMessage && (
          <div className="chat-card interim">
            {currentMessage}
          </div>
        )}
      </div>
      
      <div className="notes-container">
        <h3>Notes</h3>
        {editedNotes.map((note, index) => {
          const noteContent = note?.choices?.[0]?.message?.content || note || '';
          return (
            <div key={index} className="note-card">
              <FormattedNote
                content={noteContent}
                isEditing={editMode}
                onEdit={(value) => handleNoteChange(index, value)}
              />
            </div>
          );
        })}
        {notesStable && (
          <div className="notes-buttons-container">
            <button 
              onClick={toggleEditMode} 
              className="edit-button"
            >
              Edit
            </button>
            <button 
              onClick={toggleEditMode} 
              className="submit-button"
            >
              Submit
            </button>
          </div>
        )}
      </div>
      
      <div className="sentiment-container">
        <h3>Sentiment</h3>
        <SentimentChart />
      </div>
    </div>
  );
}