var package = require('../package.json');

exports.index = function(req, res) {
    res.render('index', { title: package.name });
}