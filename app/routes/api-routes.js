
var orm = require('./../db/orm.js');
var key = require('./../db/keys/google.js');
var NodeGeocoder = require('node-geocoder');
var options = {
  provider: 'google',
  apiKey: key, 
  formatter: null
};
var geocoder = NodeGeocoder(options);
var moment = require('moment');

function getJobDetails(i, jobs, callback){
	//40.735492, -74.987929
	if(i == jobs.length) return callback(null, jobs);
	var latDif = Math.abs(parseInt(jobs[i].location.latitude) - 40.735492);
	var lonDif = Math.abs(parseInt(jobs[i].location.longitude) + 74.987929);
	var distance = Math.floor(Math.sqrt((latDif * latDif) + (lonDif * lonDif)) * 60);
	var post = moment(jobs[i].post_date.unix.replace(/'T'/g, " ").substring(0, 19));
	jobs[i]["display_time"] = post.format('MMM Do, YYYY')
	jobs[i]["distance_miles"] = distance;
	if((!jobs[i].location.city_state || !jobs[i].location.formal_address) && jobs[i].location.latitude && jobs[i].location.longitude){
		console.log(jobs[i].location.latitude + jobs[i].location.longitude)
		geocoder.reverse({lat: jobs[i].location.latitude, lon: jobs[i].location.longitude})
		.then(function(data){
			console.log(data)
			if(data[0] != undefined && data[0].formattedAddress) jobs[i].location["formal_address"] = data[0].formattedAddress;
			if(data[0] != undefined && data[0].city && data[0].administrativeLevels) jobs[i].location["city_state"] = data[0].city + ", " + data[0].administrativeLevels.level1short;
			orm.updateJob(jobs[i], function(err, res){
				if(err) console.log(err);
				return getJobDetails(i+1, jobs, callback);
			})
		})
		.catch(function(err){
			console.log(err);
			return getJobDetails(i+1, jobs, callback);
		})
	} else {
		return getJobDetails(i+1, jobs, callback);
	}
	
}

module.exports = function(app){
	
	app.get('/api/jobs', function(req, res){
		orm.findAll(function(err, jobs){
			if(err) return res.json(404);
			getJobDetails(0, jobs, function(err, newjobs){
				newjobs.sort(function(a,b){
				var c = new Date(a.post_date.unix);
				var d = new Date(b.post_date.unix);
				return d-c;
				});
				res.json(newjobs);
			})
		})
	})
	app.post('/api/location', function(req, res){
		geocoder.reverseGeocode( req.body.latitude, req.body.longitude,  function ( err, data ) {
			if(err){
				res.json("Error: "+err);
				
			} else {
				req.user.location = {
					longitude: req.body.longitude,
					latitude: req.body.latitude
				};
				if(data.results[0] != undefined){
					req.user.location["address"] = data.results[0].formatted_address
				}
				res.json(req.user);
			};
		});
	});

};