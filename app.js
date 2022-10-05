const fs = require('fs');
const path = require('path');

const express = require('express');
const mongoose = require('mongoose');

const HttpError = require('./models/http-error');
const placesRoutes = require('./routes/places-routes');
const usersRoutes = require('./routes/users-routes');

const app = express();

// parse any incoming request body and extract any JSON is in there and convert it to regular JS data structures like ojbects/arrys and then call next automatically so that we reached the next middleware in line
app.use(express.json());

// app.use('/uploads/images') => general middleware that filter for requests that start with upload/images
// express.static(path.join('uploads', 'images')) => middleware which returns the requested file with a new path
// pointing at the uploads images folder 
app.use('/uploads/images', express.static(path.join('uploads', 'images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');

  next();
});

app.use('/api/places', placesRoutes);
app.use('/api/users', usersRoutes);

app.use((req, res, next) => {
  const error = new HttpError('Could not find this route.', 404)
  throw error
});

app.use((error, req, res, next) => {
  if (req.file) {
    // Delete image if we have an error
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  // We check if a response has already been sent
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || 'An unknown error occured!' });
});

mongoose
  .connect(
    // process => global process variable which is always available, and it has env key that give us access to the 
    // enviroment variables that are injected into the running node.js process
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.6icxazm.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
    )
  .then(() => {
    app.listen(process.env.PORT || 5000);
  })
  .catch(err => {
    console.log(err);
  });
