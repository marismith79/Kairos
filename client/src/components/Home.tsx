import "../App.css";
import logo from "../logo.png"; 
import About from "../pages/About";

export function Body() {
    return (
    <div>
      <section className="section-container"> 
        <img src={logo} alt="Kairos" className="App-logo"/>
        <h1 className="App-header">We build emotional voice AI</h1>
        <h2 className="App-header">to support crisis care hotlines</h2>
          <About />
      </section>
    </div>
    );
  }