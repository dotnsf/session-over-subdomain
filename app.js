//. app.js
var express = require( 'express' ),
    cookieParser = require( 'cookie-parser' ),
    session = require( 'express-session' ),
    ejs = require( 'ejs' ),
    request = require( 'request' ),
    app = express();

require( 'dotenv' ).config();

app.use( session({
  secret: 'sos',
  resave: false,
  saveUninitialized: true, //false,
  cookie: {
    domain: ".ghac.me",
    path: "/",
    //httpOnly: true,
    //secure: false,
    maxage: 1000 * 60 * 10   //. 10min
  }
}));

//app.use( cookieParser() );
app.use( express.Router() );
//app.use( express.static( __dirname + '/public' ) );

app.use( function( req, res, next ){
  /*
  res.header( 'Access-Control-Allow-Credentials', true );
  res.header( 'Access-Control-Allow-Origin', '*' );
  res.header( 'Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE' );
  res.header( 'Access-Control-Allow-Headers', 'X-Requested-with, X-HTTP-Method-Override, Content-Type, Accept' );
  */
  next();
});

app.set( 'views', __dirname + '/views' );
app.set( 'view engine', 'ejs' );

var client_id = 'CLIENT_ID' in process.env ? process.env.CLIENT_ID : '';
var client_secret = 'CLIENT_SECRET' in process.env ? process.env.CLIENT_SECRET : '';
var callback_url = 'CALLBACK_URL' in process.env ? process.env.CALLBACK_URL : '';


app.get( '/login', function( req, res ){
  res.redirect( 'https://github.com/login/oauth/authorize?client_id=' + client_id + '&redirect_uri=' + callback_url + '&scope=repo' );
});

app.get( '/logout', function( req, res ){
  if( req.session.oauth ){
    req.session.oauth = {};
  }

  //res.redirect( '/' );
  //. #1  http://ghac.me/callback
  var redirect_path = '/';
  console.log( 'GET /logout', req.session.ghac_user, req.session.ghac_host );
  if( req.session.ghac_user && req.session.ghac_host ){
    redirect_path = '//' + req.session.ghac_user + '.' + req.session.ghac_host;
  }
  console.log( ' redirect_path = ' + redirect_path );

  res.redirect( redirect_path );
});

app.get( '/callback', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var code = req.query.code;
  var option = {
    url: 'https://github.com/login/oauth/access_token',
    form: { client_id: client_id, client_secret: client_secret, code: code, redirect_uri: callback_url },
    method: 'POST'
  };
  request( option, async function( err, res0, body ){
    if( err ){
      console.log( { err } );
    }else{
      var tmp1 = body.split( '&' );
      for( var i = 0; i < tmp1.length; i ++ ){
        var tmp2 = tmp1[i].split( '=' );
        if( tmp2.length == 2 && tmp2[0] == 'access_token' ){
          var access_token = tmp2[1];

          req.session.oauth = {};
          req.session.oauth.token = access_token;
        }
      }
    }

    //. #1  http://ghac.me/callback
    var redirect_path = '/';
    console.log( 'GET /callback', req.session.ghac_user, req.session.ghac_host );

    res.redirect( redirect_path );
  });
});


app.get( '/*', function( req, res, next ){
  var path = req.path;
  var tmp = path.split( '.' );
  if( tmp.length > 1 ){
    //. static files
    next();
  }else{
    console.log( 0, req.session );
    var old_user = null;
    var old_host = null;
    if( req.session ){
      old_user = req.session.ghac_user;
      old_host = req.session.ghac_host;
    }

    var user = '';
    var host = req.get( 'host' );
    tmp = host.split( '.' );
    if( tmp.length > 2 ){
      user = tmp[0];
      tmp.shift();
      host = tmp.join( '.' );
    }

    req.session.ghac_user = user; 
    req.session.ghac_host = host; 
    console.log( 1, req.session );
    req.session.save( function( err ){
      if( err ){
        res.contentType( 'application/json; charset=utf-8' );
        res.write( JSON.stringify( { status: false, old_host: old_host, old_user: old_user, host: host, user: user, session: req.session, error: err }, null, 2 ) );
        res.end();
      }else{
        res.render( 'index', {} );
      }
    });
  }
});

//. listening port
var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );

module.exports = app;
