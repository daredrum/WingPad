var _ = require('lodash-node')
  , Duplex = require('stream').Duplex
  , livedb = require('livedb')
  , sharejs = require('share')
  , backend = livedb.client(livedb.memory())
  , share = sharejs.server.createClient({ backend: backend })

  , getUID = function () { return _.uniqueId() }
  , Documents = require('../documents')
  , User = function (options) {
    var self = this

    _.bindAll(this, 'onMessage')

    this._connection = options.connection
    this._stream = new Duplex({ objectMode: true })

    this.id = getUID()
    this.document = null
    this.props = { title: 'Anonymous' }

    this._stream._write = function (chunk, encoding, callback) {
      self._connection.send(JSON.stringify(chunk))
      return callback()
    }

    this._stream._read = function () {}
    this._stream.headers = this._connection.upgradeReq.headers
    this._stream.remoteAddress = this._connection.upgradeReq.connection.remoteAddress

    this._connection.on('message', this.onMessage)

    this._stream.on('error', function (msg) {
      console.log('error', msg)
      return self._connection.close(msg)
    })

    this._connection.on('close', function (reason) {
      self._stream.push(null)
      self._stream.emit('close')
      self.destroy();
      return self._connection.close( reason )
    })

    this._stream.on('end', function () {
      return self._connection.close()
    })

    share.listen(this._stream)
  }

module.exports = User

_.extend(User.prototype, {

	onMessage: function (data) {
		var jsonData = JSON.parse(data)

		if (jsonData.a === 'open')
		{ this.onOpenEvent(jsonData)
			return;
		}
		if (jsonData.a === 'meta')
		{ this.onMetaEvent(jsonData)
			return;
		}

		return this._stream.push(jsonData)
	}

	, getColor: function () {
		return this.color
	}

	,	setColor: function (color) {
		this.color = color
	}

	,	emit: function (data) {
		this._connection.send(JSON.stringify(data))
		return this
	}

	,	exportOnlyId: function () {
		return {
			id: this.id
		}
	}

	,	exportPublicData: function () {
		return _.extend(this.exportOnlyId(),
			{ title: this.props.title
			, color: this.color
			}
		)
	}

	,	exportPrivateData: function () {
		return _.extend(this.exportPublicData(), {})
	}

	,	openDocument: function (document) {
		document = _.extend(document, {backend: backend})
		this.document = Documents.factory(document).addCollaborator(this)
		this.emit({
			a: 'open',
			user: this.exportPrivateData(),
			document: this.document.exportPublicData()
		})
		return this
	}

	,	closeDocument: function () {
		if (this.document !== null) this.document.removeCollaborator(this)
		return this
	}

	,	updateData: function (data) {
		delete data.id

		_.extend(this.props, data, function (a, b) {
			return b ? b : a
		})

		return this
	}

	,	onOpenEvent: function (data) {
		if (data.user)
			this.updateData(data.user)
		this.openDocument(data.document)
		return this
	}

	,	onMetaEvent: function (data) {
		this.document.metaCollaborators(this, data)
		return this
	}

	,	destroy: function () {
		this.closeDocument()
	}
})
