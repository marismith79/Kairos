import React from 'react';

interface ChatCardProps {
  message: {
    role: string;
    timestamp: string;
    content: string;
    scores: { emotion: string; score: string }[];
  };
}

const ChatCard: React.FC<ChatCardProps> = ({ message }) => {
  return (
    <div className={`chat-card ${message.role}`}>
      <div className="role">{message.role.charAt(0).toUpperCase() + message.role.slice(1)}</div>
      <div className="timestamp"><strong>{message.timestamp}</strong></div>
      <div className="content">{message.content}</div>
      <div className="scores">
        {message.scores.map((score, index) => (
          <div key={index} className="score-item">
            {score.emotion}: <strong>{score.score}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatCard;
