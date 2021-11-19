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

//Handles admin page
doodle.post('/admin', (req, res) => {

    //Validates login information
    if(req.body.adminUser === adminUN && req.body.adminPassword === adminPW)
    {
        console.log("Login accepted.")
        let conn = newConnection();
        conn.connect();

        //Content of Admin Page
        let content = '<div><div><h2>Doodle App - Admin Portal</h2> (Please save availability and time changes seprately)</div>'
                    +'<table style="min-width: 100vw; padding: 5px 15px">';  
            
        conn.query(`SELECT Name, TimesAvailable
                    FROM Availability
                    ORDER BY Name,
                    case Name when "Admin" then '1' else '2' end
                    `, (err,rows,fields) => {
                        if (err)
                            console.log(err);
                        else {
                            //Assigns current ordered times in the array to variable adminTimes
                            let adminTimes = JSON.parse(rows[0].TimesAvailable)
                            //Shifts index of array so admin is removed
                            rows.shift();
                    
                            content +='<table style="min-width: 100vw; padding: 5px 15px">'
                                    +'<form action="/admin/timechanged" method="post" style="display:table-header-group; vertical-align: left">'
                                    +'<tr>'
                                    +'<th>Name</th>';
                            
                            //Adding time input for each column
                            //Initial value corresponds to user rows
                            for (var i=0; i<10; i++)
                            {
                                content += '<th><input type="time" id="t' + i + '" name="t' + i + '" value="' + adminTimes[i] + '"></th>'
                            }

                            //Adds button "Save Changes" to Save Time Changes form
                            content +='</tr>'
                                +'<tr>'
                                +'<th></th>'
                                +'<th colspan="10"><button type="submit" id="save-times-btn">Save Time Slot Changes</button></th>'
                                +'</tr>'
                                +'</form>'
                                +'<form action="/admin/availabilitychanged" method="post">';

                            //Rows added to displayed table for each user
                            for(r of rows) { 
                                let times = JSON.parse(r.TimesAvailable);   //Parses to JSON object for TimesAvailable

                                content += '<tr><td style="text-align: center; width:175px"><input type="text" id="' + r.Name + '-row" value="' + r.Name + '" readonly></td>';
                                
                                //Addiing check box for each time
                                for(var i = 0; i < adminTimes.length; i++){ // Iterating over adminTimes length
                                    // Checks what availability is set to 
                                    if(times[`${adminTimes[i]}`]) { 
                                        content += '<td style="text-align: left"><input type="checkbox" id="' + r.Name + 'Box' + i + '" name="' + r.Name + 'Box' + i + '" checked="checkced"></td>';
                                    } else {
                                        content += '<td style="text-align: left"><input type="checkbox" id="' + r.Name + 'Box' + i + '" name="' + r.Name + 'Box' + i + '"></td>'; 
                                    }
                                }
                                content += '</tr>';
                            }
                            
                            // Adds save availability changes btn for the save avail post form
                            content +='<tr>'
                                    +'<th></th>'
                                    +'<th colspan="10"><button type="submit" id="save-avail-btn">Save Availability Changes</button></th>'
                                    +'</tr></form></table></div>';

                            // Sends the responce content        
                            res.send(content);

                        }
                    });
        conn.end();
    } else {    //Handles Login Failure
        res.redirect("/");
    }
});

//Handles changing of availability
doodle.post('/admin/availabilitychanged', (req, res) => {
    let times = [];         // Reference to times admin saves in database
    let users = [];         // Users' name + availability
    let updates = [];       // Stores updates to users aray
    let updateStr = `Update Availability Set LastUpdate = CURRENT_TIME(), TimesAvailable = (case Name `; //Unfinished String for UPDATE query

    let conn = newConnection();
    conn.connect();
     
    // Selects name, timesavailable from Availability table - Admin entry selected first
    conn.query( `select Name, TimesAvailable from Availability order by Name, case Name when "Admin" then '1' else '2' end`
            , (err,rows,fields) => {
                if (err) {
                    console.log(err);
                    conn.end();
                    res.send("Unkown Error. Update failed.");
                } else { 
                    times = JSON.parse(rows[0].TimesAvailable); //Array of admin times
                    rows.shift();                               //Shifts array to remove admin from list

                    //Iterate over user array
                    for(r of rows) {
                        users.push([r.Name, JSON.parse(r.TimesAvailable)]); // Populate array with users' name + time available
                    }
 
                    // Compares if users' available times in database match display
                    for(var i = 0; i < users.length; i++) { //Iterates over users
                        for(var j = 0; j < 10; j++) { 
                            //If index not in update array + stored available times do not match display 
                            if(!updates.includes(i) && !((req.body[`${users[i][0] + "Box" + j}`] == "on") == users[i][1][`${times[j]}`]) ) {
                                updates.push(i);
                            }  
                            // Update to user object
                            users[i][1][`${times[j]}`] = (req.body[`${users[i][0] + "Box" + j}`] == "on");
                        }
                    }
 
                    //Adding update to UPDATE query string from above
                    for(u of updates) {
                        updateStr += `When '` + users[u][0] + `' then '` + JSON.stringify(users[u][1]) + `' `;
                    }

                    updateStr += `Else (TimesAvailable) End)`;

                    //Updates database upon update
                    if (updates.length > 0) {   
                       conn.query(updateStr, (err,rows,fields) => {
                            if(err) {
                                console.log(err);
                                res.send("Error, update failed");
                            } else {
                                res.send('Time changes updated in database. Go back to view changes.');
                            }
                        })
                    } else {
                        //Update not necessary
                        res.send("No updates were necessary.");
                    }
                    conn.end();
                }
    })
});

//Handles change to admin-posted time slots
doodle.post('/admin/timechanged', (req, res) => {
    let newTimes = [];              //Holds new time values
    let duplicateError = false;     //Boolean, keeps track  of a duplicate value being set

    //Iterating over new times array to search for duplicate times
    for (var i = 0; i < 10; i++) {                          
        if(newTimes.includes(req.body[`${"t" + i}`])) {     //Checks for duplicate time
            duplicateError = true;       //Change value of duplicate error
            i = 10;                 //Break loop
        } 
        newTimes.push(req.body[`${"t" + i}`]);  //Push times into array
    }

    newTimes.sort();   //Orders times from low -> high

    //If there is no duplicate eror
    if (!duplicateError) {
        let conn = newConnection();
        conn.connect();

        //Updating TimesAvailable
        conn.query( `update Availability set LastUpdate = CURRENT_TIME(), TimesAvailable = '` + JSON.stringify(newTimes) + `' where Name = "Admin"`
                , (err,rows,fields) => {
                    if (err) {
                        console.log(err);
                        res.send("Changes failed, please retry.");  
                    } else {
                        res.send("Success! Changes made, refresh to see applied changes.");
                    }
                });
        conn.end();
    } else {
        res.send("Changes failed: DUPLICATE VALUE ENTERED, please retry.");
    }
});

//Handles guest page
doodle.get('/guest', (req, res) => {
    let conn = newConnection();
    conn.connect();
    let content = '<div><h3>Doodle App<h3></div>';

    //Query selects all names in database, admin displayed first then sorts list alphabetically
    conn.query( `select Name, TimesAvailable from Availability order by Name, case Name when "Admin" then '1' else '2' end`
            , (err,rows,fields) => {
                if (err) {
                    console.log(err);
                    res.send("Unknown Error has Occured");
                } else {
                    let adminTimes = JSON.parse(rows[0].TimesAvailable);    //Parses admin times to an array 
                    rows.shift();                                       //Removes admin from array

                    content += '<table style="min-width: 100vw; padding: 5px 15px">'
                                    +'<form method="post" action="/guest/register" style="display:table-row-group; vertical-align: middle; border-color: inherit">'
                                        +'<thead>'
                                            +'<tr>'
                                                +'<th>Name</th>';

                    //Adding table head data for each time slot
                    for(var i = 0; i < 10; i ++) {
                        content += '<th><input type="time" name="t' + i + '" value="' + adminTimes[i] + '" readonly></th>';
                    }

                    content +='</tr></thead><tbody>';

                    for(r of rows) {                                //Iterates over rows
                        let times = JSON.parse(r.TimesAvailable);   //Parsing availability to JSON object

                        content += '<tr><td style="text-align: center; width:175px"><input type="text" id="' + r.Name + '-row" name="otherNames" value="' + r.Name + '" readonly></td>';
  
                        for(var i = 0; i < adminTimes.length; i++){
                            //Adding checkbox for column with previous user entry
                            if(times[`${adminTimes[i]}`]) {
                                content += '<td style="text-align: center"><input type="checkbox" id="' + r.Name + '-box-' + i + '" checked="' + ( (times[`${adminTimes[i]}`]) ? "checked" : "") + '" onclick="return false;"></td>'; // If errors occur check here **************************************
                                 } else {
                                    content += '<td style="text-align: center"><input type="checkbox" id="' + r.Name + '-box-' + i + '" onclick="return false;"></td>';
                                } 
                        }
                        content += '</tr>';
                    }

                    content += '<tr>'
                                    +'<td style="text-align: center; width:175px">'
                                        +'<input type="text" id="guest-name" name="guestName" placeholder="Name">'
                                    +'</td>';

                    for(var i = 0; i < 10; i++) {
                        //Adding check box for guest to indicate availability
                        content += '<td style="text-align: center"><input type="checkbox" name="box' + i + '"></td>';
                    }

                    //Save button for guest
                    content += '</tr><tr><td style="text-align:center" colspan=11><button type="submit">Add Availability</button></td></tr></tbody></form></table></div>';

                    res.send(content);
                }
            });
    conn.end();
});

//Handles guest availability registration 
doodle.post('/guest/register', (req, res) => { 
    //In the case that the guest names table is empty 
    if(req.body.otherNames == null)
    {
        let conn = newConnection();
        conn.connect();

        let newAvailability = {}; //new availability object created for new guest
 
        //Adding t/f value for every time slot. Checkbox values are t/f
        for (var i = 0; i < 10; i++) {
            newAvailability[req.body[`${"t" + i}`]] = (req.body[`${"box" + i}`] === "on");
        }

        //Adding new guest to DB
        conn.query( `insert into Availability values("` + req.body.guestName + `",CURRENT_TIME(),'` + JSON.stringify(newAvailability) + `')`
                , (err,rows,fields) => {
                    if (err) {
                        console.log(err);
                        res.send("Registration failed, please retry.");
                    } else {
                        res.redirect("/guest"); //Successful registration redirects guest to /guest directory
                    }
                });
        conn.end(); 
    }
    //Makes sure no duplicated guest name
    else if (!(req.body.otherNames).includes(req.body.guestName)) {
        let conn = newConnection();
        conn.connect();

        let newAvailability = {}; //new availability object created for new guest
 
        //Adding t/f value for every time slot. Checkbox values are t/f
        for (var i = 0; i < 10; i++) {
            newAvailability[req.body[`${"t" + i}`]] = (req.body[`${"box" + i}`] === "on");
        }

        //Adding new guest to DB
        conn.query( `insert into Availability values("` + req.body.guestName + `",CURRENT_TIME(),'` + JSON.stringify(newAvailability) + `')`
                , (err,rows,fields) => {
                    if (err) {
                        console.log(err);
                        res.send("Registration failed, please retry.");
                    } else {
                        res.redirect("/guest"); //Successful registration redirects guest to /guest directory
                    }
                });
        conn.end(); 
   } else {
       res.send("Error occured: Duplicate name entered.");
   } 
});


doodle.listen(5000); //Hosting on port 5000
