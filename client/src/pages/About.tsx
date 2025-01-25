import "../App.css"
import TeamMember from "../components/TeamMember";

export default function About() {
  return (
    <div className="section-container">
      <section className="section-card">
        <h1 className="page-header">About Us</h1>
        <p>
          We are committed to connecting individuals with mental health and substance abuse resources in their local communities.
        </p>
      </section>

      <section className="section-card">
        <h2 className="page-header">Our Mission</h2>
        <p>
          Our mission is to break down barriers to mental health and substance abuse treatment by providing easy access to nearby facilities and resources.
        </p>
      </section>

      <section className="section-card">
        <h2 className="page-header">Team</h2>
        <div className="team-container">
          <TeamMember
            name="Shomari C. Smith"
            role="Founder"
            image="../../dist/assets/shomari.jpeg"
          />
          <TeamMember
            name="Alejandro Rojas"
            role="Founder"
            image="../../dist/assets/alejandro.jpeg"
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
