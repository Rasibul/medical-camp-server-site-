const express = require('express')
const app = express()
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000

// middleware

app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xmelfag.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db("medicalDB").collection("users")
    const medicalCampCollection = client.db("medicalDB").collection("meicalCamp")
    const reviewCollection = client.db("medicalDB").collection("review")
    const registerCollection = client.db("medicalDB").collection("reigster")



    // jwt related api

    app.post('/api/v1/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACESS_SECRET_TOKEN, {
        expiresIn: '1h'
      })
      res.send({ token })
    })

    // middlware

    const verifyToken = (req, res, next) => {
      // console.log("inside token", req.headers.authorization)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACESS_SECRET_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded
        next()
      })
    }

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const isOrganizer = user?.role === 'organizer'
      if (!isOrganizer) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }

    app.get('/api/v1/all-camp', async (req, res) => {
      const result = await medicalCampCollection.find().toArray()
      res.send(result)
    })

    app.get('/api/v1/all-camp/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await medicalCampCollection.findOne(query)
      res.send(result)
    })

    app.post('/api/v1/all-camp', async (req, res) => {
      try {
        const item = req.body;
        console.log(item);
        const result = await medicalCampCollection.insertOne(item);
        res.send({ insertedId: result.insertedId });
      } catch (error) {
        console.error('Error adding camp:', error);
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });

    app.delete('/api/v1/all-camp/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await medicalCampCollection.deleteOne(query)
      res.send(result)
  })

  

    app.get('/api/v1/review', async (req, res) => {
      const result = await reviewCollection.find().toArray()
      res.send(result)
    })

    app.get('/api/v1/users', async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.post('/api/v1/users', async (req, res) => {
      const user = req.body
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user alredy axist', insertedId: null })
      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    })


    app.get('/api/v1/users/organizer/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query)
      let organizer = false
      if (user) {
        organizer = user?.role === 'organizer'
      }
      res.send({ organizer })
    })


    app.patch('/api/v1/users/organizer/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'organizer'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    app.get('/api/v1/register', async (req, res) => {
      const result = await registerCollection.find().toArray()
      res.send(result)
    })

    app.post('/api/v1/register', async (req, res) => {
      const item = req.body
      const result = await registerCollection.insertOne(item)
      res.send(result)
    })



    app.delete('/api/v1/register/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await registerCollection.deleteOne(query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('medical camp is running')

})
app.listen(port, () => {
  console.log(`camp is running${port}`)
})