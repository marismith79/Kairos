import React from 'react';

interface FormattedNoteProps {
  content: string;
  isEditing: boolean;
  onEdit: (value: string) => void;
}

export const FormattedNote: React.FC<FormattedNoteProps> = ({ content, isEditing, onEdit }) => {
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

  if (isEditing) {
    return (
      <textarea
        value={content}
        onChange={(e) => onEdit(e.target.value)}
        className="note-content-edit"
      />
    );
  }

  return (
    <div className="note-content">
      {formatNoteContent(content)}
    </div>
  );
}; 