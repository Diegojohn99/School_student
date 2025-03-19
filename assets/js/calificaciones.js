document.addEventListener('DOMContentLoaded', async () => {
    // Elementos del DOM
    const promedioBox = document.querySelector('.promedio');
    const filtroPeriodo = document.getElementById('filtro-periodo');
    const filtroMateria = document.getElementById('filtro-materia');
    const tablaCalificaciones = document.getElementById('tabla-calificaciones');
    
    try {
        // Cargar datos del estudiante
        const student = await loadStudentData();
        document.getElementById('student-name').textContent = student.nombre;
        document.getElementById('student-id').textContent = `Matrícula: ${student.matricula}`;

        // Cargar calificaciones y configurar interfaz
        const calificaciones = await loadGrades(student._id);
        cargarFiltros(calificaciones);
        actualizarUI(calificaciones);
        renderizarGrafico(calificaciones);

    } catch (error) {
        mostrarError(error.message);
        console.error('Error:', error);
    }

    // Event listeners para filtros
    filtroPeriodo.addEventListener('change', () => actualizarUI(calificaciones));
    filtroMateria.addEventListener('change', () => actualizarUI(calificaciones));

    async function loadStudentData() {
        const studentId = localStorage.getItem('studentId');
        if (!studentId || !/^[a-f\d]{24}$/i.test(studentId)) {
            window.location.href = 'index.html';
            throw new Error('ID de estudiante inválido');
        }
        
        const response = await fetch(`/api/students/${studentId}`);
        if (!response.ok) throw new Error('Error al cargar datos del estudiante');
        return await response.json();
    }

    async function loadGrades(studentId) {
        try {
            const response = await fetch(`/api/students/${studentId}/calificaciones`);
            if (!response.ok) throw new Error('Error al cargar calificaciones');
            return await response.json();
        } catch (error) {
            throw new Error('No se pudieron cargar las calificaciones');
        }
    }

    function cargarFiltros(calificaciones) {
        // Cargar períodos únicos
        const periodos = [...new Set(calificaciones.map(c => c.periodo))].sort();
        periodos.forEach(p => {
            filtroPeriodo.innerHTML += `<option value="${p}">${p}</option>`;
        });

        // Cargar materias únicas
        const materias = [...new Set(calificaciones.map(c => c.materia))].sort();
        materias.forEach(m => {
            filtroMateria.innerHTML += `<option value="${m}">${m}</option>`;
        });
    }

    function actualizarUI(calificaciones) {
        const filtros = {
            periodo: filtroPeriodo.value,
            materia: filtroMateria.value
        };

        const datosFiltrados = calificaciones.filter(c => {
            return (filtros.periodo === 'Todos los periodos' || c.periodo === filtros.periodo) &&
                   (filtros.materia === 'Todas las materias' || c.materia === filtros.materia);
        });

        actualizarTabla(datosFiltrados);
        actualizarPromedio(datosFiltrados);
        actualizarGrafico(datosFiltrados);
    }

    function actualizarTabla(calificaciones) {
        tablaCalificaciones.innerHTML = `
            <tr>
                <th>Materia</th>
                <th>Período</th>
                <th>Evaluación</th>
                <th>Calificación</th>
                <th>Estado</th>
            </tr>
        `;

        calificaciones.forEach(c => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${c.materia}</td>
                <td>${c.periodo}</td>
                <td>${c.evaluacion}</td>
                <td class="${c.calificacion < 6 ? 'reprobado' : 'aprobado'}">
                    ${c.calificacion}
                </td>
                <td>${c.estado || 'Regular'}</td>
            `;
            tablaCalificaciones.appendChild(row);
        });
    }

    function actualizarPromedio(calificaciones) {
        const promedio = calificaciones.length > 0 
            ? (calificaciones.reduce((a, b) => a + b.calificacion, 0) / calificaciones.length).toFixed(1)
            : '0.0';
        promedioBox.textContent = promedio;
    }

    let chartInstance = null;
    
    function renderizarGrafico(calificaciones) {
        const ctx = document.getElementById('grafico-calificaciones').getContext('2d');
        
        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: calificaciones.map(c => c.periodo),
                datasets: [{
                    label: 'Calificaciones por período',
                    data: calificaciones.map(c => c.calificacion),
                    borderColor: '#2196F3',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        min: 0,
                        max: 10
                    }
                }
            }
        });
    }

    function actualizarGrafico(calificaciones) {
        chartInstance.data.labels = calificaciones.map(c => c.periodo);
        chartInstance.data.datasets[0].data = calificaciones.map(c => c.calificacion);
        chartInstance.update();
    }

    function mostrarError(mensaje) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <span class="material-icons">error</span>
            ${mensaje}
        `;
        document.body.prepend(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }
});