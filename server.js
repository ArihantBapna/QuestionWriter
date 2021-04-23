//enable for local dev

// load the things we need
var express = require('express');
var app = express();

//connect to azure db
const Pool = require('pg').Pool
const pool = new Pool({
    user: 'arihant0611@questionsbank',
    host: 'questionsbank.postgres.database.azure.com',
    database: 'qbdb',
    password: 'Seagull1234#',
    port: 5432,
  })
pool.connect();

// set the view engine to ejs
app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');

// use res.render to load up an ejs view file

var db = [];

// index page
app.get('/', function(req, res) {
    pool.query("SELECT * FROM answers", (error, results) => {
        if (error) {
          throw error;
        }
        var x = results.rows;
        db = x;
        res.render("pages/index", { root: __dirname, data: db, matchAns: [{}]});
      });
});

// about page
app.get('/about', function(req, res) {
    res.render('pages/about');
});

app.post('/searchAnswer', function(req, res){
    const dat = req.body;
    pool.query("SELECT * FROM answers WHERE answer LIKE '%'||$1||'%'",[dat.answerText],(error,results) => {
        if(error){
            throw error;
        }        
        var x = results.rows;
        res.render("pages/index", { root: __dirname, data: db, matchAns: x})
    });
});

app.listen(80);
console.log('80 is the magic port');