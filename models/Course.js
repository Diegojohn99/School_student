// Propósito: Definir el modelo de un curso en la base de datos.
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    nombre: { type: String, required: [true, "El nombre del curso es obligatorio"] },
    codigo: { 
        type: String, 
        required: [true, "El código del curso es obligatorio"], 
        unique: true 
    },
    horario: {
        type: String, // Ej: "Lunes 08:00 - 09:30"
        required: false
    },
    // Mantén también el objeto para compatibilidad o futura migración
    horarioDetallado: {
        dias: [String], // Ej: ["Lunes", "Miércoles"]
        horaInicio: String, // Ej: "14:00"
        horaFin: String,
        aula: String
    },
    descripcion: String,  
    profesor: { type: String, required: [true, "El profesor es obligatorio"] },
    estudiantes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        validate: {
            validator: async value => {
                const student = await mongoose.model('Student').findById(value);
                return !!student;
            },
            message: 'Estudiante no existe'
        }
    }],
    tareas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    }]
});

module.exports = mongoose.model('Course', courseSchema);