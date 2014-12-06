var _ = require('lodash-node')
	, path = require('path')
	, fs = require('fs')
	, log = require('npmlog')
	, docModel = require('../db/models/document').Document
	, HttpError = require('../../error').HttpError

  , getUID = function () { return _.uniqueId('file-') }
  , Documents = {}
  , Document = module.exports = function (props) {
      props = props || {}
      this.id = props.id || getUID()
      if (Documents[this.id] instanceof Document) return Documents[this.id]
      this.collaborators = []
      this.availableColors = ['#36D7B7', '#19B5FE', '#BF55EC', '#F62459',
        '#FFA400', '#044F67', '#CA6924', '#ABB7B7', '#26C281', '#5D8CAE']
      this.props = _.extend({}, props)
			this.backend = this.props.backend
      delete this.props.id
      Documents[this.id] = this
    }

_.extend(Document.prototype, {	

	notifyCollaborators: function (data, collaborators) {
		_.each(collaborators || this.collaborators, function (collaborator) {
			if (this.isPresent(collaborator))
				collaborator.emit(data)
		}, this)
		return this
	}
	
	, metaCollaborators: function (source, data) {
		_.each(this.collaborators, function (collaborator) {
			if (source.id !== collaborator.id) {
				collaborator.emit({
					a: 'meta',
					id: data.id,
					color: data.color,
					meta: data.meta
				})
			}
		}, this)
		return this
	}

	, addCollaborator: function (collaborator) {
		if (!this.isPresent(collaborator)) {
			collaborator.setColor(this.getAvailableColor())
	
			this.notifyCollaborators({
				a: 'join',
				user : collaborator.exportPublicData()
			})
			this.collaborators.push(collaborator)
		}
		return this
	}
	
	, getAvailableColor: function () {
		var color = this.availableColors[0] || this.getRandomColor()
	
		_.pull(this.availableColors, color)
	
		return color
	}
	
	, restoreColor: function (color) {
		var colorsArr = []
		colorsArr.push(color)
		_.union(colorsArr, this.availableColors)
		this.availableColors = colorsArr
	}

	, removeCollaborator: function (collaborator) {
		if (this.isPresent(collaborator)) {
			this.saveDocument(collaborator)
			_.pull(this.collaborators, collaborator)
			this.notifyCollaborators({
				a: 'leave',
				user: collaborator.exportOnlyId()
			})
			this.restoreColor(collaborator.getColor())
		}
		return this
	}

	, isPresent: function (collaborator) {
		return _.indexOf(this.collaborators, collaborator) > -1
	}

	, exportOnlyId: function () {
		return { id: this.id }
	}

	, exportPublicData: function () {
		return _.extend(this.exportOnlyId(), {
			users: _.map(this.collaborators, function (collaborator) {
				return collaborator.exportPublicData()
			})
			, content: this.getDocument()
		})
	}
	
	, getRandomColor: function () {
		var letters = ('0123456789ABCDEF').split('')
			, color = '#'
			, i = 0;
		for (i; i < 6; i++ ) {
			color += letters[Math.floor(Math.random() * 16)];
		}
		return color;
	}

	, getDocument: function () {
		var _this = this
		this.docContent

		docModel.getDocument(this.id, function(err, doc) {
			if (err) {
				log.error(new HttpError(403, err.message))
			} else {
				_this.docContent = doc.content
			}
		})

//		var pathToDoc = __dirname + path.sep + 'savedDocuments' + path.sep + this.id
//		return fs.existsSync(pathToDoc) ?  fs.readFileSync(pathToDoc, 'utf8') : null
	}

//	,	sync: function() {
//		var self = this
//		setTimeout(function() {
//			if (!self.docContent) self.sync()
//		}, 10)
//		return self.docContent
//	}

	, saveDocument: function () {
		var id = this.id
		this.backend.fetch('users-' + this.id,
			'seph',
			function(err, content) {
				docModel.saveDocument({
						docName: id
					,	docContent: content.data
				}, function(err, doc) {
					if (err) {
						log.error('Document wasn\'t saved')
					} else {
						log.info('Document was saved')
					}
				})
			})

//		this.backend.fetch('users-' + this.id,
//			'seph',
//			_.bind(this.writeToFile, this))
	}

//	, writeToFile: function (err, content) {
//		if (!fs.existsSync(__dirname + path.sep + 'savedDocuments')) {
//			fs.mkdirSync(__dirname + path.sep + 'savedDocuments')
//		}
//
//		fs.writeFileSync(__dirname + path.sep + 'savedDocuments'
//			+ path.sep + this.id, content.data)
//	}
})

