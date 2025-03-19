document.addEventListener('DOMContentLoaded', async () => {
    // Elementos del DOM
    const modal = document.getElementById('uploadModal');
    const closeBtn = modal.querySelector('.close');
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('archivoTarea');
    const openModalBtn = document.querySelector('.btn-submit'); // Botón de Nueva Entrega
    const scheduleBody = document.getElementById('schedule-body');
    const saveScheduleBtn = document.getElementById('saveScheduleBtn');

    // Variables de estado
    let studentId = null;
    let cachedStudentData = null;

    // Validar ID del estudiante desde localStorage o URL
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
            return null;
        }
        
        localStorage.setItem('studentId', id);
        return id;
    };

    // Función para mostrar errores
    const showError = (message) => {
        alert(`Error: ${message}`);
        console.error(message);
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
            
            // Guardar para uso posterior
            cachedStudentData = data;
            
            return data;
        } catch (error) {
            showError(error.message);
        }
    };

    // Cargar horario del estudiante
    const cargarHorario = async () => {
        try {
            // Mostrar un indicador de carga
            scheduleBody.innerHTML = '<tr><td colspan="6" class="text-center">Cargando horario...</td></tr>';
            
            const response = await fetch(`/api/students/${studentId}/horario`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al cargar el horario');
            }
            
            const { success, data } = await response.json();
            
            if (!success || !Array.isArray(data)) {
                throw new Error('Formato de respuesta inválido');
            }
            
            // Limpiar el tbody
            scheduleBody.innerHTML = '';
            
            // Crear las filas del horario
            data.forEach(horario => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${horario.hora}</td>
                    <td contenteditable="true">${horario.lunes || ''}</td>
                    <td contenteditable="true">${horario.martes || ''}</td>
                    <td contenteditable="true">${horario.miercoles || ''}</td>
                    <td contenteditable="true">${horario.jueves || ''}</td>
                    <td contenteditable="true">${horario.viernes || ''}</td>
                `;
                scheduleBody.appendChild(row);
            });
            
            // Si no hay horario, creamos filas predeterminadas
            if (data.length === 0) {
                const horasDefault = ["08:00 - 09:30", "09:30 - 11:00", "11:00 - 12:30", "12:30 - 14:00", "14:00 - 15:30"];
                horasDefault.forEach(hora => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${hora}</td>
                        <td contenteditable="true"></td>
                        <td contenteditable="true"></td>
                        <td contenteditable="true"></td>
                        <td contenteditable="true"></td>
                        <td contenteditable="true"></td>
                    `;
                    scheduleBody.appendChild(row);
                });
            }
        } catch (error) {
            console.error('Error cargando horario:', error);
            scheduleBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error al cargar el horario</td></tr>';
        }
    };
    
    // Guardar cambios del horario
    const guardarHorario = async () => {
        try {
            // Obtener y validar los datos
            const horarioActualizado = [];
            const rows = scheduleBody.querySelectorAll('tr');
            
            rows.forEach(row => {
                const celdas = Array.from(row.cells);
                if (celdas.length === 6) { // Asegurarnos que la fila tiene 6 celdas
                    horarioActualizado.push({
                        hora: celdas[0].textContent.trim(),
                        lunes: celdas[1].textContent.trim(),
                        martes: celdas[2].textContent.trim(),
                        miercoles: celdas[3].textContent.trim(),
                        jueves: celdas[4].textContent.trim(),
                        viernes: celdas[5].textContent.trim()
                    });
                }
            });
            
            // Mostrar un indicador de carga
            saveScheduleBtn.innerHTML = '<span class="material-icons">sync</span> Guardando...';
            saveScheduleBtn.disabled = true;
            
            // Enviar los datos al servidor
            const response = await fetch(`/api/students/${studentId}/horario`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(horarioActualizado)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al guardar el horario');
            }
            
            // Mostrar mensaje de éxito
            alert('Horario actualizado correctamente');
            
            // Restaurar el botón
            saveScheduleBtn.innerHTML = '<span class="material-icons">save</span> Guardar Cambios';
            saveScheduleBtn.disabled = false;
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar cambios: ' + error.message);
            
            // Restaurar el botón en caso de error
            saveScheduleBtn.innerHTML = '<span class="material-icons">save</span> Guardar Cambios';
            saveScheduleBtn.disabled = false;
        }
    };

    // Gestión del Modal
    const openUploadModal = () => {
        modal.style.display = 'block';
        loadCourses();
    };

    const closeModal = () => {
        modal.style.display = 'none';
        uploadForm.reset();
    };

    // Cargar cursos
    const loadCourses = async () => {
        try {
            const select = document.getElementById('cursoSelect');
            select.innerHTML = '<option value="">Selecciona un curso</option>';
            
            if (!cachedStudentData) await loadStudentData();
            
            // Obtener cursos del estudiante
            const response = await fetch(`/api/students/${studentId}/courses`);
            if (!response.ok) {
                throw new Error('Error al cargar cursos');
            }
            
            const { data: cursos } = await response.json();
            
            if (Array.isArray(cursos)) {
                cursos.forEach(curso => {
                    const option = document.createElement('option');
                    option.value = curso._id;
                    option.textContent = curso.nombre;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            showError('No se pudieron cargar los cursos');
        }
    };

    // Manejar envío de tareas
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validar archivo PDF
        if (fileInput.files[0]?.type !== 'application/pdf') {
            showError('Solo se permiten archivos PDF');
            return;
        }

        const formData = new FormData(uploadForm);
        formData.append('fecha_entrega', new Date().toISOString());

        try {
            const response = await fetch(`/api/students/${studentId}/tareas`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error desconocido');
            }

            alert('¡Tarea entregada exitosamente!');
            closeModal();
            await loadStudentData();
        } catch (error) {
            showError(error.message);
        }
    };

    // Actualizar lista de tareas
    const refreshTasks = async () => {
        try {
            const response = await fetch(`/api/students/${studentId}/tareas`);
            if (!response.ok) {
                throw new Error('Error al cargar tareas');
            }
            
            const tareas = await response.json();
            const tasksList = document.getElementById('tasks-list');
            tasksList.innerHTML = '';
            
            if (!Array.isArray(tareas) || tareas.length === 0) {
                tasksList.innerHTML = '<li class="no-tasks">No hay tareas pendientes</li>';
                return;
            }
            
            tareas.forEach(tarea => {
                const li = document.createElement('li');
                li.className = 'task-item';
                li.innerHTML = `
                    <div>
                        <h4>${tarea.titulo}</h4>
                        <p>${tarea.descripcion || 'Sin descripción'}</p>
                        <small>Curso: ${tarea.curso}</small>
                    </div>
                    <div class="task-meta">
                        <span class="due-date">${new Date(tarea.fecha_entrega).toLocaleDateString()}</span>
                        ${tarea.archivo ? 
                        `<a href="${tarea.archivo}" download class="download-btn">
                            <span class="material-icons">download</span>
                        </a>` : ''}
                    </div>
                `;
                tasksList.appendChild(li);
            });
            
            // Actualizar contador de tareas
            document.getElementById('pending-tasks').textContent = tareas.filter(
                t => t.estado !== 'entregado'
            ).length;
        } catch (error) {
            console.error('Error cargando tareas:', error);
        }
    };

    // Inicializar la página
    const init = async () => {
        try {
            // Obtener ID del estudiante
            studentId = getStudentId();
            if (!studentId) return;
            
            // Cargar datos del estudiante
            await loadStudentData();
            
            // Cargar horario
            await cargarHorario();
            
            // Cargar tareas
            await refreshTasks();
            
            // Configurar evento para guardar horario
            saveScheduleBtn.addEventListener('click', guardarHorario);
            
            // Configurar eventos para el modal
            closeBtn.addEventListener('click', closeModal);
            window.addEventListener('click', (e) => e.target === modal && closeModal());
            uploadForm.addEventListener('submit', handleSubmit);
            
            if (openModalBtn) {
                openModalBtn.addEventListener('click', openUploadModal);
            }
        } catch (error) {
            console.error('Error durante la inicialización:', error);
            showError('Error al cargar la página');
        }
    };

    // Iniciar la aplicación
    init();
});