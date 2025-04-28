import { useState } from "react";

interface EditableNoteProps {
  initialContent: string;
}

export default function EditableNote({ initialContent }: EditableNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(initialContent);

  const handleSave = () => {
    setIsEditing(false);
    // Optional: You could trigger a parent save event here if needed
  };

  const lines = editedContent
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return (
    <div className="note-card">
      {isEditing ? (
        <textarea
          className="note-content-edit"
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
        />
      ) : (
        lines.map((line, i) => <p key={i}>{line}</p>)
      )}

      <div style={{ marginTop: "8px", textAlign: "right" }}>
        {isEditing ? (
          <button
            onClick={handleSave}
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            Save
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
