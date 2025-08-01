const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://newspaper-tg-default-rtdb.firebaseio.com"
});

const db = admin.database();
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// --- Static admin credentials ---
const ADMIN_ID = "admin";
const ADMIN_PASS = "admin123";

// --- Middleware ---
function isAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.redirect('/admin');
}

// --- Admin Auth Page ---
app.get('/admin', (req, res) => {
  res.render('adminauth', { error: null });
});
app.post('/admin', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_ID && password === ADMIN_PASS) {
    req.session.admin = true;
    res.redirect('/admindashboard');
  } else {
    res.render('adminauth', { error: 'Invalid admin credentials.' });
  }
});
app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin');
  });
});

// --- Admin Dashboard ---
app.get('/admindashboard', isAdmin, (req, res) => {
  db.ref('newspapers').once('value', (snapshot) => {
    const newspapers = snapshot.val() || {};
    const npArr = Object.entries(newspapers).map(([id, np]) => ({ id, ...np }));
    res.render('admindashboard', { newspapers: npArr });
  });
});
app.post('/admin/add', isAdmin, (req, res) => {
  const { name, date, link } = req.body;
  const newRef = db.ref('newspapers').push();
  newRef.set({ name, date, link }, () => {
    res.redirect('/admindashboard');
  });
});
app.post('/admin/edit/:id', isAdmin, (req, res) => {
  const id = req.params.id;
  const { name, date, link } = req.body;
  if (!id || !name || !date || !link) {
    return res.status(400).send('Missing fields');
  }
  db.ref('newspapers/' + id).set({ name, date, link }, (err) => {
    if (err) {
      return res.status(500).send('Update failed');
    }
    res.send('OK');
  });
});

// --- User Auth Page ---
app.get('/', (req, res) => {
  res.render('auth', { error: null });
});

// --- User Dashboard (NO isUser middleware) ---
app.get('/dashboard', (req, res) => {
  db.ref('newspapers').once('value', (snapshot) => {
    const newspapers = snapshot.val() || {};
    const npArr = Object.entries(newspapers).map(([id, np]) => ({ id, ...np }));
    res.render('dashboard', { newspapers: npArr });
  });
});

// --- Download Page (NO isUser middleware) ---
app.get('/download/:id', (req, res) => {
  const id = req.params.id;
  db.ref('newspapers/' + id).once('value', (snapshot) => {
    const newspaper = snapshot.val();
    if (!newspaper) return res.send('Not found');
    res.render('download', { newspaper: { ...newspaper, id } });
  });
});

// --- Logout (for admin only) ---
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
