const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express()
const ObjecId = require('mongodb').ObjectId
require('dotenv').config()
// const port = 4000
const PORT = process.env.PORT;
const { MongoClient, ServerApiVersion } = require('mongodb');

//express file upload start
const fileUpload = require('express-fileupload');
app.use(express.static('doctors'))
app.use(express.static('users'))
app.use(fileUpload());
//express file upload end

app.use(express.static('users'))

app.use(cors());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', (req, res) => {
    res.send('Hello World!')
})

//firebase auth token

const admin = require("firebase-admin");

const serviceAccount = require("./doctor-portal-1fa1a-firebase-adminsdk-ag50f-0316dee581.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mbjz2.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


client.connect(err => {
    const appointmentsCollection = client.db("DoctorPortal").collection("appointments");
    const doctorsCollection = client.db("DoctorPortal").collection("doctors");
    const accessCollection = client.db("DoctorPortal").collection("access");
    const ProfileCollection = client.db("DoctorPortal").collection("profile");
    // add appointment
    app.post('/addAppointments', (req, res) => {
        const appointment = req.body;
        appointmentsCollection.insertOne(appointment)
            .then(result => {
                res.send(result.insertCount > 0)

            })
    });

    // using date find appointments
    app.post('/appointmentsByDate', (req, res) => {
        const date = req.body;
        const email = req.body.email

        // idToken comes from the client app

        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            // idToken comes from the client app
            admin.auth()
                .verifyIdToken(idToken)
                .then((decodedToken) => {
                    // const uid = decodedToken.uid;
                    // console.log(uid);
                    // ...
                    doctorsCollection.find({ email: email }) //find doctor or user admin api
                        .toArray((arr, doctor) => {
                            const filter = { date: date.date }
                            if (doctor.length == 0) {
                                filter.email = email
                            }
                            appointmentsCollection.find(filter)
                                .toArray((arr, document) => {
                                    res.send(document);
                                })
                        })

                    //.....
                })
                .catch((error) => {
                    res.status(404).send("un-athorized access")
                });
        }

        else {
            res.status(404).send("un-athorized access")
        }
    });

    // all appointments data load .....

    app.get('/appointments', (req, res) => {
        const search = req.query.search
        appointmentsCollection.find({ name: { $regex: search } })
            .toArray((arr, document) => {
                res.send(document)
            })
    })

    // single parson user appointments 
    app.get('/userAppointments', (req, res) => {
        const bearer = req.headers.authorization
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1]
            // idToken comes from the client app

            admin.auth()
                .verifyIdToken(idToken)
                .then((decodedToken) => {

                    appointmentsCollection.find({ email: req.query.email })
                        .toArray((err, document) => {
                            res.send(document)
                        })


                })
                .catch((error) => {
                    res.status(404).send('un-autorized access ')
                });
        }


    })

    app.get('/appointmentsdash', (req, res) => {

        appointmentsCollection.find({})
            .toArray((arr, document) => {
                res.send(document)
            })
    })


    // file upload api

    app.post('/addDoctor', (req, res) => {
        const file = req.files.file
        const name = req.body.name;
        const email = req.body.email;
        const phone = req.body.phone
        file.mv(`${__dirname}/doctors/${file.name}`, err => {
            if (err) {
                console.log(err)
                return res.status(500).send({ msg: 'Faild to upload image' });
            }

            doctorsCollection.insertOne({ name, email, phone, img: file.name })
                .then(result => {
                    res.send(result.insertCount > 0)
                })

            // return res.send({ name: file.name, path: `/${file.name}` })
        }) //mv = move // err method optional
    })

    // doctor load data...
    app.get('/doctors', (req, res) => {
        doctorsCollection.find({})
            .toArray((arr, document) => {
                res.send(document)
            })
    });

    //doctor delete ...
    app.delete('/deleteDoctor/:id', (req, res) => {
        doctorsCollection.deleteOne({ _id: ObjecId(req.params.id) })
            .then(result => {
                res.send(result.deletedCount > 0)
            })
    })

    //appointment delete

    app.delete('/deleteAppointment/:id', (req, res) => {

        appointmentsCollection.deleteOne({ _id: ObjecId(req.params.id) })
            .then(result => {
                res.send(result.deletedCount > 0)
            })
    })


    // single doctor load with update api
    app.get('/singleDoctor/:id', (req, res) => {
        doctorsCollection.find({ _id: ObjecId(req.params.id) })
            .toArray((err, document) => {
                res.send(document[0]) // all array only 0 no index load with object
            })
    })

    // information update api
    app.patch('/update/:id', (req, res) => {
        doctorsCollection.updateOne({ _id: ObjecId(req.params.id) },
            {
                $set: { name: req.body.name, email: req.body.email, phone: req.body.phone }
            }
        )
            .then(result => {
                res.send(result.modifiedCount > 0)
            })
    })

    // add admin api

    app.post('/addAdmin', (req, res) => {
        const admin = req.body
        accessCollection.insertOne(admin)
            .then(result => {
                res.send(result.insertCount > 0)
                console.log("admin create successful");
            })
    })

    // load admin

    app.get('/adminList', (req, res) => {
        accessCollection.find({})
            .toArray((arr, document) => {
                res.send(document)
            })
    })

    // is doctor than componets show
    app.post('/isDoctor', (req, res) => {
        const email = req.body.email;
        doctorsCollection.find({ email: email })
            .toArray((arr, doctor) => {
                res.send(doctor.length > 0)
            })
    })

    // access role 

    app.post('/isAdmin', (req, res) => {
        const email = req.body.email;
        accessCollection.find({ email: email })
            .toArray((err, admin) => {
                res.send(admin.length > 0)
            })
    })

    // profile collection 

    app.post('/profile', (req, res) => {
        const file = req.files.file
        const name = req.body.name;
        const birth = req.body.birth;
        const blood = req.body.blood;
        const email = req.body.email;
        const HomeAddress = req.body.HomeAddress
        // console.log(file, name, birth, email, HomeAddress, blood);
        file.mv(`${__dirname}/users/${file.name}`, err => {
            if (err) {
                console.log(err)
                return res.status(500).send({ massage: 'Failed to upload image' })
            }
        })
        ProfileCollection.insertOne({ img: file.name, name, birth, blood, email, HomeAddress })
            .then(result => {
                res.send(result.insertCount > 0)
            })
    })

    //load profile information
    app.get('/profileInfo', (req, res) => {
        ProfileCollection.find({ email: req.query.email })
            .toArray((err, document) => {
                res.send(document[0])
            })
    })
});


app.listen(PORT, () => {
    console.log(`app listening on port ${PORT}`)
})