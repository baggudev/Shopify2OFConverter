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
});

/* FILE UPLOAD */
router.post("/upload", upload.any(), function(req, res) {
  // READ FILE NAME AND CREATE TRANSLATED CSV
  if (req.files.length > 0) {
    var filePath = req.files[0].path;
    converter.convert(filePath, handleDownload(req, res));
  } else {
    res.send("invalid file: go back and try again.");
  }
});

var handleDownload = function(req, res) {
    return function(downloadPath) {
        if (downloadPath) {
            res.download(downloadPath);
        }
    }
}

module.exports = router;
