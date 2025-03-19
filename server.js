require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./db');
const Student = require('./models/Student');
const Course = require('./models/Course');
const { getStudentCourses } = require('./controllers/courseController');
const { getStudentById } = require('./controllers/studentController');

const app = express();

// Middlewares
app.use(express.json());
app.use(bodyParser.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5500', // URL exacta del frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],

  credentials: true // ← Permitir cookies
}));
app.use(express.static(path.join(__dirname, 'assets', 'css')));
app.use(express.static(__dirname)); 


app.use(express.json());
// Conexión a MongoDB
connectDB();

// Configuración de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(__dirname, 'uploads/');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeFilename = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    cb(null, `${req.params.id}-${Date.now()}-${safeFilename}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
});

// Middleware de validación de estudiante
const validateStudentId = async (req, res, next) => {
  try {
      const { id } = req.params;
      
      // Validar formato del ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ 
              success: false,
              error: "ID de estudiante inválido" 
          });
      }

      // Buscar estudiante y poblar datos
      const student = await Student.findById(id)

      if (!student) {
          return res.status(404).json({ 
              success: false,
              error: "Estudiante no encontrado" 
          });
      }

      req.student = student;
      next();
  } catch (error) {
      res.status(500).json({ 
          success: false,
          error: "Error de servidor al validar estudiante" 
      });
  }
};

// Middleware para validar IDs 
app.param('id', (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  next();
});

// Rutas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Autenticación
app.post('/api/register', async (req, res) => {
  try {
    const { nombre, email, matricula, password } = req.body;
    
    if (await Student.findOne({ $or: [{ email }, { matricula }] })) {
      return res.status(400).json({ error: 'El estudiante ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const newStudent = await Student.create({ 
      nombre, 
      email, 
      matricula, 
      password: hashedPassword 
    });

    res.status(201).json({
      id: newStudent._id,
      nombre: newStudent.nombre,
      email: newStudent.email
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en el registro' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const student = await Student.findOne({ email });
    
    if (!student || !(await bcrypt.compare(password, student.password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    res.json({
      id: student._id,
      nombre: student.nombre,
      cursos: student.cursos
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en el login' });
  }
});

// Rutas de estudiante
app.get('/api/students/:id', validateStudentId, getStudentById);
app.get('/api/students/:id/courses', validateStudentId, getStudentCourses);

// Gestión de tareas
app.post('/api/students/:id/tareas', validateStudentId, upload.single('archivo'), async (req, res) => {
  try {
    const { titulo, descripcion, cursoId, fecha_entrega } = req.body;
    
    if (!req.student.cursos.some(c => c.equals(cursoId))) {
      return res.status(400).json({ error: 'No estás matriculado en este curso' });
    }

    req.student.tareas.push({
      titulo,
      descripcion,
      curso: cursoId,
      fecha_entrega: new Date(fecha_entrega),
      archivo: req.file.path,
      fecha_entrega_real: new Date()
    });

    await req.student.save();
    res.status(201).json({ message: 'Tarea entregada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/students/:id/tareas', validateStudentId, (req, res) => {
  res.json(req.student.tareas);
});

// Matricular estudiante en curso
app.post('/api/students/:studentId/cursos', async (req, res) => {
  try {
      const { studentId } = req.params;
      const { cursoId } = req.body;

      // Validar existencia de estudiante y curso
      const student = await Student.findById(studentId);
      const course = await Course.findById(cursoId);

      if (!student || !course) {
          return res.status(404).json({ error: 'Estudiante o curso no encontrado' });
      }

      // Verificar si ya está matriculado
      if (student.cursos.includes(cursoId)) {
          return res.status(400).json({ error: 'Ya estás matriculado en este curso' });
      }

      // Añadir curso al estudiante
      student.cursos.push(cursoId);
      await student.save();

      // Añadir estudiante al curso
      course.estudiantes.push(studentId);
      await course.save();

      res.json({ success: true });

  } catch (error) {
      res.status(500).json({ error: 'Error en matrícula' });
  }
});


// Gestión de cursos
app.get('/api/cursos/:id', async (req, res) => {
  try {
    console.log('Buscando curso ID:', req.params.id); 
    const curso = await Course.findById(req.params.id)
      .populate('estudiantes', 'nombre matricula')
      .populate('tareas', 'titulo fecha_entrega');

    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    res.json({
      _id: curso._id,
      nombre: curso.nombre,
      codigo: curso.codigo,
      descripcion: curso.descripcion,
      profesor: curso.profesor,
      horario: curso.horario,
      total_estudiantes: curso.estudiantes.length,
      tareas_pendientes: curso.tareas.length
    });
  } catch (error) {
    console.error('Error en GET /api/cursos/:id:', error);
    res.status(500).json({ error: 'Error obteniendo curso' });
  }
});

//crear nuevos cursos
app.get('/api/cursos', async (req, res) => {
  try {
    const cursos = await Course.find()
      .select('_id nombre codigo profesor horario')
      .lean();
    
     if (!cursos.length) {
      return res.json({
        success: true,
        data: [] // Devuelve array vacío en lugar de error 404
      });
     }

     res.json({
      success: true,
      data: cursos
    });
  } catch (error) {
    console.error("Error al obtener cursos:", error);
    res.status(500).json({
      success: false,
      error: "Error obteniendo cursos"
    });
  }
});


// Obtener el horario del estudiante
app.get('/api/students/:id/horario', validateStudentId, async (req, res) => {
  try {
    // Si el estudiante ya tiene un horario personalizado, lo devolvemos
    if (req.student.horarioPersonalizado && req.student.horarioPersonalizado.length > 0) {
      return res.json({
        success: true,
        data: req.student.horarioPersonalizado
      });
    }

    // Si no tiene un horario personalizado, creamos uno predeterminado basado en sus cursos
    const horarioPredeterminado = [
      { hora: "08:00 - 09:30", lunes: "", martes: "", miercoles: "", jueves: "", viernes: "" },
      { hora: "09:30 - 11:00", lunes: "", martes: "", miercoles: "", jueves: "", viernes: "" },
      { hora: "11:00 - 12:30", lunes: "", martes: "", miercoles: "", jueves: "", viernes: "" },
      { hora: "12:30 - 14:00", lunes: "", martes: "", miercoles: "", jueves: "", viernes: "" },
      { hora: "14:00 - 15:30", lunes: "", martes: "", miercoles: "", jueves: "", viernes: "" }
    ];

    // Obtenemos los cursos del estudiante
    const cursosDelEstudiante = await Course.find({ _id: { $in: req.student.cursos } });
    
    // Rellenamos el horario con los cursos del estudiante
    cursosDelEstudiante.forEach(curso => {
      // Verificamos si existe el horario como objeto
      if (curso.horario && typeof curso.horario === 'object') {
        // Procesamos cada día del horario
        if (Array.isArray(curso.horario.dias)) {
          curso.horario.dias.forEach(dia => {
            // Formateamos la hora
            const horaFormateada = `${curso.horario.horaInicio} - ${curso.horario.horaFin}`;
            
            // Buscamos la fila correspondiente a esa hora
            const filaHorario = horarioPredeterminado.find(h => h.hora === horaFormateada);
            if (filaHorario) {
              // Asignamos el curso al día correspondiente
              const diaLower = dia.toLowerCase();
              if (diaLower === 'lunes') filaHorario.lunes = curso.nombre;
              else if (diaLower === 'martes') filaHorario.martes = curso.nombre;
              else if (diaLower === 'miércoles' || diaLower === 'miercoles') filaHorario.miercoles = curso.nombre;
              else if (diaLower === 'jueves') filaHorario.jueves = curso.nombre;
              else if (diaLower === 'viernes') filaHorario.viernes = curso.nombre;
            }
          });
        }
      } else if (curso.horario && typeof curso.horario === 'string') {
        // Compatibilidad con versión anterior si el horario es un string
        const partes = curso.horario.split(' ');
        if (partes.length >= 3) {
          const dia = partes[0].toLowerCase();
          const hora = partes.slice(1).join(' ');
          
          // Buscamos la fila correspondiente a esa hora
          const filaHorario = horarioPredeterminado.find(h => h.hora === hora);
          if (filaHorario) {
            // Asignamos el curso al día correspondiente
            if (dia === 'lunes') filaHorario.lunes = curso.nombre;
            else if (dia === 'martes') filaHorario.martes = curso.nombre;
            else if (dia === 'miércoles' || dia === 'miercoles') filaHorario.miercoles = curso.nombre;
            else if (dia === 'jueves') filaHorario.jueves = curso.nombre;
            else if (dia === 'viernes') filaHorario.viernes = curso.nombre;
          }
        }
      }
    });

    // Guardamos el horario predeterminado en el estudiante
    req.student.horarioPersonalizado = horarioPredeterminado;
    await req.student.save();

    res.json({
      success: true,
      data: horarioPredeterminado
    });
  } catch (error) {
    console.error('Error al obtener horario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener horario'
    });
  }
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const port = process.env.PORT || 5500;
app.listen(port, () => {
  console.log(`🚀 Servidor activo en http://localhost:${port}`);
});