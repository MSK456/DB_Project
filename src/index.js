//require('dotenv').config({path: "/.env"}) 

import dotenv from "dotenv"
import ConnectDB from "./db/index.js";
import { app } from "./app.js";


dotenv.config({
    path: "./.env"
})

ConnectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(` Server is running at port: ${process.env.PORT}`);
    })
})
.catch((error) => {
    console.log("MONGO DB connection FAILED !!!", error);
})


/* 
    Connection within the main js file. (unprofessional approach)
( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", ()=>{
            console.log("ERROR: ", error);
            throw error
        })
        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.error("ERROR: ", error)
        throw err
    }
})()
    */