const express = require('express')
const { MongoClient } = require('mongodb');
require("dotenv").config()
const cors = require('cors')
const admin = require("firebase-admin");




const app = express()


const serviceAccount = require("./doctor-protal-sdk.json")

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(cors())
app.use(express.json())

const port = process.env.PROT || 5000

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qjvlr.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken(req, res, next) {

    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1]
        try {
            const decodeUser = await admin.auth().verifyIdToken(token)
            req.decodedEmail = decodeUser.email
        }
        finally {

        }
    }

    next()

}




async function run() {
    try {
        await client.connect()
        const database = client.db("doctors_protal")
        const appoinmentCollation = database.collection("appoinments")

        const useCollation = database.collection("users")


        // get api

        app.get("/appoinment", async (req, res) => {
            const email = req.query.email
            const date = new Date(req.query.date).toLocaleDateString()
            const quary = { email: email, date: date }

            const cursor = appoinmentCollation.find(quary)
            const appointmnet = await cursor.toArray()
            res.json(appointmnet)

        })
        // post api
        app.post("/appoinment", verifyToken, async (req, res) => {
            const appoinmnet = req.body;
            const result = await appoinmentCollation.insertOne(appoinmnet)
            res.json(result)
        })

        // user get 
        app.get("/users/:email", async (req, res) => {
            const email = req.params.email
            const quary = { email: email };
            const user = await useCollation.findOne(quary)
            let isAdmin = false
            if (user?.role === "admin") {
                isAdmin = true
            }
            res.json({ admin: isAdmin })

        })

        app.post("/users", async (req, res) => {
            const users = req.body
            const result = await useCollation.insertOne(users)
            res.json(result)
        })

        app.put("/users", async (req, res) => {
            const user = req.body;
            const filter = { email: user.email }
            const options = { upsert: true }
            const updateDoc = { $set: user }
            const result = await useCollation.updateOne(filter, updateDoc, options)
            res.json(result)

        })


        app.put("/user/admin", verifyToken, async (req, res) => {
            const user = req.body;

            const requster = req.decodedEmail
            if (requster) {
                const requsterAccount = await useCollation.findOne({ email: requster })
                if (requsterAccount.role === "admin") {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } }
                    const result = await useCollation.updateOne(filter, updateDoc)
                    res.json(result)
                }
            }
            else {
                res.status(403).json({ massage: 'you do not have make admin unauthorization person' })
            }

        })

    }
    finally {

    }
}
run().catch(console.dir)


app.get('/', (req, res) => {
    res.send('Doctors protal server is running')
})

app.listen(port, () => {
    console.log(`Example app listening at  ${port}`)
})