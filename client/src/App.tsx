import * as React from "react"
import { Route, Switch } from "wouter";
import Home from "../src/pages/About";
// import React, { useEffect, useState } from 'react';
import { Footer } from "./components/Footer";
import "react-toastify/dist/ReactToastify.css";
// import Profile from "./pages/Profile";
import Chat from "./pages/Chat";

import Search from "./pages/Facilities";

function App() {

  return (
      <div className="min-h-screen flex flex-col bg-[#fef3e6]">
        <p className="text-xl font-bold text-red-800 underline">
          Tailwind css stuff
        </p>
      <Switch>
        <div className="flex-grow">
        <Route path="/about" component={Home} />
        <Route path="/chat" component={Chat} />
        <Route path="/facilities" component={Search} />
        </div>
      </Switch>
      <Footer />
    </div>
);}

export default App;