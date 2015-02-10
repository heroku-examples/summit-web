// Modules

var http = require('http');
var path = require('path');

var logger = require('logfmt');
var jackrabbit = require('jackrabbit');
var express = require('express');

var parallel = require('./parallel');

// Config

var RABBIT_URL = process.env.CLOUDAMQP_URL || 'amqp://localhost';
var PORT = process.env.PORT || 5000;
var SERVICE_TIME = process.env.SERVICE_TIME || 500;

// Startup

http.globalAgent.maxSockets = Infinity;
logger.log({ type: 'info', message: 'starting' });

var broker = jackrabbit(RABBIT_URL, 1)
  .once('connected', onBroker)
  .once('disconnected', onBrokerLost);

var server = express()
  .set('view engine', 'jade')
  .set('view cache', true)
  .get('/', parallel([ getWeather, getMap, getHits, getKitten ], SERVICE_TIME), renderHome)
  .listen(PORT, onListen);

// Callbacks

function onBroker() {
  logger.log({ type: 'info', message: 'connected', service: 'broker' });
  broker.create('weather.get');
  broker.create('map.get');
  broker.create('hits.get');
  broker.create('kitten.get');
}

function onListen(err) {
  if (err) throw err;
  logger.log({ type: 'info', message: 'listening', port: PORT });
}

function onBrokerLost() {
  loggerl.log({ type: 'error', message: 'disconnected', service: 'broker' });
  process.exit();
}

function getWeather(req, res, next) {
  broker.publish('weather.get', { zip: req.query.zip }, function onWeather(err, weather) {
    res.locals.weather = weather;
    next();
  });
}

function getMap(req, res, next) {
  broker.publish('map.get', { zip: req.query.zip }, function onMap(err, map) {
    res.locals.map = map;
    next();
  });
}

function getHits(req, res, next) {
  broker.publish('hits.get', {}, function onHits(err, hits) {
    res.locals.hits = hits;
    next();
  });
}

function getKitten(req, res, next) {
  broker.publish('kitten.get', {}, function onKitten(err, kitten) {
    res.locals.kitten = kitten;
    next();
  });
}

function renderHome(req, res, next) {
  res.render(path.join(__dirname, 'home'));
}
