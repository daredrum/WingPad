var async = require('async')
	,	util = require('util')
	,	mongoose = require('../lib/mongoose')
	,	Schema = mongoose.Schema

var schema = new Schema({
	name: {
		type: String
		, unique: true
		,	required: true
	}
	,	content: {
		type: String
		,	required: true
	}
	,	created: {
		type: Date
		,	default: Date.now
	}
})

schema.statics.saveDocument = function(jsonDoc, callback) {
	var Document = this

	async.waterfall([
			function(callback) {
				Document.findOne({name: jsonDoc.docName}, callback)
			}
		,	function(document, callback) {
			if (document) {
				document.content = jsonDoc.docContent
				callback(null, doc)
			} else {
				var doc = new Document({ name: jsonDoc.docName, content: jsonDoc.docContent})
				doc.save(function(err) {
					if (err) return callback(err)
					callback(null, doc)
				})
			}
		}
	], callback)
}

schema.statics.getDocument = function(docName, callback) {
	var Document = this

	async.waterfall([
			function(callback) {
				Document.findOne({name: docName}, callback)
			}
		,	function(document, callback) {
			if (document) {
				callback(null, document)
			} else {
				var doc = new Document({ name: docName, content: ''})
				doc.save(function(err) {
					if (err) return callback(err)
					callback(null, doc)
				})
			}
		}
	], callback)
}

exports.Document = mongoose.model('Document', schema)

function DocError(message) {
	Error.apply(this, arguments)
	Error.captureStackTrace(this, AuthError)

	this.message = message
}

util.inherits(DocError, Error)

DocError.prototype.name = 'AuthError'

exports.DocError = DocError