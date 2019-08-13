function updateDis(d) {
  for (var i in d) {
    if ({}.hasOwnProperty.call(d, i)) {
      if (document.getElementById(i)) {
        document.getElementById(i).innerHTML = d[i];
      }
    }
  }
}
function update() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 200) {
      updateDis(JSON.parse(this.response));
    }
  };
  xhttp.open("GET", "/json", true);
  xhttp.send();
}
setInterval(update, 1000);
