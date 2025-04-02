import React, { useEffect, useState, useRef } from "react";
import "./styles.css";

const Chat = () => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("User" + Math.floor(Math.random() * 1000));
  const [receiver, setReceiver] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080/ws");
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.sender !== username) {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setMessages((prev) => [
          ...prev,
          {
            ...data,
            time: timeString,
            type: "received"
          }
        ]);
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, [username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (socket && input) {
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newMessage = {
        sender: username,
        content: input,
        receiver,
        time: timeString,
        type: "sent"
      };

      socket.send(JSON.stringify({ sender: username, content: input, receiver }));
      setMessages((prev) => [...prev, newMessage]);
      setInput("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>Chat Application</h1>
      </header>

      <div className="user-settings">
        <input
          type="text"
          className="username-input"
          placeholder="Set username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="text"
          className="receiver-input"
          placeholder="Receiver (optional)"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
        />
      </div>

      <div className="chat-messages" id="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            <p><strong>{msg.sender}:</strong> {msg.content}</p>
            <span className="time">{msg.time}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          id="message-input"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button id="send-button" onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Chat;