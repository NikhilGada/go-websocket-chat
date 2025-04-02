package main

import (
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Client struct {
	conn *websocket.Conn
	name string
}

var clients = make(map[*Client]bool)
var broadcast = make(chan Message)
var mutex sync.Mutex
var db *gorm.DB

type Message struct {
	ID        uint      `gorm:"primaryKey"`
	Sender    string    `json:"sender"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
	Receiver  string    `json:"receiver,omitempty"`
}

func initDB() {
	dsn := "host=localhost user=postgres password=admin dbname=chatdb port=5432 sslmode=disable"
	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	db.AutoMigrate(&Message{})
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Error upgrading connection:", err)
		return
	}
	defer ws.Close()

	client := &Client{conn: ws}
	mutex.Lock()
	clients[client] = true
	mutex.Unlock()

	var messages []Message
	db.Order("timestamp asc").Find(&messages)
	for _, msg := range messages {
		_ = ws.WriteJSON(msg)
	}

	for {
		var msg Message
		if err := ws.ReadJSON(&msg); err != nil {
			log.Println("Client disconnected:", err)
			mutex.Lock()
			delete(clients, client)
			mutex.Unlock()
			break
		}
		msg.Timestamp = time.Now()
		db.Create(&msg)
		broadcast <- msg
	}
}

func handleMessages() {
	for {
		msg := <-broadcast
		mutex.Lock()
		for client := range clients {
			if msg.Receiver == "" || msg.Receiver == client.name || msg.Sender == client.name {
				_ = client.conn.WriteJSON(msg)
			}
		}
		mutex.Unlock()
	}
}

func main() {
	initDB()
	http.HandleFunc("/ws", handleConnections)
	go handleMessages()

	fmt.Println("Server started on port 8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
