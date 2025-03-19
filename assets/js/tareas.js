document.addEventListener('DOMContentLoaded', async () => {
    const student = await loadStudentData();
    loadTasks(student.id);
});

async function loadTasks(studentId) {
    // Lógica para cargar tareas
}