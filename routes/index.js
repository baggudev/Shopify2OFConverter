var express = require('express');
var router = express.Router();
var converter = require("../lib/converter");

/* GET home page. */
router.get('/', function(req, res, next) {
    res.sendfile('public/html/main.html')
}); 

var multer = require("multer");
var upload = multer({
  dest: "./uploads"
})
/* FILE UPLOAD */
router.post("/upload", upload.any(), function(req, res) {
  // do things
  console.log("hi");
  console.log(JSON.stringify(req.files));

  // READ FILE NAME AND CREATE TRANSLATED CSV
  var filePath = req.files[0].path;
  console.log("file path: " + filePath);
  converter.convert(filePath, handleDownload(req, res));
});

var handleDownload = function(req, res) {
    return function(downloadPath) {
        console.log("the download path: " + downloadPath); 
        if (downloadPath) {
            res.download(downloadPath);
        }
    }
}

module.exports = router;
