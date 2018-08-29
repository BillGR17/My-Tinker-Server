function update() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      updateDis(this.response);
    }
  };
  xhttp.open("GET", "/json", true);
  xhttp.send();

}
function updateDis(d){
  var l=JSON.parse(d);
  document.getElementById('grab').style.display = "block";
  for (var i in l){
    document.getElementById(i).innerHTML=l[i];
  }
}

setInterval(update,1000);
