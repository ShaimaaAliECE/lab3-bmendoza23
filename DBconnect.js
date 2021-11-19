const mysql = require('mysql');

//Creating connection to database
function newConnection()
{
    let conn = mysql.createConnection({
        host:'34.130.14.14',
        user: 'root',
        password:'password',
        database:'usersDB'
    });
    return conn;
}

module.exports = newConnection;