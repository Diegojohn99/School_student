document.addEventListener('DOMContentLoaded', async () => {
    // Elementos del DOM
    const matriculaModal = document.getElementById('matriculaModal');
    const detalleCursoModal = document.getElementById('detalleCursoModal');
    const closeModals = document.querySelectorAll('.close-modal');
    const formMatricula = document.getElementById('formMatricula');
    const listaCursos = document.getElementById('listaCursos');
    const btnMatricular = document.getElementById('btnMatricular');
    const cargandoCursos = document.getElementById('cargandoCursos');
    
    // Variables de estado
    let studentId = null;

    // Función para mostrar errores
    const showError = (message) => {
        alert(`Error: ${message}`);
        console.error(message);
    };

    // Obtener ID del estudiante de la URL o localStorage
    const getStudentId = () => {
        // Intentar obtener de localStorage primero
        let id = localStorage.getItem('studentId');
        
        // Si no existe, intentar de la URL
        if (!id) {
            const urlParams = new URLSearchParams(window.location.search);
            id = urlParams.get('id');
        }
        
        // Validar formato
        if (!id || !/^[a-f\d]{24}$/i.test(id)) {
            localStorage.removeItem('studentId');
            window.location.href = 'index.html';
            throw new Error('ID inválido');
        }
        
        localStorage.setItem('studentId', id);
        return id;
    };

    // Cargar datos del estudiante
    const loadStudentData = async () => {
        try {
            const response = await fetch(`/api/students/${studentId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al cargar datos del estudiante');
            }
            const data = await response.json();
            
            // Actualizar la UI con el nombre del estudiante
            document.getElementById('student-name').textContent = data.nombre || 'Estudiante';
            document.getElementById('student-id').textContent = data.matricula || '';
            
            return data;
        } catch (error) {
            showError(error.message);
        }
    };

    // Cargar cursos del estudiante
    const loadCursos = async () => {
        try {
            const response = await fetch(`/api/students/${studentId}/courses`);
            
            // Verificar si la respuesta es OK antes de desestructurar
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Error al cargar cursos");
            }
    
            const responseData = await response.json(); // Obtener datos completos
            
            // Validar estructura de la respuesta
            if (!responseData.success || !Array.isArray(responseData.data)) {
                throw new Error("Formato de respuesta inválido");
            }
    
            renderCourses(responseData.data); // Usar responseData.data
            return responseData.data;
        } catch (error) {
            showError(error.message);
            console.error("Error en loadCursos:", error);
            // En caso de error, mostrar interfaz vacía
            renderCourses([]);
        }
    };

    // Renderizar cursos
    const renderCourses = (courses) => {
        const container = document.getElementById('cursosContainer');
        container.innerHTML = ""; // Limpiar contenedor
    
        if (!courses || courses.length === 0) {
            container.innerHTML = `
                <div class="no-courses">
                    <span class="material-icons">class</span>
                    <p>No estás matriculado en ningún curso</p>
                </div>
            `;
            return;
        }
    
        // Crear elementos con innerHTML (más eficiente)
        const cursosHTML = courses.map(curso => `
            <div class="curso-card" data-course-id="${curso._id}">
                <div class="curso-header">
                    <h3>${curso.nombre}</h3>
                    <span class="curso-codigo">${curso.codigo}</span>
                </div>
                <div class="curso-body">
                    <p class="course-info">
                        <span class="material-icons">person</span> ${curso.profesor}
                    </p>
                    <p class="course-schedule">
                        <span class="material-icons">schedule</span> ${curso.horario}
                    </p>
                </div>
                <button class="btn-detalle" data-course-id="${curso._id}">
                    <span class="material-icons">info</span> Detalles
                </button>
            </div>
        `).join('');
    
        container.innerHTML = cursosHTML; // Renderizar todo de una vez
        
        // Configurar eventos para los botones de detalle
        document.querySelectorAll('.btn-detalle').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const courseId = e.currentTarget.getAttribute('data-course-id');
                await mostrarDetalleCurso(courseId);
            });
        });
    };

    // Cargar cursos disponibles para matrícula
    const cargarCursosDisponibles = async () => {
        try {
            if (cargandoCursos) cargandoCursos.style.display = 'block';
            
            // Usar la URL correcta
            const response = await fetch('/api/cursos');
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al cargar cursos disponibles');
            }
            
            const data = await response.json();
            const cursos = Array.isArray(data) ? data : (data.data || []);
            
            // Limpiar y poblar el select correctamente
            listaCursos.innerHTML = '<option value="" disabled selected>Selecciona un curso</option>';
            
            if (cursos.length === 0) {
                const option = document.createElement('option');
                option.disabled = true;
                option.textContent = 'No hay cursos disponibles';
                listaCursos.appendChild(option);
            } else {
                cursos.forEach(curso => {
                    // Verificar que el curso tenga las propiedades necesarias
                    if (curso && curso._id && curso.nombre) {
                        const option = document.createElement('option');
                        option.value = curso._id;
                        option.textContent = `${curso.codigo || 'Sin código'} - ${curso.nombre}`;
                        listaCursos.appendChild(option);
                    }
                });
            }
            
        } catch (error) {
            showError(`Error al cargar cursos disponibles: ${error.message}`);
        } finally {
            if (cargandoCursos) cargandoCursos.style.display = 'none';
        }
    };

    // Funciones para manejar modales
    const openModal = (modal) => {
        if (!modal) return;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    };

    const closeModal = (modal) => {
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    // Configurar eventos
    const setupEventListeners = () => {
        // Abrir modal y cargar cursos
        if (btnMatricular) {
            btnMatricular.addEventListener('click', async () => {
                openModal(matriculaModal);
                await cargarCursosDisponibles();
            });
        }

        // Cerrar modales
        closeModals.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) closeModal(modal);
            });
        });

        // Clic fuera del modal
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeModal(e.target);
            }
        });

        // Enviar formulario
        if (formMatricula) {
            formMatricula.addEventListener('submit', async (e) => {
                e.preventDefault();
                const cursoId = listaCursos.value;
                
                if (!cursoId) {
                    alert('Por favor selecciona un curso');
                    return;
                }
                
                try {
                    if (!studentId) {
                        throw new Error('Debes iniciar sesión para matricularte');
                    }
            
                    // Realizar petición para matricular al estudiante
                    const response = await fetch(`/api/students/${studentId}/cursos`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ cursoId })
                    });
            
                    const data = await response.json();
            
                    if (!response.ok) {
                        throw new Error(data.error || 'Error al procesar la matrícula');
                    }
            
                    // Cerrar modal y actualizar lista
                    alert('¡Matriculado correctamente en el curso!');
                    closeModal(matriculaModal);
                    await loadCursos(); // Recargar los cursos sin refrescar página
            
                } catch (error) {
                    console.error('Error en matrícula:', error);
                    alert(`Error: ${error.message}`);
                }
            });
        }
    };

    // Mostrar detalle del curso
    const mostrarDetalleCurso = async (courseId) => {
        try {
            // Validar ID antes de hacer fetch
            if (!courseId || !/^[a-f\d]{24}$/i.test(courseId)) {
                throw new Error('ID de curso inválido');
            }

            // Mostrar indicador de carga si existe
            const modalBody = detalleCursoModal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.innerHTML += '<div class="loading-spinner"></div>';
            }
            
            // Abrir modal primero para mejor UX
            openModal(detalleCursoModal);

            const response = await fetch(`/api/cursos/${courseId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al cargar detalles del curso');
            }
            
            const curso = await response.json();
            
            // Actualizar la información del modal
            document.getElementById('modalTitulo').textContent = curso.nombre || 'Curso';
            document.getElementById('modalProfesor').textContent = curso.profesor || 'No especificado';
            document.getElementById('modalHorario').textContent = curso.horario || 'No especificado';
            document.getElementById('modalDescripcion').textContent = curso.descripcion || 'Sin descripción';
            
            // Actualizar estadísticas si existen
            const tareasPendientes = document.getElementById('modalTareasPendientes');
            const promedio = document.getElementById('modalPromedio');
            
            if (tareasPendientes) tareasPendientes.textContent = curso.tareas_pendientes || '0';
            if (promedio) promedio.textContent = curso.promedio || 'N/A';
            
            // Quitar indicador de carga
            const spinner = detalleCursoModal.querySelector('.loading-spinner');
            if (spinner) spinner.remove();
            
        } catch (error) {
            showError(`Error al mostrar detalles: ${error.message}`);
            closeModal(detalleCursoModal);
        }
    };

    // Inicialización
    try {
        studentId = getStudentId();
        await loadStudentData();
        await loadCursos();
        setupEventListeners();
    } catch (error) {
        showError(`Error de inicialización: ${error.message}`);
    }
});