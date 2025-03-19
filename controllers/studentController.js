const Student = require('../models/Student');

exports.getStudentById = async (req, res) => {
    try {
        // Devolver datos limpios y estructurados
        const studentData = {
            _id: req.student._id,
            nombre: req.student.nombre,
            email: req.student.email,
            matricula: req.student.matricula,
            cursos: req.student.cursos.map(curso => ({
                _id: curso._id,
                nombre: curso.nombre,
                codigo: curso.codigo,
                horario: curso.horario,
                profesor: curso.profesor
            })),
            tareas: req.student.tareas
        };
        res.json({ 
            success: true,
            data: {
                ...req.student.toObject(),
                password: undefined // Excluir contraseña
            }
        });
    } catch (error) {
        console.error('[⚠️ Error] Detalle:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor (Código: SVC-100)'
        });
    }
};