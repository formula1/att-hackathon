var { inspect, promisify } = require("util");
var fs = require("fs");
var http = require("http");
var https = require("https");
var FormData = require("form-data");
var concatStream = require("concat-stream");


var videoToTags = require("./video-to-tags");
var audioToKeywords = require("./audio-to-keywords");

var { HTTP_PORT, INPUT_DIRECTORY, } = process.env;

if(!fs.existsSync(INPUT_DIRECTORY)) fs.mkdirSync(INPUT_DIRECTORY);

var express = require("express");
var { Router } = express;
var multer = require("multer");

var router = new Router();

router.post("/extract-meta-data", multer({
  dest: INPUT_DIRECTORY
}).single("file"), function(req, res, next){
  console.log(req.file);
  if(!req.file) return next("no files");

  Promise.all([
    videoToTags(req.file.path),
    audioToKeywords(req.file.path),
  ]).then(function([videoMeta, audioMeta]){
    res.status(200).send({ videoMeta, audioMeta });
  }).catch(next);
});

router.post("/build-models-for-movies", multer({
  dest: INPUT_DIRECTORY
}).single("file"), function(req, res, next){
  console.log(req.file);
  if(!req.file) return next("no files");

  videoToTags(req.file.path).then(function(json){
    res.status(200).send(json);
  }).catch(next);
});

router.use(function(err, req, res, next){
  console.error(err);
  res.status(500).send(inspect(err));
});

router.use(function(req, res, next){
  res.status(404).send("not found");
});

if(!module.parent){
  var server = express();
  var cors = require("cors");
  server.use(cors());
  server.use(router);
  server.listen(HTTP_PORT);
  server.timeout = 2 * 60 * 1000;
} else {
  module.exports = router;
}
