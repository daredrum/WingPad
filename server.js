var config = require('./config')
require('./server/http-server').start(config)
require('./server/socket-server').start(config.socket_server)
