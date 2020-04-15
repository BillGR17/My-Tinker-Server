let status = document.getElementById("stats");
const capitalize = (s) => {
  return (typeof s !== "string") ? "" : s.charAt(0).toUpperCase() + s.slice(1);
};
//this function will place all the data
const place_data = (d) => {
  status.innerHTML = "";
  let table = document.createElement("table"),
    r = table.insertRow(0);
  //print names
  for (let i in d) {
    r.insertCell().innerHTML = capitalize(i.replace(/_/g, " "));
  }
  //print values
  let r2 = table.insertRow(1);
  for (let i in d) {
    r2.insertCell().innerHTML = d[i].toString().replace(/\n/g,"<br>");
  }
  status.appendChild(table);
};
//this function collects all the data and calls place_data function on success
const request_data = () => {
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 200) {
      place_data(JSON.parse(this.response));
    }
  };
  xhttp.open("GET", "/json", true);
  xhttp.send();
};
setInterval(request_data, 1000);
