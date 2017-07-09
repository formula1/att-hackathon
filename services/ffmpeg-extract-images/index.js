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
var request = require("request");
var path = require("path");

var { HTTP_PORT, INPUT_DIRECTORY, OUTPUT_DIRECTORY } = process.env;

function extractImages(input) {
  var outputdir = OUTPUT_DIRECTORY + "/" + Date.now().toString(32) + Math.random().toString(32);

  return Promise.all([
    mkdirPromise(outputdir),
    mkdirPromise(outputdir + ".min"),
  ]).then(function(){
    return JSON.parse(input);
  }).then(function({ inputfileUrl, offset }){
    var inputfile = outputdir + path.extname(inputfileUrl);
    return new Promise(function(res, rej){
      request(inputfileUrl).pipe(
        fs.createWriteStream("inputfile")
      ).on("finish", res).on("error", rej);
    }).then(function(){
      return { inputfile, offset };
    });
  }).then(function({ inputfile, offset }){
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

if(!module.parent){
  var server = express();
  server.use(router);
  server.listen(HTTP_PORT);
} else {
  module.exports = router;
}
