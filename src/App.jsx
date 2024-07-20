import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
} from "react-router-dom";
import { Login } from "./Layout/Login";
import { ChatPage2 } from "./Layout/ChatPage2";

function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/">
          {localStorage.getItem("chat-username") ? <Redirect to="/chat" /> : <Redirect to="/login" />}
        </Route>
        <Route path="/login">
          <Login />
        </Route>
        <Route path="/chat">
          {localStorage.getItem("chat-username") ? <ChatPage2 /> : <Redirect to="/login" />}
        </Route>
      </Switch>
    </Router>
  );
}

export default App;

