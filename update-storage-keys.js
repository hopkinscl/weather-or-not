// Script to update all localStorage keys
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all weatherApp with weatherOrNot in storage keys
content = content.replace(/weatherAppAuthToken/g, 'weatherOrNotAuthToken');
content = content.replace(/weatherAppCurrentUser/g, 'weatherOrNotCurrentUser');

// Write the updated content back to the file
fs.writeFileSync(filePath, content);

console.log('Storage keys updated successfully!');