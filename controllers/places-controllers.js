const fs = require('fs');

const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../util/location');
const Place = require('../models/place');
const User = require('../models/user');

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError('Something went wrong, could not find a place.', 500);
    return next(error);
  }

  if (!place) {
    const error = new HttpError('Could not find a place for the provided id.', 404)
    return next(error);
  }
  // toObject => turn our place object into a normal JS object. 
  // getters => get rid of this underscore id from db (_id) 
  res.json({ place: place.toObject({ getters: true }) })
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  // filter and not find, because find match us the first place that it find, and want all the places of the same user
  // const places = DUMMY_PLACES.filter(p => {
  //   return p.creator === userId
  // })

  // let places
  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate('places');
  } catch (err) {
    const error = new HttpError('Fetching places failed, please try again later', 500);
    return next(error);
  }
  // if (!places || places.length === 0) {
  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    // next(error) => to farward it to next middleware in line, and since i have forward an error, it will reach the next error handling meddleware in line
    return next(
      new HttpError('Could not find places for the provided user id.', 404)
    );
  }
  // find return an array and we cannot use toObject with in array, therefore we use map
  res.json({
    places: userWithPlaces.places.map(place => place.toObject({ getters: true }))
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs passed, please check your data.', 422));
  }

  const { title, description, address } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    // This is a better approach of getting the ID instead of getting it as part of the request body
    creator:req.userData.userId
  })

  let user

  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError('Creating place failed, please try again.', 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError('Could not find user for the provided id.', 404);
    return next(error);
  }

  try {
    // transactions => allow us to perform multiple operations in isolation of each other, and to undo this,
    // and they built on sessions - we first have to start a session
    // sess => our current session that starts when we create new place
    const sess = await mongoose.startSession();
    // In our current session we want to start the transaction
    sess.startTransaction();
    // We tell mongoose waht we want to do here - we want to make sure that our created place should be saved in db,
    // and as argument, we have to provide the session and refer to our current session (sess)
    await createdPlace.save({ session: sess }); // createdPlace => create place id
    // we add the place id being created to our user
    // push => method of mongoose that establish the connection between the two models we are referring
    user.places.push(createdPlace);
    // We save our newly updated user with our current session that we are referring to
    await user.save({ session: sess });
    // Only once all this tasks are succesful, we commit the transaction
    // Side note - if we don't have exiting collection, we need to created it in the db
    await sess.commitTransaction();

  } catch (err) {
    const error = new HttpError('Creating place failed, please try again.', 500);
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }
  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError('Something went wrong, could not update place.', 500);
    return next(error);
  }
  // userData => the property that we added to the request object on the middleware
  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError('You are not allowed to edit this place.', 401);
    return next(error);
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError('Something went wrong, could not update place.', 500);
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid

  let place;
  try {
    // populate => allow us to refer to a document stored in another collection and to work with data
    // in that exiting document of that other collection
    place = await Place.findById(placeId).populate('creator');
  } catch (err) {
    const error = new HttpError('Something went wrong, could not delete place.', 500);
    return next(error);
  }

  if (!place) {
    const error = new HttpError('Could no find place for this id.', 404);
    return next(error);
  }
  // The ID geeter give us the id as a string
  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError('You are not allowed to delete this place.', 401);
    return next(error);
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place); // place = place id
    await place.creator.save({ session: sess });
    await sess.commitTransaction();

  } catch (err) {
    const error = new HttpError('Something went wrong, could not delete place.', 500)
    return next(error);
  }
  // Delete Image
  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.status(200).json({ message: 'Deleted place.' });
};

module.exports = {
  getPlaceById,
  getPlacesByUserId,
  createPlace,
  updatePlace,
  deletePlace
};