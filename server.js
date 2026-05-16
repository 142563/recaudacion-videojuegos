require('dotenv').config();
const express = require('express');
const { Pool }  = require('pg');
const cors      = require('cors');
const path      = require('path');

const app  = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Crear tabla si no existe
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sesiones (
      id          BIGINT PRIMARY KEY,
      fecha       TEXT,
      hora        TEXT,
      q100        INTEGER DEFAULT 0,
      q50         INTEGER DEFAULT 0,
      q20         INTEGER DEFAULT 0,
      q10         INTEGER DEFAULT 0,
      q5          INTEGER DEFAULT 0,
      total_bills INTEGER DEFAULT 0,
      total       INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('Base de datos lista.');
}

// GET /api/sesiones — traer todas las sesiones
app.get('/api/sesiones', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM sesiones ORDER BY created_at DESC'
    );
    res.json(rows.map(row => ({
      id:          Number(row.id),
      fecha:       row.fecha,
      hora:        row.hora,
      billetes:    { 100: row.q100, 50: row.q50, 20: row.q20, 10: row.q10, 5: row.q5 },
      totalBills:  row.total_bills,
      total:       row.total
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener sesiones.' });
  }
});

// POST /api/sesiones — guardar nueva sesión
app.post('/api/sesiones', async (req, res) => {
  const { id, fecha, hora, billetes, totalBills, total } = req.body;
  try {
    await pool.query(
      `INSERT INTO sesiones (id, fecha, hora, q100, q50, q20, q10, q5, total_bills, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, fecha, hora, billetes[100]||0, billetes[50]||0, billetes[20]||0,
       billetes[10]||0, billetes[5]||0, totalBills, total]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar sesión.' });
  }
});

// PUT /api/sesiones/:id — editar sesión existente
app.put('/api/sesiones/:id', async (req, res) => {
  const { billetes, totalBills, total } = req.body;
  try {
    await pool.query(
      `UPDATE sesiones
       SET q100=$1, q50=$2, q20=$3, q10=$4, q5=$5, total_bills=$6, total=$7
       WHERE id=$8`,
      [billetes[100]||0, billetes[50]||0, billetes[20]||0,
       billetes[10]||0, billetes[5]||0, totalBills, total, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar sesión.' });
  }
});

// DELETE /api/sesiones/:id — eliminar sesión
app.delete('/api/sesiones/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sesiones WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar sesión.' });
  }
});

const PORT = process.env.PORT || 3000;
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
    console.log(`Admin:        http://localhost:${PORT}/admin.html`);
    console.log(`Datos banco:  http://localhost:${PORT}/datos-bancarios.html`);
  });
}).catch(err => {
  console.error('Error al conectar a la base de datos:', err.message);
  process.exit(1);
});
