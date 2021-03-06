'use strict';

const path = require('path');
const env  = process.env.NODE_ENV || 'development';
const compression   = require('compression');

module.exports = function(server) {

  let mountPath = env === 'development' ? 
    'client/src/' :
    'client/dist/';

  let router = server.loopback.Router();

  const staticPath  = path.resolve(__dirname, '../../', mountPath);

  router.use(server.loopback.static(staticPath));

  router.get('/uploads/*', function(req, res, next) {    
    next();
  });

  // request pre-processing middleware
  router.use(compression({ filter: shouldCompress }));

  //filter out non-compressable calls
  function shouldCompress(req, res) {

    if(typeof req.originalUrl === 'string'){
      if(req.originalUrl.includes('api')) {
        return false;
      }
      if(req.originalUrl.includes('png')) {
        return false;
      }
      if(req.originalUrl.includes('jpg')) {
        return false;
      }
    }

    // fallback to standard filter function
    return compression.filter(req, res);
  }

  //add cache control
  router.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  
    const url = req.originalUrl;
  
    if (
      !url.includes('api') && 
      !url.includes('html')
    ) {
      res.header('Cache-Control', 'public, max-age=86400');
    } else if (
      url.includes('api') || 
      url.includes('html')
    ) {
      res.header('Cache-Control', 'public, max-age=0');
    }
    
    next();
  });


  // any other routes:
  router.get('/*', function(req, res, next) {
    if (
      req.originalUrl.includes('api') || 
      req.originalUrl.includes('map')
    ) {
      return next();
    }
    
    res.sendFile(staticPath + '/index.html');
  });

  server.use(router);
};
