interface TeamMemberProps {
    name: string;
    role: string;
    image: string;
    link: string;
}

export default function TeamMember({ name, role, image, link }: TeamMemberProps) {
  return (
      <div>
          <a href={link} target="linkedin">
              <img className='team-member-img' src={image} alt={`${name}`} />
          </a>
          <h1>{name}</h1>
          <p>{role}</p>
      </div>
  )
}
