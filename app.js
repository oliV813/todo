const express = require('express')
const app = express()
const PORT = 3000
const {Pool} = require('pg')
const TelegramBot = require('node-telegram-bot-api')
require('dotenv').config()


// Datenbank verbindung
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
})

// Telegram Bot Token
const token = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(token, {polling: true})


// Funktion testen
const testConnection = async (chatID) => {
    try {
        const client = await pool.connect();
        console.log('Datenbankverbindung erfolgreich');
        bot.sendMessage(chatID, 'Datenbankverbindung erfolgreich')        
        // Einfache Abfrage zum Testen
        const result = await client.query('SELECT NOW()');
        console.log('Aktuelle Datenbankzeit:', result.rows[0].now);
        
        client.release();
      } catch (err) {
        console.error('Fehler bei der Datenbankverbindung:', err);
        bot.sendMessage(chatID, 'Fehler bei der Datenbankverbindung')
      }
}

// Neuen Eintrag in die Tabelle
const newEntry = async (todo, chatID) => {
    
    try {
        const query = 'INSERT INTO todos (todo) VALUES ($1) RETURNING *'
        const values = [todo]

        const result = await pool.query(query, values)
        console.log('Neuer Eintrag hinzugefugt', result.rows[0])
        bot.sendMessage(chatID, 'To-Do Liste aktualisiert')
    }

    catch (err) {
        console.log('Ein Fehler ist aufgetreten: ', err)
        bot.sendMessage(chatID, `Ein Fehler ist aufgetreten:${err}`)
    }


}

// Eintrag entfernen
const removeEntry = async (chatID, id) => {
    
    try {
        console.log(typeof(id))
        const check = await pool.query('SELECT * FROM todos WHERE id = $1', [id])
        console.log(check.rows.length)
        if(check.rows.length > 0) {
            console.log('Datensatz existiert')
            const result = await pool.query('DELETE FROM todos WHERE id = $1', [id])
            console.log("Datensatz wurde entfernt")
            bot.sendMessage(chatID, 'Datensatz wurde entfernt')
        }

        else {
            console.log('Datnesatz existiert nicht')
            bot.sendMessage(chatID, 'Kein Treffer mit der ID')
        }

        
    }


    catch (err) {
        console.log('Fehler aufgetreten: ', err)
        bot.sendMessage(chatID, `Ein Fehler ist aufgetreten:${err}`)
    }


} 

// alle eintragungen ansehen
const showEntry = async (chatID) => {
    
    try {
        const result = await pool.query('SELECT * FROM todos')
        console.log(result.rows)
        const data = result.rows.map(item => `${item.id}: ${item.todo}`).join('\n');
        bot.sendMessage(chatID, `ALLE TODOS:\n${data}`)
    }

    catch(err) {
        console.log('Fehler aufgetreten: ', err)
    }


}


// Bot nachrichten
bot.onText(/\/test/, (msg) => {
    const chatID = msg.chat.id
    testConnection(chatID)
})

bot.onText(/\/new (.+)/, (msg, match) => {
    const chatID = msg.chat.id
    newEntry(match[1], chatID)
})

bot.onText(/\/all/, (msg) => {
    const chatID = msg.chat.id
    showEntry(chatID)
})

bot.onText(/\/remove (\d+)/, (msg, match) => {
    const chatID = msg.chat.id
    const id = parseInt(match[1])
    console.log('id', id)
    if (Number.isInteger(id) && id > 0) {
        removeEntry(chatID, id)
    }
    else {
        bot.sendMessage(chatID, 'Muss eine Nummer sein')
    }
})

bot.onText(/\/help/, (msg) => {
    const chatID = msg.chat.id
    bot.sendMessage(chatID, `Alle Befehle:
/test: Verbindung testen
/all: Liste sehen
/new: Neuen Eintrag machen (cmd + name)
/remove Eintrag entfernen (cmd + id)
        `)
})

// Alle anderen
bot.on('message', (msg) => {
    const chatID = msg.chat.id
    console.log(msg)
    const befehle = ['/start', '/new', '/all', '/remove', '/test', '/help']
    if(!befehle.includes(msg.text)) {
        bot.sendMessage(chatID, 'Lass dir mit /help alle Befehle anzeigen')
    }

    
})


app.get('/', (req, res)=> {
   
    res.status(200).send('Hallo Node')
})




app.listen(PORT, ()=> {
    console.log('Server on port: ', PORT)
})