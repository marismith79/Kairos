import './index.css'
import axios from "axios";
import { useState } from "react";
import { Route, Switch } from "wouter";
import About from "./pages/About";
import Chat from "./pages/Chat";
import SentiChat from './pages/SentiChat';
import { Header } from "./components/Header";
import { Body } from "./pages/Home";

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
        <Route path="/sentichat" component={SentiChat} />
        <Route path="/" component={Body} />
      </Switch>
    </div>
  );
}

export default App;