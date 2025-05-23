// Script to update all JWT secrets
const fs = require('fs');
const path = require('path');

// Update userController.js
const userControllerPath = path.join(__dirname, 'controllers', 'userController.js');
let content = fs.readFileSync(userControllerPath, 'utf8');
content = content.replace(/weatherappsecret/g, 'weatherornotsecret');
fs.writeFileSync(userControllerPath, content);

// Update middleware/auth.js
const authPath = path.join(__dirname, 'middleware', 'auth.js');
content = fs.readFileSync(authPath, 'utf8');
content = content.replace(/weatherappsecret/g, 'weatherornotsecret');
fs.writeFileSync(authPath, content);

console.log('JWT secrets updated successfully!');