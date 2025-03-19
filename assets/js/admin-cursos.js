document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formCrearCurso');
    const modal = document.getElementById('crearCursoModal');
    const btnAbrirModal = document.getElementById('btnNuevoCurso');

    // Abrir modal
    btnAbrirModal.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    // Enviar formulario
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const cursoData = {
            nombre: document.getElementById("cursoNombre").value.trim(),
            codigo: document.getElementById("cursoCodigo").value.trim(),
            profesor: document.getElementById("cursoProfesor").value.trim(),
            horario: document.getElementById("cursoHorario").value.trim(),
            descripcion: document.getElementById("cursoDescripcion").value.trim()
        };
    
        try {
            const response = await fetch("/api/cursos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cursoData)
            });
    
            const data = await response.json();
    
            if (!response.ok) {
                throw new Error(data.error || "Error desconocido");
            }
    
            alert(`Curso creado exitosamente! ID: ${data._id}`); // Mostrar ID generado
            form.reset();
            modal.style.display = "none";
    
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    // Cerrar modal
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    });
});