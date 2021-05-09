//enable for local dev
//require("dotenv").config();

// load the things we need
var express = require("express");
var app = express();
var session = require("express-session");
const { htmlToText } = require('html-to-text');

//ensure session
app.use(
  session({
    secret: "vv0NkzAv9d",
    resave: true,
    saveUninitialized: true,
  })
);

//connect to azure db
const Pool = require("pg").Pool;
const pool = new Pool({
  user: "arihant0611@questionsbank",
  host: "questionsbank.postgres.database.azure.com",
  database: "qbdb",
  password: process.env.qbpwd,
  port: 5432,
});
pool.connect();

// set the view engine to ejs
app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// use res.render to load up an ejs view file

var db = [];

//Login page
app.get("/login", function (req, res) {
  res.render("pages/login", {
    root: __dirname,
    page_name: "login",
    error_message: "",
  });
});

app.post("/tryLog", function (req, res) {
  var username = req.body.username;
  var password = req.body.password;
  if (username && password) {
    pool.query(
      "SELECT * FROM users WHERE username = $1 AND password = $2",
      [username, password],
      (error, results) => {
        if (results.rows.length > 0) {
          req.session.loggedin = true;
          req.session.username = username;
          res.redirect("/");
        } else {
          res.render("pages/login", {
            root: __dirname,
            page_name: "login",
            error_message: "Incorrect Username or Password",
          });
        }
        res.end();
      }
    );
  } else {
    res.render("pages/login", {
      root: __dirname,
      page_name: "login",
      error_message: "Why'd u send nothing.",
    });
  }
});

app.get("/logout", function (req, res) {
  if (req.session.loggedin) req.session.loggedin = false;
  res.redirect("/login");
});
//End login page

//Index page
app.get("/", function (req, res) {
  if (req.session.loggedin) {
    pool.query("SELECT * FROM questions", (error, results) => {
      if (error) {
        throw error;
      }
      var drim = [];
      var drim2 = [];
      var tLen = 0;
      var bLen = 0;
      var x = results.rows;
      for (var i = 1; i <= 28; i++) {
        var obj = { cat: "", val: 0 };
        obj.cat = getString(i);
        obj.tot = getNumbers(i);
        obj.type = "T";
        for (var j = 0; j < x.length; j++) {
          if (x[j].category == i && x[j].type === "T") {
            obj.val++;
            tLen++;
          }
        }
        drim.push(obj);
      }

      for (var i = 1; i <= 28; i++) {
        var obj = { cat: "", val: 0 };
        obj.cat = getString(i);
        obj.tot = getNumbers(i);
        obj.type = "B";
        for (var j = 0; j < x.length; j++) {
          if (x[j].category == i && x[j].type === "B") {
            obj.val++;
            bLen++;
          }
        }
        drim2.push(obj);
      }
      res.render("pages/index", {
        root: __dirname,
        data: drim,
        bonus: drim2,
        totalT: tLen,
        totalB: bLen,
        page_name: "index",
      });
    });
  } else {
    res.render("pages/login", {
      root: __dirname,
      page_name: "login",
      error_message: "You must be logged in.",
    });
  }
});
//End index page

//Start of data page
app.get("/data", function (req, res) {
  if (req.session.loggedin) {
    pool.query("SELECT * FROM questions", (error, results) => {
      if (error) {
        throw error;
      }
      var x = results.rows;
      x.forEach(function (i) {
        i.catName = getString(parseInt(i.category));
        var q = htmlToText(i.question);
        var lines = q.split(/[^\.!\?]+[\.!\?]+["']?|\s*$/g).filter(Boolean).length;
        i.lines = lines;
      }); 
      res.render("pages/data", { root: __dirname, data: x, page_name: "data" });
    });
  } else {
    res.render("pages/login", {
      root: __dirname,
      page_name: "login",
      error_message: "You must be logged in.",
    });
  }
});
//End of data page

//Start of logs page
app.get("/logs", function (req, res) {
  if (req.session.loggedin) {
    pool.query("SELECT * FROM updates", (error, results) => {
      if (error) {
        throw error;
      }
      var x = results.rows;
      res.render("pages/logs", { root: __dirname, data: x, page_name: "logs" });
    });
  } else {
    res.render("pages/login", {
      root: __dirname,
      page_name: "login",
      error_message: "You must be logged in.",
    });
  }
});

//End of logs page

//CRUD Operations on questions table
app.post("/handler", async function (req, res) {
  const dat = req.body;

  var done = await insertNewQuestion(
    dat.key,
    dat.Question,
    dat.category,
    dat.type,
    0,
    req.session.username
  );

  var last = await selectAllQuestions();
  var row = last[last.length - 1];

  var type = "Added";
  var bef = "";
  var qid = parseInt(row.id);
  var aft = dat.Question;

  pool.query(
    "INSERT INTO updates (qid, type, bef, aft, username) VALUES ($1, $2, $3, $4, $5)",
    [qid, type, bef, aft, req.session.username],
    (error, results) => {
      if (error) {
        throw error;
      }
    }
  );

  res.redirect("/");
});

async function insertNewQuestion(
  key,
  Question,
  category,
  type,
  approval,
  username
) {
  try {
    const res = await pool.query(
      "INSERT INTO questions (key, question, category, type, approval, username) VALUES ($1, $2, $3, $4, $5, $6)",
      [key, Question, category, type, approval, username]
    );
    return res;
  } catch (err) {
    return err.stack;
  }
}

app.post("/update", async function (req, res) {
  const dat = req.body;

  var prev = await selectQuestion(dat.idHold);
  var row = prev[0];

  var type = "Updated";
  var bef = row.question;
  var qid = row.id;
  var aft = dat.Question;

  pool.query(
    "INSERT INTO updates (qid, type, bef, aft, username) VALUES ($1, $2, $3, $4, $5)",
    [qid, type, bef, aft, req.session.username],
    (error, results) => {
      if (error) {
        throw error;
      }
    }
  );

  pool.query(
    "UPDATE questions SET question = $1, approval = $2, category = $3 WHERE id = $4",
    [dat.Question, dat.App, dat.category, dat.idHold],
    (error, results) => {
      if (error) {
        throw error;
      }
    }
  );

  res.redirect("/data");
});

app.post("/delete", async function (req, res) {
  const dat = req.body;

  var prev = await selectQuestion(dat.deleteId);
  var row = prev[0];

  var type = "Deleted";
  var bef = row.question;
  var qid = row.id;
  var aft = "";

  pool.query(
    "INSERT INTO updates (qid, type, bef, aft, username) VALUES ($1, $2, $3, $4, $5)",
    [qid, type, bef, aft, req.session.username],
    (error, results) => {
      if (error) {
        throw error;
      }
    }
  );

  pool.query(
    "DELETE FROM questions WHERE id = $1",
    [dat.deleteId],
    (error, results) => {
      if (error) {
        throw error;
      }
    }
  );
  res.redirect("/data");
});
//end CRUD on questions

// writing page page
app.get("/writer", function (req, res) {
  if (req.session.loggedin) {
    pool.query("SELECT * FROM answers", (error, results) => {
      if (error) {
        throw error;
      }
      var x = results.rows;
      db = x;
      res.render("pages/writer", {
        root: __dirname,
        data: db,
        matchAns: [{}],
        Clues: [{}],
        page_name: "writer",
      });
    });
  } else {
    res.render("pages/login", {
      root: __dirname,
      page_name: "login",
      error_message: "You must be logged in.",
    });
  }
});

app.post("/searchAnswer", function (req, res) {
  const dat = req.body;
  pool.query(
    "SELECT * FROM answers WHERE UPPER(answer) LIKE UPPER('%'||$1||'%')",
    [dat.answerText],
    (error, results) => {
      if (error) {
        throw error;
      }
      var x = results.rows;
      res.render("pages/writer", {
        root: __dirname,
        data: db,
        matchAns: x,
        Clues: [{}],
        page_name: "writer",
      });
    }
  );
});

app.post("/searchClues", async function (req, res) {
  var a = req.body.ansId;
  a = JSON.parse(a);
  var clues = [];
  for (var i = 0; i < a.length; i++) {
    var m = a[i];
    var result = await selectClues(m);
    for (var r in result) {
      clues.push(result[r]);
    }
  }
  var firstLines = clues.filter((p) => p.line == 0);
  var midLines = clues.filter((p) => p.line != -1);
  midLines = midLines.filter((p) => p.line != 0);

  var lastLines = clues.filter((p) => p.line == -1);
  var allClues = [];
  allClues.push(firstLines);
  allClues.push(midLines);
  allClues.push(lastLines);
  res.render("pages/writer", {
    root: __dirname,
    data: db,
    matchAns: [{}],
    Clues: allClues,
    page_name: "writer",
  });
});

app.post("/generateQuestion", function (req, res) {
  var question =
    JSON.parse(req.body.first) +
    " " +
    JSON.parse(req.body.mid) +
    " " +
    JSON.parse(req.body.last);
  res.render("pages/writer", {
    root: __dirname,
    data: db,
    matchAns: [{}],
    Clues: [{}],
    question: question,
    page_name: "writer",
  });
});

//obscure functions
function getNumbers(num) {
  switch (num) {
    //Science
    case 1:
      return 8;
      break;
    case 2:
      return 8;
      break;
    case 3:
      return 8;
      break;
    case 4:
      return 4;
      break;
    case 5:
      return 2;
      break;
    case 6:
      return 4;
      break;
    case 7:
      return 2;
      break;
    //Literature
    case 8:
      return 10;
      break;
    case 9:
      return 6;
      break;
    case 10:
      return 8;
      break;
    case 11:
      return 4;
      break;
    case 12:
      return 4;
      break;
    case 13:
      //Fine arts
      return 8;
      break;
    case 14:
      return 8;
      break;
    case 15:
      return 8;
      break;
    //RMPSS
    case 16:
      return 6;
      break;
    case 17:
      return 6;
      break;
    case 18:
      return 3;
      break;
    case 19:
      return 4;
      break;
    case 20:
      return 2;
      break;
    case 21:
      return 1;
      break;
    //History
    case 22:
      return 8;
      break;
    case 23:
      return 8;
      break;
    case 24:
      return 4;
      break;
    case 25:
      return 12;
      break;
    //Other
    case 26:
      return 6;
      break;
    case 27:
      return 5;
      break;
    case 28:
      return 5;
      break;
  }
}

function getString(num) {
  switch (num) {
    //Science
    case 1:
      return "Biology";
      break;
    case 2:
      return "Chemistry";
      break;
    case 3:
      return "Physics";
      break;
    case 4:
      return "Math";
      break;
    case 5:
      return "Astronomy";
      break;
    case 6:
      return "Computer Science";
      break;
    case 7:
      return "Earth, Ocean and Atmospheric Science";
      break;
    //Literature
    case 8:
      return "Long Fiction";
      break;
    case 9:
      return "Drama";
      break;
    case 10:
      return "Poetry";
      break;
    case 11:
      return "Short Fiction";
      break;
    case 12:
      return "Other";
      break;
    case 13:
      //Fine arts
      return "Painting and Sculpture";
      break;
    case 14:
      return "Classical Music";
      break;
    case 15:
      return "Other";
      break;
    //RMPSS
    case 16:
      return "Religion";
      break;
    case 17:
      return "Mythology";
      break;
    case 18:
      return "Philosophy";
      break;
    case 19:
      return "Econ";
      break;
    case 20:
      return "Psych";
      break;
    case 21:
      return "Other";
      break;
    //History
    case 22:
      return "US History";
      break;
    case 23:
      return "European History";
    case 24:
      return "European Ancient";
    case 25:
      return "World History";
    //Other
    case 26:
      return "Geography";
      break;
    case 27:
      return "Popular Culture";
      break;
    case 28:
      return "Current Events";
      break;
    default:
      return "Something";
  }
}
//end obscure functions

async function selectAllQuestions() {
  try {
    const res = await pool.query("SELECT * FROM questions");
    return res.rows;
  } catch (err) {
    return err.stack;
  }
}

async function selectQuestion(m) {
  try {
    const res = await pool.query("SELECT * FROM questions where id = $1", [m]);
    return res.rows;
  } catch (err) {
    return err.stack;
  }
}

async function selectClues(m) {
  try {
    const res = await pool.query("SELECT * FROM clues WHERE answer_id = $1", [
      m,
    ]);
    return res.rows;
  } catch (err) {
    return err.stack;
  }
}
//done with all things writing

app.listen(process.env.PORT || 3000, () => console.log("Server is running..."));
