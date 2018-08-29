var http = require("http"),
  fs = require("fs"),
  path = require("path"),
  os = require("os"),
  {execSync} = require("child_process");


//format is used for uptime secs to days-hous-min
function format(sec){
  var days = Math.floor(sec / 86400),hours = Math.floor((sec % 86400) / 3600),minutes = Math.floor(((sec % 86400) % 3600) / 60),result="";
  if(days>=1) result+=days+"d ";
  result+=`${hours}:${minutes}`;
  return result;
}

//echo -n returns output without line break
//execSync is used to make sure the data will be grabed before sending them to json
//apt get will take long no matter what internet connection so its better to be set outside the json
var p;
function everyHour(){
  //execSync("apt update"); //If no cronjob is created for apt update enable this
  p=execSync("echo -n $(apt list --upgradable|wc -l)").toString("utf8")-1;//this doesnt have to be in Sync
}

everyHour();//run on startup
setInterval(everyHour,3600000);//update every hour;

http.createServer((req,res)=>{
  //send check if file exists then sends them and it will handle 200-404 status
  //path and public folder is created just for an extra security
  //it isnt realy needed for everything else...
  function send(file){
    var loc=path.join(__dirname,`public/${file}`);
    if (fs.existsSync(loc)) {
      var type=file.split(".").pop();
      fs.readFile(loc, (e,f)=>{
        if (!e){
          res.writeHead(200, {"Content-Type": "text/"+type});
          res.end(f);
        }
      });
    }else{
      res.writeHead(404, {"Content-Type": "text/html"});
      res.write("Error Page Not Found");
      res.end();
    }
  }

  //json sends always status 200 ... if the passed data isnt able to stringify then it fail
  function json (data) {
    res.writeHead(200, {"Content-Type": "application/json"});
    res.write(JSON.stringify(data));
    res.end();
  }

  //this log will send date of call ip addres and the url called
  console.log(req.url,Date(),req.socket.remoteAddress.replace("::ffff:",""));//eslint-disable-line
  if (req.url === "/"){
    send("index.html");
  }//sends index
  else if ( req.url === "/json"){
    var data ={
      temp: (execSync("echo -n $(cat /sys/class/thermal/thermal_zone0/temp)").toString("utf8")/1000).toFixed(1),
      cpu: parseFloat(execSync("echo -n $(grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage \"%\"}')").toString("utf8")).toFixed(1),
      uptime: format(os.uptime()),
      ram: execSync("echo -n $(free -m |grep Mem|awk '{print $3}')").toString("utf8"),
      packages: p,
    };
    json(data);
  }//sends all data
  else{
    send(req.url);
  }//basicly this is used to send js and css files only
}).listen(3334);//change the port to whatever you want
