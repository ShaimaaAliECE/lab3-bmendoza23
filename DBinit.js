const mysql = require('mysql'); 

let conn = mysql.createConnection({
    //DB Login information
        host:'34.130.14.14',
        user: 'root',
        password:'password',
        database:'usersDB'
});

conn.connect();

//Creating Availability Table
conn.query(`CREATE TABLE Availability
            (
                Name varchar(100) NOT NULL PRIMARY KEY,
                LastUpdate      timestamp
                TimesAvailable  json
            )            
            `
            , (err,rows,fields) => {
                if (err)
                    console.log(err);
                else
                    console.log('Table Created');
            }
)

/*
//Drops Availability Table
conn.query(`DROP TABLE Availability`,
            (err,rows,fields) => {
                if(err)
                    console.log(err);
                else
                    console.log('Table Dropped')
            }
        );
*/

/*
//Updates Table
conn.query(`UPDATE Availability 
            set LastUpdate = CURRENT_TIME(),
            TimesAvailable = '{"09:00":true, "10:00":true, "11:00":true, "12:00":false, "13:00":true, "14:00":true, "15:00":true, "16:00":true, "17:00":true, "18:00":true}' where Name = "Brandon"
        `
            ,(err,rows,fields) => {
                if (err)
                    console.log(err);
                else
                    console.log('One row inserted');
            }
            );
*/

conn.query(`SELECT * from Availability`
            ,(err,rows,fields) => {
                let avail = [];

                if (err)
                    console.log(err);
                else
                    console.log('One row selected');

                console.log(rows);
            });
