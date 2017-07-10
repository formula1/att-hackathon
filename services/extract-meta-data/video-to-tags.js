var fs = require("fs");
var http = require("http");
var https = require("https");
var FormData = require("form-data");
var concatStream = require("concat-stream");

var credentials = require("./vrec-credentials");

function getLengthOfVideo(video_location){
  return Promise.resolve().then(function(){
    var formData = new FormData();
    formData.append("file", fs.createReadStream(video_location), "video.mp4");
    var request = http.request({
      method: "post",
      host: "ffmpeg-service",
      path: "/get-duration",
      headers: formData.getHeaders()
    });

    formData.pipe(request);
    return new Promise(function(res, rej){
      request.on("error", rej);
      request.on("response", function(response){
        console.log(response.statusCode);
        response.pipe(concatStream(function(value){
          if(response.statusCode !== 200){
            rej(value.toString());
          } else {
            res(value.toString());
          }
        }));
      });
    });
  }).then(function(str){
    return JSON.parse(str).duration;
  });
}

function getTagsForVideo(video_location, offset){
  return Promise.resolve().then(function(){
    var formData = new FormData();
    formData.append("file", fs.createReadStream(video_location), "video.mp4");
    formData.append("offset", offset.toString());
    var request = http.request({
      method: "post",
      host: "ffmpeg-service",
      path: "/extract-images",
      headers: formData.getHeaders()
    });

    formData.pipe(request);
    return new Promise(function(res, rej){
      request.on("error", rej);
      request.on("response", function(response){
        console.log(response.statusCode);
        response.pipe(concatStream(function(value){
          if(response.statusCode !== 200){
            rej(value.toString());
          } else {
            res(value);
          }
        }));
      });
    });
  }).then(function(vid){
    console.log("finished with ");
    var formData = new FormData();
    formData.append("images_file", vid, "video.zip");
    var request = https.request({
      method: "post",
      host: "gateway-a.watsonplatform.net",
      path: `/visual-recognition/api/v3/classify?api_key=${credentials.api_key}&version=2016-05-20`,
      headers: formData.getHeaders()
    });

    formData.pipe(request);
    return new Promise(function(res, rej){
      request.on("error", rej);
      request.on("response", function(response){
        console.log(response.statusCode);
        response.pipe(concatStream(function(value){
          if(response.statusCode !== 200){
            rej(value.toString());
          } else {
            res(value.toString());
          }
        }));
      });
    });
  }).then(function(watsonVal){
    console.log("watson", watsonVal);
    return JSON.parse(watsonVal);
  });
}

function videoToTags(inputfile){
  return getLengthOfVideo(inputfile).then(function(duration){
    return runFile([], 0);
    function runFile(results, i){
      return getTagsForVideo(inputfile, i).then(function(result){
        results.push(result);
        console.log(i, duration);
        if(i < duration) return runFile(results, i + 0.5);
        return results;
      });
    }
  });
}

module.exports = videoToTags;
