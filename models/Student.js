const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    matricula: { type: String, required: true, unique: true },
    password: { type: String, required: true },
   cursos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
}],
    tareas: [{
        titulo: { type: String, required: true },
        descripcion: { type: String, required: true },
        curso: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Course',
            required: true 
        },
        fecha_entrega: Date,
        archivo: String,
        fecha_entrega_real: Date,
        estado: {
          type: String,
          enum: ['pendiente', 'entregado', 'calificado'],
          default: 'pendiente'
        }
      }],
      horarioPersonalizado: [{
        hora: String,
        lunes: String,
        martes: String,
        miercoles: String,
        jueves: String,
        viernes: String
      }]
});

module.exports = mongoose.model('Student', studentSchema);