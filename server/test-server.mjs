import express from 'express';

const app = express();

app.get('/test', (req, res) => {
  console.log('Test endpoint hit!');
  res.json({ message: 'It works!' });
});

app.listen(3002, () => {
  console.log('Test server running on http://localhost:3002');
  console.log('Try: curl http://localhost:3002/test');
});
