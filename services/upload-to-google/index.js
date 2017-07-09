
var path = require("path");
var request = require("request");

function uploadFile(inputfile){
  var name = path.basename(inputfile);
  var formData = new FormData();
  formData.append("file", fs.createReadStream(video_location), "video.mp4");
  formData.append("offset", offset.toString());
  request(
    `https://www.googleapis.com/upload/storage/v1/b/${credentials.bucket}/o?uploadType=multipart`
  )
}
