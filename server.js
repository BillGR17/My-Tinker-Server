const http = require("http"),
  fs = require("fs"),
  path = require("path"),
  os = require("os"),
  config = require("./config.json"),
  exec = require("child_process").exec;
//format is used for uptime secs to days-hous-min
const format = (sec) => {
  var days = Math.floor(sec / 86400),
    hours = Math.floor((sec % 86400) / 3600),
    minutes = Math.floor(((sec % 86400) % 3600) / 60),
    result = "";
  result = (days >= 1) ? days + "d " : "";
  result += `${hours}:${minutes}`;
  return result;
};
//store all data here
//set null as init
let data = {
  temp: null,
  uptime: null,
  ram: null,
  net: null,
  packages: null,
  packages_list: null,
};
const onErr = (_e) => {
  if (_e) {
    console.error(_e);
  }
};
//readfile on error print the error
//and always return null on fail
const readFile = (file) => {
  return new Promise((res) => {
    fs.readFile(file, "utf8", (_e, _f) => {
      onErr(_e);
      res((!_f) ? null : _f);
    });
  });
};
let lock_stats = false;
const updateStats = async () => {
  if (!lock_stats) {
    lock_stats = true;
    readFile("/proc/meminfo").then((x) => {
      let mt = x.split("\n")[0].match(/\d+/),
        ma = x.split("\n")[2].match(/\d+/);
      data.ram = parseFloat(parseInt(mt - ma) / 1024 / 1024).toFixed(2) + "<sub>gb</sub> | " + parseFloat(parseInt(mt) / 1024 / 1024).toFixed(2) + "<sub>gb</sub>";
    });
    readFile("/sys/class/thermal/thermal_zone0/temp").then((x) => {
      data.temp = parseFloat(parseInt(x) / 1000).toFixed(0);
    });
    readFile("/sys/class/net/" + config.netInterface + "/statistics/rx_bytes").then((x) => {
      readFile("/sys/class/net/" + config.netInterface + "/statistics/tx_bytes").then((x2) => {
        data.net = "D: " + parseFloat(parseInt(x) / 1024 / 1024 / 1024).toFixed(2) + "<sub>gb</sub> ";
        data.net += "U: " + parseFloat(parseInt(x2) / 1024 / 1024 / 1024).toFixed(2) + "<sub>gb</sub> ";
      });
    });
    data.uptime = format(os.uptime);
  }
};
let lock_apt = false;
//apt get will take long no matter what internet connection so its better to be set outside the json
const AptCheck = () => {
  if (!lock_apt) {
    lock_apt = true;
    exec("apt update > /dev/null 2>&1&&apt list --upgradable", "utf8", (_e, _d) => {
      onErr(_e);
      if (_d) {
        let spl = _d.split("\n");
        spl.shift(); //removes the useless listing text....
        let pac = spl.join("\n");
        data.packages = spl.length - 1; //remove the last \n
        data.packages_list = pac;
      }
    });
  }
};
//reset lock_stats
setInterval(() => {
  lock_stats = false;
}, config.systemCheck);
//reset lock_apt
setInterval(() => {
  lock_apt = false;
}, config.aptCheck);
http.createServer(async (req, res) => {
  //send check if file exists then sends them and it will handle 200-404 status
  //path and public folder is created just for an extra security
  //it isnt really needed for everything else...
  const send = (file) => {
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
  };
  //json sends always status 200 ... If the passed data isnt able to stringify then it fail
  const json = (data) => {
    res.writeHead(200, {
      "Content-Type": "application/json"
    });
    res.write(JSON.stringify(data));
    res.end();
  };
  //this log will send date of call ip address and the url called
  console.log(req.url, Date(), req.socket.remoteAddress.replace("::ffff:", "")); //eslint-disable-line
  if (req.url === "/") {
    send("index.html");
  } //sends index
  else if (req.url === "/json") {
    updateStats();
    AptCheck();
    json(data);
  } //sends all data
  else {
    send(req.url);
  } //basically this is used to send js and css files only
}).listen(process.env.PORT || config.port); //gets the port from ENV or from the config file
