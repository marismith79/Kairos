import React, { useState, useEffect } from 'react';

interface FormattedNoteProps {
  content: string;
  isEditing: boolean;
  onEdit: (value: string) => void;
}

export const FormattedNote: React.FC<FormattedNoteProps> = ({ content, isEditing, onEdit }) => {
  const [localContent, setLocalContent] = useState(content);

  // Update local content when prop changes
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Function to clean and format note content
  const formatNoteContent = (content: string) => {
    // Split content into sections based on headers
    const sections = content.split(/(?=###|##|#)/);
    
    return sections.map((section, index) => {
      // Remove markdown headers and clean up the text
      const cleanSection = section
        .replace(/^#+\s*/g, '') // Remove markdown headers
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Convert bold to HTML
        .replace(/\n/g, '<br />') // Convert newlines to HTML breaks
        .trim();

      return (
        <div key={index} className="note-section">
          <div dangerouslySetInnerHTML={{ __html: cleanSection }} />
        </div>
      );
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalContent(newValue);
    onEdit(newValue);
  };

  if (isEditing) {
    return (
      <textarea
        value={localContent}
        onChange={handleChange}
        className="note-content-edit"
        autoFocus
      />
    );
  }

  return (
    <div className="note-content">
      {formatNoteContent(localContent)}
    </div>
  );
}; 