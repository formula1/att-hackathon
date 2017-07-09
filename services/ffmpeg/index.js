var child_process = require("child_process");
var { promisify } = require("util");
var fs = require("fs");
var rimraf = require("rimraf");

var execPromise = promisify(child_process.exec.bind(child_process));
var unlinkPromise = promisify(fs.unlink);
var mkdirPromise = promisify(fs.mkdir);
var rimrafPromise = promisify(rimraf);
var imagemin = require("imagemin");
var imageminPngquant = require("imagemin-pngquant");
var archiver = require("archiver");

var { HTTP_PORT, INPUT_DIRECTORY, OUTPUT_DIRECTORY } = process.env;

function extractAudio(inputfile) {
  var outputfile = OUTPUT_DIRECTORY + "/" + Date.now().toString(32) + ".mp3";
  return execPromise(
    `ffmpeg -i "${inputfile}" -q:a 0 -map a ${outputfile}`
  ).then(function(){
    return outputfile;
  });
}

function getDuration(inputfile) {

  // `ffprobe -v quiet -print_format json -show_streams -show_format ${inputfile}`
  return execPromise(
    `ffprobe -i ${inputfile} -show_entries format=duration -v quiet -of csv="p=0"`
  ).then(function(stdout){
    console.log(stdout);
    return stdout;
  });

}

function extractImages(inputfile, offset = "0") {
  var outputdir = OUTPUT_DIRECTORY + "/" + Date.now().toString(32) + Math.random().toString(32);
  return Promise.all([
    mkdirPromise(outputdir),
    mkdirPromise(outputdir + ".min"),
  ]).then(function(){
    return execPromise(
      `ffmpeg -i "${inputfile}" -start_number ${parseInt(offset) * 40}` +
      ` -r 40 -vframes 20 -f image2 ${outputdir}/%05d.png`
    );
  })
  .then(function(){
    console.log("finished ffmpeg");
    return imagemin([outputdir + "/*.png"], outputdir + ".min", {
      plugins: [
        imageminPngquant({ quality: "65-80" })
      ]
    });
  })
  .then(function(){
    console.log("minimized images");

    // create a file to stream archive data to.
    var output = fs.createWriteStream(outputdir + ".zip");
    var archive = archiver("zip", {
      zlib: { level: 9 } // Sets the compression level.
    });

    archive.on("warning", function(err){
      console.warn(err);
    });

    return new Promise(function(res, rej){
      // good practice to catch this error explicitly
      archive.on("error", rej);
      output.on("close", res);

      archive.directory(outputdir + ".min", false);
      archive.finalize();
      archive.pipe(output);
    });
  }).then(function(){
    console.log("zipped folder");
    console.log(fs.statSync(outputdir + ".zip").size);
    return Promise.all([
      rimrafPromise(outputdir),
      rimrafPromise(outputdir + ".min")
    ]);
  }).then(function(){
    return outputdir + ".zip";
  });
}

var express = require("express");
var { Router } = express;
var multer = require("multer");

var router = new Router();

router.post("/extract-audio", multer({
  dest: INPUT_DIRECTORY
}).single("file"), function(req, res, next){
  var inputfile = req.file.path;
  extractAudio(inputfile).then(function(outputfile){
    res.status(200);
    res.set("content-type", "audio/mpeg");
    fs.createReadStream(outputfile).pipe(res).on("finish", function(){
      Promise.all([
        unlinkPromise(inputfile),
        unlinkPromise(outputfile),
      ]).catch(function(err){
        console.error("cannot cleanup: ", err);
      });
    });
  }).catch(next);
});

router.post("/extract-images", multer({
  dest: INPUT_DIRECTORY
}).single("file"), function(req, res, next){
  var infile = req.file.path;
  var offset = req.body.offset;
  extractImages(infile, offset).then(function(outfile){
    res.status(200);
    res.set("content-type", "application/zip");
    fs.createReadStream(outfile).pipe(res).on("finish", function(){
      Promise.all([
        unlinkPromise(infile),
        unlinkPromise(outfile),
      ]).catch(function(err){
        console.error("cannot cleanup: ", err);
      });
    });
  }).catch(next);
});

router.post("/get-duration", multer({
  dest: INPUT_DIRECTORY
}).single("file"), function(req, res, next){
  var infile = req.file.path;
  getDuration(infile).then(function(duration){
    res.status(200).send({
      duration: parseInt(duration)
    });
  }).catch(next);
});

if(!module.parent){
  var server = express();
  server.use(router);
  server.listen(HTTP_PORT);
} else {
  module.exports = router;
}
