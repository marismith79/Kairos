import "../App.css"
import TeamMember from "../components/TeamMember";
import image1 from "../utils/shomari.jpeg"
import image2 from "../utils/alejandro.jpeg"

const link1 = "https://www.linkedin.com/in/shomari-c-smith/"
const link2 = "https://www.linkedin.com/in/alejandro-rojas-076a55242/"

export default function About() {
  return (
    <div className="section-container">
      <section className="section-card">
        <h1 className="page-header">About</h1>
        <p className="page-content">
          Kairos enables crisis care counselors to do what they do best–be a comforting voice to individuals in crisis. We're building real-time voice AI analytics into crisis calls to reduce counselor burnout and improve call quality.
        </p>
      </section>

      <section className="section-card">
        <h2 className="page-header">Mission</h2>
        <p className="page-content">
        Our founders have seen first-hand how important every second is in crisis scenarios. We’re on a mission to make crisis care navigation as quick and seamless as possible. We're aiming to improve every second of a crisis call and improve pathways in the care continuum nationwide. 
        </p>
      </section>

      <section className="section-card">
        <h2 className="page-header">Team</h2>
        <div className="team-container">
            <TeamMember
              name="Shomari Smith"
              role="Founder"
              image={image1}
              link={link1}
            />
            <TeamMember
              name="Alejandro Rojas"
              role="Founder"
              image={image2}
              link={link2}
            />
        </div>
      </section>
      <div>
          Partner logo placeholders
          <div>
            <span>Partner Logo</span>
          </div>
          <div>
            <span>Partner Logo</span>
          </div>
        </div>
    </div>
  );
}
