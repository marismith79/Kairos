// import "./App.css";
import './index.css'
import axios from "axios";
import { useState, CSSProperties } from "react";
import { Route, Switch } from "wouter";
import About from "./pages/About";
import Chat from "./pages/Chat";
import { Header } from "./components/Header";
import { Body } from "./components/Home";

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
    <div>
      <Header />
      <Switch>
        <Route path="/about" component={About} />
        <Route path="/chat" component={Chat} />
        <Route path="/home" component={Body} />
      </Switch>
    </div>
  );
}

export default App;