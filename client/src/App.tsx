import "./App.css";
import axios from "axios";
import { useState } from "react";
import { Route, Switch } from "wouter";
import About from "./pages/About";
import Chat from "./pages/Chat";
import { Footer } from "./components/Footer";

function App() {
  const [data, setData] = useState();
  const urlWithProxy = "/api/v1";

  function getDataFromServer() {
    axios
      .get(urlWithProxy)
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error(err);
      });
  }

  return (
    // <div className="App">
    <div className="min-h-screen flex flex-col bg-[#fef3e6] ff0000">
      <Switch>
        <div className="flex-grow">
        <Route path="/about" component={About} />
        <Route path="/chat" component={Chat} />
        </div>
      </Switch>
      <Footer />
    </div>
  );
}

export default App;