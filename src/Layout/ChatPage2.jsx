import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import SockJS from "sockjs-client";
import Stomp from "stompjs";
import { over } from "stompjs";
var stompClient = null;

export const ChatPage2 = () => {
  const history = useHistory();
  const [username, setUsername] = useState(localStorage.getItem("chat-username"));
  const [receiver, setReceiver] = useState("");
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState("");
  const [tab, setTab] = useState("CHATROOM");
  const [publicChats, setPublicChats] = useState([]);
  const [privateChats, setPrivateChats] = useState(new Map());

  useEffect(() => {
    // Redirect to login page if username is not set
    if (!username || username.trim().length === 0) {
      history.push("/login");
    } else {
      connect();
    }
  }, [username, history]);

  const onMessageReceived = (payload) => {
    const payloadData = JSON.parse(payload.body);
    console.log(payloadData);
    switch (payloadData.status) {
      case "JOIN":
        if (payloadData.senderName !== username) {
          if (!privateChats.get(payloadData.senderName)) {
            privateChats.set(payloadData.senderName, []);
            setPrivateChats(new Map(privateChats));
          }
        }
        break;
      case "LEAVE":
        if (payloadData.senderName !== username) {
          if (privateChats.get(payloadData.senderName)) {
            privateChats.delete(payloadData.senderName);
            setPrivateChats(new Map(privateChats));
          }
        }
        break;
      case "MESSAGE":
        publicChats.push(payloadData);
        setPublicChats((prev) => [...prev, payloadData]);
    }
  };

  const onPrivateMessage = (payload) => {
    console.log(payload);
    var payloadData = JSON.parse(payload.body);
    if (privateChats.has(payloadData.senderName)) {
      const chatMessages = privateChats.get(payloadData.senderName);
      chatMessages.push(payloadData);
      privateChats.set(payloadData.senderName, chatMessages);
      setPrivateChats(new Map(privateChats));
    } else {
      let list = [];
      list.push(payloadData);
      privateChats.set(payloadData.senderName, list);
      setPrivateChats(new Map(privateChats));
    }
  };

  const onConnect = () => {
    console.log("Connected");
    stompClient.subscribe("/chatroom/public", onMessageReceived);
    stompClient.subscribe(`/user/${username}/private`, onPrivateMessage);
    userJoin();
  };
  
  const onError = (err) => {
    console.log("err=>", err);
  };

  const handleLogout = () => {
    userLeft();
    localStorage.removeItem("chat-username");
    setUsername(""); // Update username state to trigger redirect
    history.push("/login");
  };

  const userJoin = () => {
    let chatMessage = {
      senderName: username,
      status: "JOIN",
    };

    stompClient.send("/app/message", {}, JSON.stringify(chatMessage));
  };

  const userLeft = () => {
    let chatMessage = {
      senderName: username,
      status: "LEAVE",
    };

    stompClient.send("/app/message", {}, JSON.stringify(chatMessage));
  };

  const connect = () => {
    let sock = new SockJS("https://chatroom-backend-lsne.onrender.com/ws");
    stompClient = over(sock);
    stompClient.connect({}, onConnect, onError);
  };

  // File handler method
  async function base64ConversionForImages(e) {
    if (e.target.files[0]) {
      getBase64(e.target.files[0]);
    }
  }

  function getBase64(file) {
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function () {
      setMedia(reader.result);
    };
    reader.onerror = function (error) {
      console.log("Error", error);
    };
  }

  // Send chatroom message
  const sendMessage = () => {
    if (message.trim().length > 0 || media != null) {
      stompClient.send(
        "/app/message",
        {},
        JSON.stringify({
          senderName: username,
          status: "MESSAGE",
          media: media,
          message: message,
        })
      );
      setMessage("");
      setMedia("");
    }
  };

  // Send private message
  const sendPrivate = () => {
    if (message.trim().length > 0) {
      if (stompClient) {
        let chatMessage = {
          senderName: username,
          receiverName: tab,
          message: message,
          media: media,
          status: "MESSAGE",
        };

        privateChats.get(tab).push(chatMessage);
        setPrivateChats(new Map(privateChats));

        stompClient.send(
          "/app/private-message",
          {},
          JSON.stringify(chatMessage)
        );
        setMessage("");
        setMedia("");
      }
    }
  };

  const tabReceiverSet = (name) => {
    setReceiver(name);
    setTab(name);
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center "
      style={{
        height: "100vh",
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url("https://cdn.pixabay.com/photo/2018/06/29/22/45/wheat-3506758_640.jpg")`,
        backgroundRepeat: "none",
        backgroundSize: "cover",
      }}
    >
      <div className="container d-flex p-0">
        {/*Member List */}
        <div
          className="chat-tab p-3"
          style={{
            width: "200px",
            height: "551px",
            backgroundColor: "transparent",
          }}
        >
          <ul className="list-group">
            <li
              key={"o"}
              className={`list-group-item ${
                tab === "CHATROOM" && "bg-primary text-light"
              }`}
              onClick={() => setTab("CHATROOM")}
            >
              <span className="">Chat Room</span>
            </li>
            {[...privateChats.keys()].map((name, index) => {
              return (
                <li
                  key={index}
                  onClick={() => tabReceiverSet(name)}
                  className={`list-group-item ${
                    tab === name && "bg-primary text-light"
                  }`}
                >
                  <span className="fs-5">{name}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="d-flex flex-column" style={{ flexGrow: 1 }}>
          {/*Chat box */}
          <div
            className="chat-messages p-3"
            style={{
              height: "500px",
              flexGrow: 1,
              backgroundColor: "#d3d3c5",
              overflowY: "scroll",
              padding: "2px",
              border: "1px solid green",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {tab === "CHATROOM"
              ? publicChats.map((message, index) => {
                  if (message.senderName !== username) {
                    return (
                      <div className="d-flex justify-content-start" key={index}>
                        <div
                          className=" d-flex p-2 "
                          style={{
                            borderTopRightRadius: "5px",
                            borderBottomRightRadius: "5px",
                            borderTopLeftRadius: "5px",
                            backgroundColor: "white",
                          }}
                        >
                          <div className=" rounded-3 px-2 me-2 align-self-start">
                            <div className="bg-warning">
                              {message.senderName}
                            </div>
                            <div>
                              <div>{message.message}</div>
                              <div>
                                {message.media
                                  .split(";")[0]
                                  .split("/")[0]
                                  .split(":")[1] === "image" && (
                                  <img
                                    src={message.media}
                                    alt=""
                                    width={"250px"}
                                  />
                                )}
                              </div>{" "}
                              <div>
                                {message.media
                                  .split(";")[0]
                                  .split("/")[0]
                                  .split(":")[1] === "video" && (
                                  <video width="320" height="240" controls>
                                    <source
                                      src={message.media}
                                      type="video/mp4"
                                    />
                                  </video>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="d-flex justify-content-end " key={index}>
                        <div
                          className=" bg-primary p-2"
                          style={{
                            borderTopRightRadius: "5px",
                            borderBottomLeftRadius: "5px",
                            borderTopLeftRadius: "5px",
                            color: "white",
                          }}
                        >
                          <div className="rounded-3 px-2 me-2 align-self-end">
                            <div className="bg-success">{message.senderName}</div>
                            <div>
                              <div>{message.message}</div>
                              <div>
                                {message.media
                                  .split(";")[0]
                                  .split("/")[0]
                                  .split(":")[1] === "image" && (
                                  <img
                                    src={message.media}
                                    alt=""
                                    width={"250px"}
                                  />
                                )}
                              </div>
                              <div>
                                {message.media
                                  .split(";")[0]
                                  .split("/")[0]
                                  .split(":")[1] === "video" && (
                                  <video width="320" height="240" controls>
                                    <source
                                      src={message.media}
                                      type="video/mp4"
                                    />
                                  </video>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })
              : privateChats.get(tab)?.map((message, index) => {
                  if (message.senderName !== username) {
                    return (
                      <div className="d-flex justify-content-start" key={index}>
                        <div
                          className=" d-flex p-2 "
                          style={{
                            borderTopRightRadius: "5px",
                            borderBottomRightRadius: "5px",
                            borderTopLeftRadius: "5px",
                            backgroundColor: "white",
                          }}
                        >
                          <div className=" rounded-3 px-2 me-2 align-self-start">
                            <div className="bg-warning">
                              {message.senderName}
                            </div>
                            <div>
                              <div>{message.message}</div>
                              <div>
                                {message.media
                                  .split(";")[0]
                                  .split("/")[0]
                                  .split(":")[1] === "image" && (
                                  <img
                                    src={message.media}
                                    alt=""
                                    width={"250px"}
                                  />
                                )}
                              </div>
                              <div>
                                {message.media
                                  .split(";")[0]
                                  .split("/")[0]
                                  .split(":")[1] === "video" && (
                                  <video width="320" height="240" controls>
                                    <source
                                      src={message.media}
                                      type="video/mp4"
                                    />
                                  </video>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="d-flex justify-content-end " key={index}>
                        <div
                          className=" bg-primary p-2"
                          style={{
                            borderTopRightRadius: "5px",
                            borderBottomLeftRadius: "5px",
                            borderTopLeftRadius: "5px",
                            color: "white",
                          }}
                        >
                          <div className="rounded-3 px-2 me-2 align-self-end">
                            <div className="bg-success">{message.senderName}</div>
                            <div>
                              <div>{message.message}</div>
                              <div>
                                {message.media
                                  .split(";")[0]
                                  .split("/")[0]
                                  .split(":")[1] === "image" && (
                                  <img
                                    src={message.media}
                                    alt=""
                                    width={"250px"}
                                  />
                                )}
                              </div>
                              <div>
                                {message.media
                                  .split(";")[0]
                                  .split("/")[0]
                                  .split(":")[1] === "video" && (
                                  <video width="320" height="240" controls>
                                    <source
                                      src={message.media}
                                      type="video/mp4"
                                    />
                                  </video>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
          </div>

          <div className="d-flex">
            <input
              type="file"
              onChange={base64ConversionForImages}
              style={{ width: "150px" }}
            />
            <input
              className="form-control"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ width: "85%" }}
            />
            <button className="btn btn-success ms-2" onClick={sendMessage}>
              Send
            </button>
            <button className="btn btn-primary ms-2" onClick={sendPrivate}>
              Send Private
            </button>
            <button className="btn btn-danger ms-2" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
