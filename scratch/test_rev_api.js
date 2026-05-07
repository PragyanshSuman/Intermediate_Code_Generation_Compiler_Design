const http = require('http');
const fs = require('fs');

const data = JSON.stringify({
  expression: `
int main()
{
int num = 1234, rev = 0, rem;
while(num != 0) {
rem = num % 10;
rev = rev * 10 + rem;
num /= 10;
}
printf("Reverse = %d", rev);
return 0;
}
`
});

const options = {
  hostname: 'localhost', port: 3001, path: '/api/compile-snippet', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    fs.writeFileSync('scratch/rev_api_res.json', JSON.stringify({ status: res.statusCode, body: body }, null, 2));
  });
});
req.write(data);
req.end();
