import "../App.css"

export default function About() {
  return (
    <div className="section-container">
      <section>
        <h1 className="page-header">About Us</h1>
        <p>
          We are committed to connecting individuals with mental health and substance abuse resources in their local communities.
        </p>
      </section>

      <section>
        <h2 className="page-header">Our Mission</h2>
        <p>
          Our mission is to break down barriers to mental health and substance abuse treatment by providing easy access to nearby facilities and resources.
        </p>
      </section>

      <section>
        <h2 className="page-header">Team</h2>
        <div>
          Partner logo placeholders
          <div>
            <span>Partner Logo</span>
          </div>
          <div>
            <span>Partner Logo</span>
          </div>
        </div>
      </section>
    </div>
  );
}
