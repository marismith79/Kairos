import { useState } from "react";

interface EditableNoteProps {
  initialContent: string;
}

export default function EditableNote({ initialContent }: EditableNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(initialContent);

  const handleSave = () => {
    setIsEditing(false);
    // optional: trigger save action
  };

  const lines = editedContent
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return (
    <div
      className="editable-note"
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "scroll",
        height: "100%",
        justifyContent: "space-between",
      }}
    >
      <div className="note-body" style={{ flexGrow: 1 }}>
        {isEditing ? (
          <textarea
            className="note-content-edit"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "20px",
              padding: "12px",
              fontFamily: "inherit",
              fontSize: "1rem",
              boxSizing: "border-box",
              resize: "none",
              border: "1px solid #ccc",
              backgroundColor: "#fff",
            }}
          />
        ) : (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "20px",
              padding: "15px",
              display: "flex",
              flexDirection: "column",
              border: "1px solid #ccc",
              justifyContent: "center",
              overflowY: "auto",  
              height: "100%",    
              maxHeight: "250px",
            }}
          >
            {lines.map((line, i) => (
              <p key={i} style={{ textAlign: "left" }}>
                {line}
              </p>
            ))}
          </div>
        )}
      </div>

      <div
        className="note-footer"
        style={{
          display: "flex",
          justifyContent: "space-around",
          marginTop: "12px",
        }}
      >
        <button
          onClick={() => {
            if (isEditing) handleSave();
            else setIsEditing(true);
          }}
          style={{
            backgroundColor: "#E57373", // red
            color: "black",
            border: "none",
            borderRadius: "50px",
            padding: "10px 30px",
            fontSize: "1rem",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {isEditing ? "Save" : "Edit"}
        </button>

        <button
          style={{
            backgroundColor: "#C8E6C9", // mint green
            color: "black",
            border: "none",
            borderRadius: "50px",
            padding: "10px 30px",
            fontSize: "1rem",
            fontWeight: "bold",
            cursor: "pointer",
          }}
          onClick={() => {
            /* No action for now */
          }}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
