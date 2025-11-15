const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.f8ar27k.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();

        const db = client.db("showcaseDB");
        const addsCollection = db.collection("adds");
        const favoritesCollection = db.collection("favorites");


        // add card
        app.post('/add-artwork', async (req, res) => {
            const artwork = req.body;
            const result = await addsCollection.insertOne(artwork);
            res.send(result);
        });

        // Get all cards (with search + category)
        app.get('/artworks', async (req, res) => {
            const search = req.query.search || '';
            const category = req.query.category || ''; // ✅ added category query
            const query = {
                visibility: "Public",
                $and: [
                    {
                        $or: [
                            { title: { $regex: search, $options: 'i' } },
                            { userName: { $regex: search, $options: 'i' } }
                        ]
                    },
                    ...(category ? [{ category: category }] : []) // ✅ only filter by category if provided
                ]
            };

            const artworks = await addsCollection.find(query).toArray();
            res.send(artworks);
        });


        // ✅ Get single artwork by ID
        app.get('/artworks/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const artwork = await addsCollection.findOne(query);
            res.send(artwork);
        });

        // ✅ Like button → increase like count
        app.patch('/artworks/:id/like', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const update = { $inc: { likes: 1 } };
            const result = await addsCollection.updateOne(query, update);
            res.send(result);
        });

        // ✅ Add to favorites (store in a "favorites" collection)
        app.post('/favorites', async (req, res) => {
            const favorite = req.body; // { userEmail, artworkId }
            const result = await favoritesCollection.insertOne(favorite);
            res.send(result);
        });

        // ✅ Get artist total artworks (optional)
        app.get('/artist/:email/artworks', async (req, res) => {
            const email = req.params.email;
            const count = await addsCollection.countDocuments({ userEmail: email });
            res.send({ totalArtworks: count });
        });

        // ✅ Get artworks by logged-in user
        app.get('/my-artworks', async (req, res) => {
            const email = req.query.email;
            const query = { userEmail: email };
            const artworks = await addsCollection.find(query).toArray();
            res.send(artworks);
        });

        // ✅ Delete artwork by ID
        app.delete('/artworks/:id', async (req, res) => {
            const id = req.params.id;
            const result = await addsCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        // ✅ Update artwork by ID
        app.put('/artworks/:id', async (req, res) => {
            const id = req.params.id;
            const updateData = req.body;
            const updateDoc = {
                $set: {
                    ...updateData,
                    updatedAt: new Date(),
                },
            };
            const result = await addsCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);
            res.send(result);
        });

        // ✅ Get all favorite artworks for a specific user
        app.get('/favorites', async (req, res) => {
            const email = req.query.email;
            const favorites = await favoritesCollection.find({ userEmail: email }).toArray();

            // Join favorite with artwork details
            const artworkIds = favorites.map(f => new ObjectId(f.artworkId));
            const artworks = await addsCollection.find({ _id: { $in: artworkIds } }).toArray();

            // Combine data
            const combined = favorites.map(fav => ({
                ...fav,
                artwork: artworks.find(a => a._id.toString() === fav.artworkId) || {},
            }));

            res.send(combined);
        });

        // ✅ Remove favorite by ID
        app.delete('/favorites/:id', async (req, res) => {
            const id = req.params.id;
            const result = await favoritesCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });




        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

// Sample route
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
