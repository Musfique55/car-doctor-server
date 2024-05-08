const express = require('express');
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 5000;
const cors = require('cors');


app.use(cors({
    origin : ['https://car-doctor-a8124.web.app'],
    credentials : true
}));
app.use(express.json());
app.use(cookieParser());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lzevybe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const cookieOptions = {
    httpOnly : true,
    secure : true,
    sameSite : 'none'
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const serviceCollection = client.db('servicesDB').collection('services');
    const orderCollection = client.db('servicesDB').collection('orders');
    
    // jwt api
    app.post('/jwt', (req,res) => {
        const user = req.body;
        const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET, {expiresIn : '1h'})
        res.cookie('token',token,cookieOptions).send({message : true})
    })

    // middleware
    const verifyToken = (req,res,next) => {
        const token = req.cookies.token;
        if(!token){
            return res.status(401).send('unauthorized');
        }
        jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded) => {
            if(err){
                return res.status(401).send('unauthorized');
            }
            req.user = decoded;
            next();
        })
    }
    // logout api
    app.post('/logout',(req,res) => {
        res.clearCookie('token',{...cookieOptions, maxAge : 0}).send({session : 'Logout'})
    })
    
    // service api
    app.get('/services', async(req,res) => {
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.get('/services/:id', async(req,res) => {
        const id = req.params.id;
        const query = {_id : new ObjectId(id)}
        const result = await serviceCollection.findOne(query);
        res.send(result);
    })

    app.get('/service/:id', async(req,res) => {
        const id = req.params.id;
        const query = {service_id: id};
        const options = {
            // Include only the `title` and `imdb` fields in the returned document
            projection: { title: 1, price: 1, img : 1},
          };
        const result = await serviceCollection.findOne(query,options);
        res.send(result);
    })

    app.post('/orders', async(req,res) => {
        const orders = req.body;
        const result = await orderCollection.insertOne(orders);
        res.send(result);
    })

    app.patch('/orders/:id', async (req,res) => {
        const id = req.params.id;
        const update = req.body;
        const filter = {_id : new ObjectId(id)};
        const updateDoc = {
            $set: {
              status: update.status
            },
          };
        const result = await orderCollection.updateOne(filter,updateDoc);
        res.send(result);
    })
    app.get('/orders',verifyToken, async(req,res) => {
        if(req.query.email !== req.user.email){
            return res.status(403).send('forbidden');
        }
        let query = {};
        if(req.query?.email){
            query = {email : req.query.email}
        }

        const cursor = orderCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    })
    app.delete('/orders/:id', async(req,res) => {
        const id = req.params.id;
        const query = {_id : new ObjectId(id)};
        const result = await orderCollection.deleteOne(query);
        res.send(result);
    })
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res) => {
    res.send('doctor is running');
})

app.listen(port,() => {
    console.log(`port is running on ${port}`);
})