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
app.use(express.urlencoded({ extended: true }));
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
        res.render("pages/index", { root: __dirname, data: db, matchAns: [{}], Clues:[{}]});
      });
});

// about page
app.get('/about', function(req, res) {
    res.render('pages/about');
});

app.post('/searchAnswer', function(req, res){
    const dat = req.body;
    pool.query("SELECT * FROM answers WHERE UPPER(answer) LIKE UPPER('%'||$1||'%')",[dat.answerText],(error,results) => {
        if(error){
            throw error;
        }        
        var x = results.rows;
        res.render("pages/index",{ root: __dirname, data: db, matchAns: x, Clues:[{}]})
    });
});

app.post('/searchClues', async function(req,res){
    var a = req.body.ansId;
    a = JSON.parse(a); 
    var clues = [];
    for(var i=0;i<a.length;i++){
        var m = a[i];
        console.log(m);
        var result = await selectClues(m);
        for(var r in result){
            clues.push(result[r]);
        }
    }
    res.render("pages/index", { root: __dirname, data: db, matchAns: [{}] ,Clues: clues});
});

async function selectClues(m){
    try{
        const res = await pool.query("SELECT * FROM clues WHERE answer_id = $1", [m]);
        return res.rows;
    }catch(err){
        return err.stack;
    }
}

app.listen(80);
console.log('80 is the magic port');