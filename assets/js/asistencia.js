document.addEventListener('DOMContentLoaded', async () => {
    const calendarEl = document.getElementById('calendario');
    let currentDate = new Date();
    let calendar;
    let asistenciaData = [];
    let student = null;

    // 1. Cargar datos iniciales del estudiante
    try {
        student = await loadStudentData();
        document.getElementById('student-name').textContent = student.nombre;
        document.getElementById('student-id').textContent = `Matrícula: ${student.matricula}`;
    } catch (error) {
        mostrarError('Error al cargar datos del estudiante');
        return;
    }

    // 2. Configuración mejorada de FullCalendar
    const calendarConfig = {
        initialView: 'dayGridMonth',
        locale: 'es',
        firstDay: 1, // Lunes como primer día
        fixedWeekCount: false,
        dayMaxEvents: 3,
        eventDisplay: 'block',
        headerToolbar: {
            start: 'prev',
            center: 'title',
            end: 'next'
        },
        datesSet: handleDatesChange,
        dateClick: handleDateClick,
        eventDidMount: handleEventMount,
        loading: handleCalendarLoading
    };

    // 3. Inicialización del calendario
    calendar = new FullCalendar.Calendar(calendarEl, calendarConfig);
    calendar.render();
    updateMonthHeader();

    // 4. Controladores de eventos
    document.getElementById('prev-month').addEventListener('click', () => calendar.prev());
    document.getElementById('next-month').addEventListener('click', () => calendar.next());
    document.getElementById('btn-justificar').addEventListener('click', showJustificationModal);
    document.querySelector('.close-modal').addEventListener('click', hideJustificationModal);
    document.getElementById('formJustificacion').addEventListener('submit', handleJustificationSubmit);

    // 5. Funciones principales
    async function handleDatesChange(dateInfo) {
        currentDate = dateInfo.start;
        try {
            updateMonthHeader();
            await loadAsistenciaData();
            updateCalendarEvents();
            updateStats();
        } catch (error) {
            mostrarError('Error al actualizar el calendario');
        }
    }

    async function loadAsistenciaData() {
        try {
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();
            const response = await fetch(`/api/students/${student._id}/asistencia?month=${month}&year=${year}`);
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            asistenciaData = await response.json();
        } catch (error) {
            console.error('Error loading attendance:', error);
            throw error;
        }
    }

    function updateCalendarEvents() {
        calendar.removeAllEvents();
        const events = asistenciaData.map(createCalendarEvent);
        calendar.addEventSource(events);
        calendar.refetchEvents();
    }

    function createCalendarEvent(registro) {
        const isAsistio = registro.estado === 'asistió';
        return {
            title: isAsistio ? '✓' : '✕',
            start: registro.fecha,
            color: isAsistio ? '#2ecc71' : '#e74c3c',
            extendedProps: {
                curso: registro.curso?.nombre || 'Curso no disponible',
                justificacion: registro.justificacion || 'No justificado',
                fechaFormateada: new Date(registro.fecha).toLocaleDateString('es-ES')
            }
        };
    }

    function handleEventMount(info) {
        const tooltipContent = `
            <strong>${info.event.extendedProps.curso}</strong><br>
            <em>${info.event.extendedProps.fechaFormateada}</em><br>
            ${info.event.extendedProps.justificacion}
        `;
        new bootstrap.Tooltip(info.el, {
            title: tooltipContent,
            placement: 'top',
            html: true,
            trigger: 'hover'
        });
    }

    // 6. Mejoras en la visualización de detalles
    function handleDateClick(info) {
        const fechaSeleccionada = info.date;
        const registros = asistenciaData.filter(r => 
            new Date(r.fecha).toDateString() === fechaSeleccionada.toDateString()
        );
        
        updateDateDetails(fechaSeleccionada, registros);
    }

    function updateDateDetails(date, registros) {
        document.getElementById('fecha-seleccionada').textContent = 
            date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        const lista = document.getElementById('lista-faltas');
        lista.innerHTML = registros.length > 0 
            ? registros.map(createFaltaItem).join('')
            : '<p class="text-muted">No hay registros para esta fecha</p>';
    }

    function createFaltaItem(registro) {
        const isJustificado = !!registro.justificacion;
        return `
            <div class="falta-item ${registro.estado} ${isJustificado ? 'justificado' : ''}">
                <div class="falta-header">
                    <span class="curso">${registro.curso?.nombre || 'Curso no disponible'}</span>
                    <span class="badge bg-${registro.estado === 'asistió' ? 'success' : 'danger'}">
                        ${registro.estado.toUpperCase()}
                    </span>
                </div>
                ${isJustificado ? `
                    <div class="justificacion">
                        <p>${registro.justificacion}</p>
                        ${registro.comprobante ? '<small>Comprobante adjunto</small>' : ''}
                    </div>` : ''
                }
            </div>
        `;
    }

    // 7. Mejoras en estadísticas
    function updateStats() {
        const totalClases = asistenciaData.length;
        const asistencias = asistenciaData.filter(r => r.estado === 'asistió').length;
        const faltas = totalClases - asistencias;
        const porcentaje = totalClases > 0 ? Math.round((asistencias / totalClases) * 100) : 0;

        document.getElementById('porcentaje-asistencia').textContent = `${porcentaje}%`;
        document.getElementById('total-faltas').textContent = faltas;
        
        // Actualizar barra de progreso
        const progressBar = document.querySelector('.attendance-progress .progress');
        if (progressBar) {
            progressBar.style.width = `${porcentaje}%`;
            progressBar.textContent = `${porcentaje}%`;
        }
    }

    // 8. Mejoras en el formulario de justificación
    async function handleJustificationSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div> Enviando...';
            
            const formData = new FormData(form);
            const fecha = formData.get('fecha');
            
            if (!isValidDate(fecha)) {
                throw new Error('Fecha no válida');
            }

            const response = await fetch(`/api/students/${student._id}/justificaciones`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en el servidor');
            }

            await loadAsistenciaData();
            updateCalendarEvents();
            updateStats();
            showSuccess('Justificación enviada correctamente');
            form.reset();
            hideJustificationModal();
        } catch (error) {
            mostrarError(error.message);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<span class="material-icons">send</span> Enviar Justificación';
        }
    }

    // 9. Funciones auxiliares
    function isValidDate(dateString) {
        const date = new Date(dateString);
        return !isNaN(date.getTime()) && date <= new Date();
    }

    function updateMonthHeader() {
        document.getElementById('current-month').textContent = 
            currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
    }

    function handleCalendarLoading(isLoading) {
        const loadingElement = document.getElementById('cargandoCursos');
        loadingElement.style.display = isLoading ? 'block' : 'none';
    }

    function showJustificationModal() {
        document.getElementById('fecha-falta').valueAsDate = new Date();
        document.getElementById('justificarModal').style.display = 'block';
    }

    function hideJustificationModal() {
        document.getElementById('justificarModal').style.display = 'none';
    }

    // 10. Mejoras en el manejo de errores
    function mostrarError(mensaje) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show';
        errorDiv.role = 'alert';
        errorDiv.innerHTML = `
            <span class="material-icons">error</span>
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.prepend(errorDiv);
        
        setTimeout(() => {
            errorDiv.classList.add('fade');
            setTimeout(() => errorDiv.remove(), 150);
        }, 5000);
    }

    function showSuccess(mensaje) {
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success alert-dismissible fade show';
        successDiv.role = 'alert';
        successDiv.innerHTML = `
            <span class="material-icons">check_circle</span>
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.prepend(successDiv);
        
        setTimeout(() => {
            successDiv.classList.add('fade');
            setTimeout(() => successDiv.remove(), 150);
        }, 3000);
    }

    // Función para cargar datos del estudiante
    async function loadStudentData() {
        const studentId = localStorage.getItem('studentId');
        if (!studentId || !/^[0-9a-fA-F]{24}$/.test(studentId)) {
            window.location.href = 'index.html';
            throw new Error('ID de estudiante inválido');
        }
        
        const response = await fetch(`/api/students/${studentId}`);
        if (!response.ok) throw new Error('Error al cargar datos del estudiante');
        return await response.json();
    }
});