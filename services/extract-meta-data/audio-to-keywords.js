var s2TCredentials = require("./s2t-credentials");
var nluCredentials = require("./nlu-credentials");
var fs = require("fs");
var http = require("http");
var https = require("https");
var FormData = require("form-data");
var concatStream = require("concat-stream");

function videoToFlac(video_location){
  return Promise.resolve().then(function(){
    return new Promise(function(res, rej){
      var formData = new FormData();
      formData.append("file", fs.createReadStream(video_location), "video.mp4");
      var request = http.request({
        method: "post",
        host: "ffmpeg-service",
        path: "/extract-audio",
        headers: formData.getHeaders()
      });

      formData.pipe(request);
      request.on("error", rej);
      request.on("response", function(response){
        console.log("videoToFlac:", response.statusCode);
        response.pipe(concatStream(function(value){
          if(response.statusCode !== 200){
            rej(value.toString());
          } else {
            res(value);
          }
        }));
      });
    });
  });
}

function speechToText(stream){
  return Promise.resolve().then(function(){
    return new Promise(function(res, rej){
      var formData = new FormData();
      formData.append("metadata", JSON.stringify({ part_content_type: "audio/flac" }));
      formData.append("upload", stream, "audio.flac");
      var request = https.request({
        method: "post",
        host: "stream.watsonplatform.net",
        path: "/speech-to-text/api/v1/recognize",
        auth: s2TCredentials.username + ":" + s2TCredentials.password,
        headers: formData.getHeaders()
      });

      formData.pipe(request);
      request.on("error", rej);
      request.on("response", function(response){
        console.log("speechToText:", response.statusCode);
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
    console.log(str);
    return JSON.parse(str);
  });
}

function getNaturalUnderstanding(json){
  var text = json.results.reduce(function(text, cur){
    return text  + ".\n"+ cur.alternatives[0].transcript;
  }, "");
  return Promise.resolve().then(function(){
    var request = https.request({
      method: "post",
      host: "gateway.watsonplatform.net",
      path: "/natural-language-understanding/api/v1/analyze?version=2017-02-27",
      auth: nluCredentials.username + ":" + nluCredentials.password,
      headers: { "Content-Type": "application/json" },
    });

    return new Promise(function(res, rej){
      request.on("error", rej);
      request.on("response", function(response){
        console.log("getNaturalUnderstandingt:", response.statusCode);
        response.pipe(concatStream(function(value){
          if(response.statusCode !== 200){
            rej(value.toString());
          } else {
            res(value.toString());
          }
        }));
      });
      request.end(JSON.stringify({
        text: text,
        features: {
          concepts: {
            emotion: true,
            sentiment: true,
            limit: 15
          },
          entities: {
            emotion: true,
            sentiment: true,
            limit: 15
          },
          keywords: {
            emotion: true,
            sentiment: true,
            limit: 15
          }
        }
      }));
    });
  }).then(function(str){
    return JSON.parse(str);
  });
}

function audioToKeywords(inputfile){
  return videoToFlac(inputfile).then(function(stream){
    console.log("video to flac");
    return speechToText(stream);
  }).then(function(text){
    console.log("speech to text");
    return getNaturalUnderstanding(text);
  }).then(function(result){
    console.log("natural understanding");
    return result;
  });
}

module.exports = audioToKeywords;
