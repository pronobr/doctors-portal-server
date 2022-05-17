const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt  = require('jsonwebtoken')
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@clusterdoctor.cl4y4.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
console.log(uri)
async function run(){
try{
await client.connect();
const serviceCollection =client.db('doctor-portal').collection('services')
const BookingCollection =client.db('doctor-portal').collection('bookings')
const userCollection =client.db('doctor-portal').collection('user')
function verifyJWT(req,res,next){
  const auth =req.headers.authorization
  if(!auth){
    return res.status(401).send({message:"authorization"})
  }
  const token = auth.split(" ")[1];
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRECT,function(err,decoded){
    if(err){
      return res.status(403).send({message:"Forbidden access"})
    }
    req.decoded =decoded
    next()
  })
}
app.get("/service", async (req,res) =>{
    const query = {};
    const cursor = serviceCollection.find(query);
    const services = await cursor.toArray();
    res.send(services);
})
app.put('/user/:email', async(req,res) =>{
  const email =req.params.email;
  const user =req.body
  const filter ={email:email};
  const options ={upsert: true}
  const updateDoc = {
    $set: user,
  };
  const result = await userCollection.updateOne(filter, updateDoc, options);
  res.send({result,token})
})
app.get('/admin/:email', async(req, res) =>{
  const email = req.params.email;
  const user = await userCollection.findOne({email: email});
  const isAdmin = user.role === 'admin';
  res.send({admin: isAdmin})
})

app.put('/user/admin/:email', async(req,res) =>{
  const email =req.params.email;
  const requester =req.decoded.email;
  const reqAecount =await userCollection.findOne({email:requester})
  if(reqAecount){
    const filter ={email:email};
  const updateDoc = {
    $set: {role:'admin'},
  };
  const result = await userCollection.updateOne(filter, updateDoc);
  const token =jwt.sign({email:email},process.env.ACCESS_TOKEN_SECRECT,{expiresIn:'1h'})
  res.send({result,token})
  }
  else{
    res.send(403).send({message:'Unauthrazion'})
  }
  
})
app.get('/booking',verifyJWT, async(req,res) =>{
  const patient =req.query.patient;
  const decoded =req.decoded.email;
  if(decoded ===patient){
    const auth =req.headers.authorization
    console.log(auth)
    const query ={patient: patient}
    console.log(query)
    const bookings =await BookingCollection.find(query).toArray();
    res.send(bookings)
  }else{
    res.status(401).send({message:"Unauthrization"})
  }

})
app.post('/booking',async(req,res) =>{
  const booking =req.body;
  const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
  // const exits =BookingCollection.findOne(query)
  const exists = await BookingCollection.findOne(query);
  if (exists) {
    return res.send({ success: false, booking: exists })
  }
  const result = await BookingCollection.insertOne(booking);
  return res.send({ success: true, result });


})
app.get('/user', async(req,res) =>{
  const query = {};
    const cursor = userCollection.find(query);
    const users = await cursor.toArray();
    res.send(users);
})

// app.get('/available',async(req,res) =>{
//   const date = req.query.date;
//   const services =await serviceCollection.find().toArray()

//   const query ={date:date}

//   const bookings =await BookingCollection.findOne(query).toArray();
//       // step 3: for each service
//       services.forEach(service => {
//         // step 4: find bookings for that service. output: [{}, {}, {}, {}]
//         const serviceBookings = bookings.filter(book => book.treatment === service.name);
//         // step 5: select slots for the service Bookings: ['', '', '', '']
//         const bookedSlots = serviceBookings.map(book => book.slot);
//         // step 6: select those slots that are not in bookedSlots
//         const available = service.slots.filter(slot => !bookedSlots.includes(slot));
//         //step 7: set available to slots to make it easier 
//         service.slots = available;
//       });
//       console.log(bookings)
//   res.send(bookings)
// })



}
finally{

}
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello From Doctor Uncle!')
  })
  
  app.listen(port, () => {
    console.log(`Doctors App listening on port ${port}`)
  })