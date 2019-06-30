const { log } = require("abr-log")("rpgen");
const { getMeta, getAvailable } = require("webradio-metadata");
const sqlite3 = require("sqlite3");
const cp = require("child_process");
const async = require("async");

const country = process.argv[2];
const name = process.argv[3]; //"Virgin Radio France";

if (!country || !name) {
	log.info("usage: \"node index.js COUNTRY RADIO\" where COUNTRY and RADIO are in the following list:");
	return log.info(JSON.stringify(getAvailable().map(e => [e.country, e.name]), null, "\t"));
} else {
	log.info("generate playlist for radio " + name);
}

const db = new sqlite3.Database("meta_" + country + "_" + name +".sqlite");

function f() {
	async.waterfall([
		function(cb) {
			getMeta(country, name, cb);
		}, function(meta, cb) { // check that the music is not already in DB
			log.info("meta=" + JSON.stringify(meta));
			db.get("SELECT artist, title FROM songs WHERE artist = ? AND title = ?", [meta.artist, meta.title], function(err, line) {
				if (err) return cb(err);
				if (line) return cb("already in DB");
				cb(null, meta);
			});
		}, function(meta, cb) { // launch youtube-dl
			let metaStr = meta.artist + " " + meta.title;
			let command = "youtube-dl --default-search=ytsearch: --youtube-skip-dash-manifest " +
				"--output=\"./musics/%(title)-s%(id)s.tmp.%(ext)s\" -x --audio-format=\"mp3\" \"" +
				metaStr + "\" --max-filesize 20m";
			log.info("start downloading " + metaStr);
			cp.exec(command, function(err, stdout, stderr) { cb(err, stdout, stderr, meta) }); //function(error, stdout, stderr) {
		}, function(stdout, stderr, meta, cb) {
			var fileName = "unknown";
			var lines = stdout.split("\n");
			for (var i=0; i<lines.length; i++) {
				var idx = lines[i].indexOf('Destination: ./musics/');
				if (~idx && ~lines[i].indexOf(".tmp.mp3")) {
					fileName = lines[i].slice(idx+22, lines[i].length-8);
					break;
				}
			}
			if (fileName == "unknown") return cb("there has probably been a problem fetching music. stderr=" + stderr);
			log.info("downloaded music as " + fileName);
			db.run("INSERT INTO songs(artist, title) VALUES (?,?)", [meta.artist, meta.title], cb);
		}
	], function(err) {
		if (err && err == "already in DB") return log.info("music already in DB, skip");
		if (err) return log.error("problem during processing: " + err);
		log.info("success");
	});
}

db.run("CREATE TABLE IF NOT EXISTS 'songs' (`artist` TEXT NOT NULL, `title` TEXT NOT NULL)", function(err) {
	if (err) return log.error("could not prepare DB. abort");
	setInterval(f, 10000);
	f();
});
