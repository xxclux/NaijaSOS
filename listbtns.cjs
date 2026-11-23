const fs = require('fs');
const t = fs.readFileSync('public/dispatch.html','utf8');
const re = /<button[^>]+id="([^"]+)"[^>]*>/g;
let m;
while((m = re.exec(t))){
  console.log(m[1]);
}
