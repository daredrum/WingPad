var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , log = require('npmlog')
  , isStarted = !1
  , path = require('path')
	, User = require('./db/models/user').User
	, HttpError = require('../error').HttpError
	, AuthError = require('./db/models/user').AuthError
	, Document = require('./db/models/document').Document
	, mongoose = require('mongoose')
	, async = require('async')
  , express = require('express')
	, bodyParser = require('body-parser')
	, multer = require('multer')
	, cookieParser = require('cookie-parser')
	, session = require('express-session')
	, MongoStore  = require('connect-mongo')(session)
	, app = express()

exports.start = function (config) {
  if (config && !isStarted) {

		app.use(bodyParser.json()) // for parsing application/json
		app.use(bodyParser.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
		app.use(multer()) // for parsing multipart/form-data
		app.use(cookieParser())

		app.use(session({
				secret: config.session.secret
			, key: config.session.key
			, cookie: config.session.cookie
			,	store: new MongoStore ({mongoose_connection: mongoose.connection})
			,	resave: false
			,	saveUninitialized: true
		}));

		app.get('/theme', function(request, response) {
			var urlParsed = url.parse(request.url, true)

			if (urlParsed.query.name) {
				var themePath = 'libs/codemirror/theme/' + urlParsed.query.name

				fs.readFile(themePath + '.css', 'utf8',  function (err, data) {
					if (err) throw err

					response.send(JSON.stringify(data))
				})
			}
			else if (!urlParsed.query.name) {
				fs.readdir('libs/codemirror/theme/', function (err, files) {
					if (err) throw err

					response.send(JSON.stringify(files))
				})
			}
		})

		app.post('/login', function(request, response, next) {

			var username = request.body.username;
			var password = request.body.password;

			User.authorize(username, password, function(err, user) {
				if (err) {
					if (err instanceof AuthError) {
						response.status(403).send('Неверный пароль');
						return next(new HttpError(403, err.message));
					} else {
						response.redirect('/')
						return next(err);
					}
				}

				request.session.user = user._id;
				response.status(200).send(user.username);

			});

		})

		app.get('/', function(request, response, next) {
			fs.readFile(config.http_server.index, function (err, page) {
				if (err) {
					log.error('HTTP server', err.message)
					response.status(500).send('Can\'t read ' + config.http_server.index + ' file.')
					return
				}

				response.set('Content-Type', 'text/html');
				response.status(200).send(page)

			})
		})

		app.use(function(err, request, response, next) {
			log.error('HTTP server', err.message)
		})

		var server = app.listen(config.http_server.port, function () {
			var host = server.address().address
			var port = server.address().port
			console.log('Example app listening at http://%s:%s', host, port)
		})
		log.info('HTTP server', 'Server started at port ' + config.http_server.port)
		isStarted = !0
  }
}
