import React from "react";

interface TeamMemberProps {
    name: string;
    role: string;
    image: string;
}
export default function TeamMember({ name, role, image }: TeamMemberProps) {
  return (
      <div>
          <img className='team-member-img' src={image} alt={`${name}`} />
          <h1>{name}</h1>
          <p>{role}</p>
      </div>
  )
}
