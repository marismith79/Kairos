import "../App.css";
import logo from "../logo.png"; 
import About from "../pages/About";

export function Body() {
    return (
    <div>
      <h1>
        <img src={logo} alt="Kairos" style={{padding: 0, margin: 0, height: "100px", width: "100px"}}/>
      </h1>
      <About />
    </div>
    );
  }
  