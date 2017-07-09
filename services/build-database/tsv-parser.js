const csv = require("csv-streamify")
const fs = require("fs")

function parseTSV(file){
  return new Promise(function(res, rej){
    fs.createReadStream(file)
    const parser = csv({
      objectMode: true,
      delimiter: "\t", // comma, semicolon, whatever
      newline: "\n", // newline character (use \r\n for CRLF files)
    }, function(err, result){
      if(err) return rej(err);
      res(result);
    });
  });
}

module.exports = parseTSV;
