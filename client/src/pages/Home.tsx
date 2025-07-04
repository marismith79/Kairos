import "../App.css";
import logo from "../utils/logo.png"; 
import About from "./About";

export function Body() {
    return (
    <div>
    <section className="section-container"> 
      <img src={logo} alt="Kairos" className="App-logo" onLoad={(e) => {
        const img = e.target as HTMLImageElement;
      }}/>
    <h1 className="App-header">We build emotion sensitive Voice AI<br />to support crisis care hotlines</h1>
        <About />
    </section>
    </div>
    );
  }