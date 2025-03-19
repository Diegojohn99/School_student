exports.getStudentCourses = async (req, res) => {
    try {
        const student = req.student;
        
        // Poblar incluyendo el _id y usando promesas explícitas
        await student.populate({
            path: 'cursos',
            select: '_id nombre codigo profesor horario', 
            options: { strictPopulate: false }
        })

        res.json({
            success: true,
            data: student.cursos // Enviar formato estandarizado
        });
        
    } catch (error) {
        console.error('[⚠️ Error] Cursos:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo cursos (Código: SVC-200)',
            details: error.message // ← Mensaje detallado para depuración
        });
    }
};