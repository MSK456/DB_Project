import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// limit for json 
app.use(express.json({
    limit: "16kb"
}))

// encoding incoming data from urls properly
app.use(express.urlencoded({
    extended: true,  // allows nested objects
    limit: "16kb"
}))

app.use(express.static("public")) // stores public assets into a public folder

app.use(cookieParser()) 

export { app }