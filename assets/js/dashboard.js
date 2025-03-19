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

      // Sistema de recordatorios
      const setupScheduleReminders = () => {
        // Comprobar si las notificaciones están disponibles en el navegador
        if (!("Notification" in window)) {
            console.log("Este navegador no soporta notificaciones de escritorio");
            return;
        }
        
        // Solicitar permiso para notificaciones
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            document.getElementById('enable-notifications').style.display = 'block';
        }
    };
    
    // Función para solicitar permisos de notificación
    const requestNotificationPermission = async () => {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                alert('¡Genial! Ahora recibirás recordatorios de tus clases.');
                document.getElementById('enable-notifications').style.display = 'none';
                setScheduleReminders();
            } else {
                alert('No podremos enviarte recordatorios si no aceptas los permisos.');
            }
        } catch (error) {
            console.error('Error al solicitar permisos de notificación:', error);
        }
    };
    
    // Configurar recordatorios basados en el horario
    const setScheduleReminders = () => {
        if (Notification.permission !== 'granted') return;
        
        // Obtener todas las clases del horario
        const clases = [];
        const rows = scheduleBody.querySelectorAll('tr');
        const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
        
        rows.forEach(row => {
            const celdas = Array.from(row.cells);
            if (celdas.length === 6) {
                const horario = celdas[0].textContent.trim();
                // Extraer hora de inicio del formato "08:00 - 09:30"
                const horaInicio = horario.split(' - ')[0];
                
                // Para cada día de la semana
                for (let i = 0; i < 5; i++) {
                    const nombreClase = celdas[i + 1].textContent.trim();
                    if (nombreClase) {
                        clases.push({
                            dia: diasSemana[i],
                            hora: horaInicio,
                            clase: nombreClase
                        });
                    }
                }
            }
        });
        
        // Guardar en localStorage para persistencia
        localStorage.setItem('clasesReminders', JSON.stringify(clases));
        
        // Programar próximos recordatorios
        scheduleNextReminders(clases);
    };
    
    // Programar los próximos recordatorios
    const scheduleNextReminders = (clases) => {
        // Obtener fecha actual
        const ahora = new Date();
        const diaSemanaActual = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][ahora.getDay()];
        
        // Convertir horas a minutos desde medianoche para facilitar comparación
        const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
        
        // Encontrar las próximas clases de hoy
        const clasesHoy = clases.filter(c => c.dia === diaSemanaActual);
        
        for (const clase of clasesHoy) {
            const [horas, minutos] = clase.hora.split(':').map(Number);
            const minutosClase = horas * 60 + minutos;
            
            // Si la clase es en el futuro (con 15 minutos de anticipación)
            if (minutosClase - minutosActuales > 0 && minutosClase - minutosActuales <= 15) {
                // Programar notificación
                setTimeout(() => {
                    notifyClass(clase);
                }, (minutosClase - minutosActuales - 15) * 60 * 1000); // Convertir a milisegundos
            }
        }
    };
    
    // Función para mostrar notificación
    const notifyClass = (clase) => {
        if (Notification.permission !== 'granted') return;
        
        const notification = new Notification('Recordatorio de clase', {
            icon: '/assets/img/logo.png',
            body: `Tienes ${clase.clase} en 15 minutos (${clase.hora})`,
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    };
    
    // Botón para activar notificaciones
    const setupNotificationButton = () => {
        const button = document.getElementById('enable-notifications-btn');
        if (button) {
            button.addEventListener('click', requestNotificationPermission);
        }
    };
    
    // Añadir función para exportar horario
    const setupExportSchedule = () => {
        const exportBtn = document.getElementById('export-schedule-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportSchedule);
        }
    };
    
    // Exportar horario como PDF o añadir a calendario
    const exportSchedule = async () => {
        // Obtener el horario
        const rows = scheduleBody.querySelectorAll('tr');
        const horario = [];
        
        rows.forEach(row => {
            const celdas = Array.from(row.cells);
            if (celdas.length === 6) {
                horario.push({
                    hora: celdas[0].textContent.trim(),
                    lunes: celdas[1].textContent.trim(),
                    martes: celdas[2].textContent.trim(),
                    miercoles: celdas[3].textContent.trim(),
                    jueves: celdas[4].textContent.trim(),
                    viernes: celdas[5].textContent.trim()
                });
            }
        });
        
        // Crear URL de Google Calendar para cada evento
        const calendarEvents = [];
        const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
        
        horario.forEach(fila => {
            const [horaInicio, horaFin] = fila.hora.split(' - ');
            
            // Para cada día de la semana
            diasSemana.forEach((dia, index) => {
                const nombreClase = fila[dia];
                if (nombreClase) {
                    // Calcular fecha próxima del día de la semana
                    const fechaEvento = getNextDayOfWeek(index + 1); // lunes=1, martes=2, etc.
                    
                    // Formatear fecha y hora para Google Calendar
                    const fechaInicioStr = formatDateTime(fechaEvento, horaInicio);
                    
                    // Clonar fecha y ajustar hora fin
                    const fechaFinStr = formatDateTime(fechaEvento, horaFin);
                    
                    // Crear evento
                    calendarEvents.push({
                        title: nombreClase,
                        start: fechaInicioStr,
                        end: fechaFinStr,
                        daysOfWeek: [index + 1] // 1=lunes, 2=martes, etc.
                    });
                }
            });
        });
        
        // Guardar eventos en localStorage
        localStorage.setItem('horarioEventos', JSON.stringify(calendarEvents));
        
        // Mostrar opciones de exportación
        showExportOptions(calendarEvents);
    };
    
    // Obtener el próximo día de la semana (1=lunes, 2=martes, etc.)
    const getNextDayOfWeek = (dayOfWeek) => {
        const today = new Date();
        const todayDayOfWeek = today.getDay() || 7; // Convertir 0 (domingo) a 7
        
        // Días hasta el próximo día deseado
        let daysToAdd = dayOfWeek - todayDayOfWeek;
        if (daysToAdd <= 0) daysToAdd += 7; // Si ya pasó esta semana, ir a la próxima
        
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysToAdd);
        return nextDate;
    };
    
    // Formatear fecha y hora para Google Calendar
    const formatDateTime = (date, timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const newDate = new Date(date);
        newDate.setHours(hours, minutes, 0, 0);
        return newDate.toISOString().replace(/[-:]/g, '').replace(/\.\d+/g, '');
    };
    
    // Mostrar opciones para exportar el horario
    const showExportOptions = (events) => {
        const modal = document.getElementById('exportModal');
        const exportToGoogleBtn = document.getElementById('export-to-google');
        const exportToPdfBtn = document.getElementById('export-to-pdf');
        
        if (modal) {
            modal.style.display = 'block';
            
            // Configurar botón de Google Calendar
            if (exportToGoogleBtn) {
                exportToGoogleBtn.addEventListener('click', () => {
                    // Crear eventos en Google Calendar
                    events.forEach(event => {
                        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.start}/${event.end}&recur=RRULE:FREQ=WEEKLY`;
                        window.open(url, '_blank');
                    });
                    
                    modal.style.display = 'none';
                });
            }
            
            // Configurar botón de PDF
            if (exportToPdfBtn) {
                exportToPdfBtn.addEventListener('click', () => {
                    // Generar PDF del horario
                    generateSchedulePDF();
                    modal.style.display = 'none';
                });
            }
            
            // Cerrar modal
            const closeBtn = modal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            }
        }
    };
    
    // Generar PDF del horario
    const generateSchedulePDF = () => {
        // Aquí se implementaría la generación del PDF
        // Se podría usar bibliotecas como jsPDF o simplemente crear una página optimizada para impresión
        
        // Versión simple: abrir una nueva ventana con el horario optimizado para impresión
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Mi Horario Semanal</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                    th { background-color: #f2f2f2; }
                    h1 { text-align: center; }
                    .print-header { text-align: center; margin-bottom: 20px; }
                    @media print {
                        body { margin: 0; padding: 15px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h1>Mi Horario Semanal</h1>
                    <p>Estudiante: ${document.getElementById('student-name').textContent}</p>
                    <p>Matrícula: ${document.getElementById('student-id').textContent}</p>
                </div>
                <div class="no-print" style="text-align: center; margin: 20px;">
                    <button onclick="window.print()">Imprimir/Guardar PDF</button>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Lunes</th>
                            <th>Martes</th>
                            <th>Miércoles</th>
                            <th>Jueves</th>
                            <th>Viernes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.from(scheduleBody.querySelectorAll('tr')).map(row => {
                            return `<tr>${Array.from(row.cells).map(cell => {
                                return `<td>${cell.textContent}</td>`;
                            }).join('')}</tr>`;
                        }).join('')}
                    </tbody>
                </table>
                <div class="no-print" style="text-align: center; margin: 20px;">
                    <p><small>Generado digitalmente. No es necesario imprimir.</small></p>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };
    
    // Actualizar próxima clase en el dashboard
    const updateNextClass = () => {
        try {
            // Obtener fecha y hora actual
            const ahora = new Date();
            const diaSemanaActual = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][ahora.getDay()];
            const horaActual = ahora.getHours();
            const minutosActual = ahora.getMinutes();
            
            // Convertir hora actual a minutos para facilitar comparación
            const minutosActuales = horaActual * 60 + minutosActual;
            
            // Obtener todas las clases del horario
            const rows = scheduleBody.querySelectorAll('tr');
            let proximaClase = null;
            let minDiferencia = Infinity;
            
            // Si es fin de semana o fuera de horario, buscar próxima clase de la semana siguiente
            const esFindeSemana = diaSemanaActual === 'sabado' || diaSemanaActual === 'domingo';
            
            rows.forEach(row => {
                const celdas = Array.from(row.cells);
                if (celdas.length === 6) {
                    const horario = celdas[0].textContent.trim();
                    const [horaInicio] = horario.split(' - ')[0].split(':').map(Number);
                    const minutosInicio = horaInicio * 60;
                    
                    // Índice del día actual (0=lunes, 1=martes, etc.)
                    let diaIndice;
                    if (esFindeSemana) {
                        diaIndice = 0; // Si es fin de semana, la próxima clase es el lunes
                    } else {
                        diaIndice = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].indexOf(diaSemanaActual);
                    }
                    
                    // Verificar clases de hoy y días siguientes
                    for (let i = 0; i <= 4; i++) {
                        const indiceColumna = (diaIndice + i) % 5 + 1; // +1 porque la primera columna es la hora
                        const nombreClase = celdas[indiceColumna]?.textContent.trim();
                        
                        if (nombreClase) {
                            let diferencia;
                            
                            if (i === 0 && !esFindeSemana) { // Si es hoy
                                diferencia = minutosInicio - minutosActuales;
                                if (diferencia <= 0) continue; // Ya pasó esta clase
                            } else { // Si es otro día
                                diferencia = i * 24 * 60 + minutosInicio; // Días de diferencia
                                if (esFindeSemana) {
                                    // Ajustar para fin de semana (días hasta el lunes + el resto)
                                    const diasHastaLunes = diaSemanaActual === 'sabado' ? 2 : 1;
                                    diferencia += diasHastaLunes * 24 * 60;
                                }
                            }
                            
                            if (diferencia < minDiferencia) {
                                minDiferencia = diferencia;
                                const dia = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'][(diaIndice + i) % 5];
                                proximaClase = {
                                    nombre: nombreClase,
                                    dia,
                                    hora: horario.split(' - ')[0]
                                };
                            }
                        }
                    }
                }
            });
            
            // Actualizar el elemento en el dashboard
            const nextClassElement = document.getElementById('next-class');
            if (nextClassElement && proximaClase) {
                nextClassElement.textContent = `${proximaClase.nombre} - ${proximaClase.dia} ${proximaClase.hora}`;
                // Guardar en localStorage para persistencia
                localStorage.setItem('proximaClase', JSON.stringify(proximaClase));
            } else if (nextClassElement) {
                nextClassElement.textContent = 'No hay clases próximas';
            }
        } catch (error) {
            console.error('Error al actualizar próxima clase:', error);
        }
    };
    
    // Verificar si hay una próxima clase guardada y mostrarla
    const checkSavedNextClass = () => {
        const savedClass = localStorage.getItem('proximaClase');
        if (savedClass) {
            try {
                const proximaClase = JSON.parse(savedClass);
                document.getElementById('next-class').textContent = 
                    `${proximaClase.nombre} - ${proximaClase.dia} ${proximaClase.hora}`;
            } catch (e) {
                console.error('Error parsing saved class', e);
            }
        }
    };
    
    // Extender la función init para incluir las nuevas funcionalidades
    const initSchedule = async () => {
        try {
            // Verificar si hay una próxima clase guardada
            checkSavedNextClass();
            
            // Configurar sistema de recordatorios
            setupScheduleReminders();
            
            // Configurar botón de notificaciones
            setupNotificationButton();
            
            // Configurar botón de exportar horario
            setupExportSchedule();
            
            // Actualizar próxima clase cuando se cargue el horario
            if (scheduleBody.childElementCount > 0) {
                updateNextClass();
            } else {
                // Si el horario aún no está cargado, esperar a que lo esté
                const observer = new MutationObserver((mutations) => {
                    if (scheduleBody.childElementCount > 0) {
                        updateNextClass();
                        observer.disconnect();
                    }
                });
                observer.observe(scheduleBody, { childList: true });
            }
            
            // Actualizar próxima clase cada 5 minutos
            setInterval(updateNextClass, 5 * 60 * 1000);
        } catch (error) {
            console.error('Error inicializando sistema de horario:', error);
        }
    };

    // Inicializar la página
    const oldInit = init;
    const init = async () => {
        await oldInit();
        await initSchedule();
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