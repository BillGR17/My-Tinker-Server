var http = require("http"),
  fs = require("fs"),
  path = require("path"),
  os = require("os"),
  exec = require("child_process").exec;
//format is used for uptime secs to days-hous-min
function format(sec) {
  var days = Math.floor(sec / 86400),
    hours = Math.floor((sec % 86400) / 3600),
    minutes = Math.floor(((sec % 86400) % 3600) / 60),
    result = "";
  if (days >= 1) result += days + "d ";
  result += `${hours}:${minutes}`;
  return result;
}
let data = {
  temp: null,
  uptime: null,
  ram: null,
  net: null,
  packages: null,
  packages_list: null,
};
function everySec() {
  fs.readFile("/sys/class/thermal/thermal_zone0/temp", "utf8", function(_e, _f) {
    if (_e) throw _e;
    data.temp = parseFloat(parseInt(_f.replace("\n", "")) / 1000).toFixed(0);
  });
  fs.readFile("/proc/meminfo", "utf8", function(_e, _f) {
    if (_e) throw _e;
    let mt = _f.split("\n")[0].match(/\d+/),
      ma = _f.split("\n")[2].match(/\d+/);
    data.ram = parseFloat(parseInt(mt - ma) / 1024 / 1024).toFixed(2) + "<sub>gb</sub> | " + parseFloat(parseInt(mt) / 1024 / 1024).toFixed(2) + "<sub>gb</sub>";
  });
  fs.readFile("/sys/class/net/eth0/statistics/rx_bytes", "utf8", function(_e, _f) {
    if (_e) throw _e;
    //get eth0
    fs.readFile("/sys/class/net/eth0/statistics/tx_bytes", "utf8", function(__e, __f) {
      if (__e) throw __e;
      data.net = "D: " + parseFloat(parseInt(_f) / 1024 / 1024 / 1024).toFixed(2) + "<sub>gb</sub> | U: " + parseFloat(parseInt(__f) / 1024 / 1024 / 1024).toFixed(2) + "<sub>gb</sub>";
    });
  });
  data.uptime = format(os.uptime);
}
//echo -n returns output without line break
//execSync is used to make sure the data will be grabbed before sending them to json
//apt get will take long no matter what internet connection so its better to be set outside the json
function everyHour() {
  exec("apt update > /dev/null 2>&1&&apt list --upgradable", "utf8", function(_e, _d) {
    if (_e) throw _e;
    let spl = _d.split("\n");
    spl.shift(); //removes the useless listing text....
    let pac = spl.join("\n");
    data.packages = spl.length - 1; //remove the last \n
    data.packages_list = pac;
  });
}
everyHour(); //run on startup
setInterval(everyHour, 3600000); //update every hour;
everySec(); //run on startup
setInterval(everySec, 1000); //update every Sec;
http.createServer((req, res) => {
  //send check if file exists then sends them and it will handle 200-404 status
  //path and public folder is created just for an extra security
  //it isnt realy needed for everything else...
  function send(file) {
    var loc = path.join(__dirname, `public/${file}`);
    if (fs.existsSync(loc)) {
      var type = file.split(".").pop();
      fs.readFile(loc, (e, f) => {
        if (!e) {
          res.writeHead(200, {
            "Content-Type": "text/" + type
          });
          res.end(f);
        }
      });
    } else {
      res.writeHead(404, {
        "Content-Type": "text/html"
      });
      res.write("Error Page Not Found");
      res.end();
    }
  }
  //json sends always status 200 ... if the passed data isnt able to stringify then it fail
  function json(data) {
    res.writeHead(200, {
      "Content-Type": "application/json"
    });
    res.write(JSON.stringify(data));
    res.end();
  }
  //this log will send date of call ip addres and the url called
  console.log(req.url, Date(), req.socket.remoteAddress.replace("::ffff:", "")); //eslint-disable-line
  if (req.url === "/") {
    send("index.html");
  } //sends index
  else if (req.url === "/json") {
    json(data);
  } //sends all data
  else {
    send(req.url);
  } //basicly this is used to send js and css files only
}).listen(80); //change the port to whatever you want
