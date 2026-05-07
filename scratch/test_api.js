const http = require('http');
const fs = require('fs');

const data = JSON.stringify({
  expression: `
#include <stdio.h>
int main() {
if(income<=250000) 
tax=0;
else if(income<=500000) 
tax=income*0.05;
else if(income<=1000000) 
tax=income*0.2;
else 
tax=income*0.3;
printf("Tax = %.2f", tax);
return 0;
}
`
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/compile-snippet',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    fs.writeFileSync('scratch/api_res.json', JSON.stringify({ status: res.statusCode, body: body }, null, 2));
  });
});

req.on('error', (e) => {
  fs.writeFileSync('scratch/api_res.json', JSON.stringify({ error: e.message }, null, 2));
});

req.write(data);
req.end();
