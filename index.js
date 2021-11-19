const express = require('express');
const newConnection = require('./DBconnect');

//Admin Login Information

const adminUN = 'admin';
const adminPW = 'password';
const doodle = express();

//Serving static content
doodle.use(express.static('static'));

doodle.use(express.urlencoded({
        extended: true
}));

//Admin Page Login
doodle.post('/admin', (req, res) => {

    //Validates login information
    if(req.body.adminUser === adminUN && req.body.adminPassword === adminPW)
    {
        let conn = newConnection();
        conn.connect();

        //Content of Admin Page Login
        let content = '<div><div>Doodle App - Admin Portal (Please save availability and time changes seperatly)</div>'
                    +'<table style="min-width: 100vw; padding: 5px 15px">';  
            
        conn.query(`SELECT Name, TimeAvailable
                    FROM Availability
                    ORDER BY Name,
                    case Name when "Admin" then '1' else '2' end
                    `, (err,rows,fields) => {
                        if (err)
                            console.log(err);
                        else {
                            //Assigns current ordered times in the array to variable adminTimes
                            let adminTimes = JSON.parse(rows[0].TimeAvailable)
                            //Shifts index of array so admin is removed
                            rows.shift();
                    
                            content +='<table style="min-width: 100vw; padding: 5px 15px">'
                                    +'<form action="/admin/time" method="post" style="display:table-header-group; vertical-align: middle; border-color: inherit">'
                                    +'<tr>'
                                    +'<th>Name</th>';
                            
                            //Adding time input for each column
                            //Initial value corresponds to user rows
                            for (var i=0; i<10; i++)
                            {
                                content += '<th><input type="time" id="t' + i + '" name="t' + i + '" value="' + adminTimes[i] + '" required></th>'
                            }

                            //Adds button "Save Changes" to Save Time Changes form
                            content +='</tr>'
                                +'<tr>'
                                    +'<th></th>'
                                    +'<th colspan="10"><button type="submit" id="save-times-btn">Save Changes</button></th>'
                                +'</tr>'
                            +'</form>'
                            +'<form action="/admin/avail" method="post">';

                            //Rows for each user 
                        }
                    })
    }
});



doodle.listen(2000);
