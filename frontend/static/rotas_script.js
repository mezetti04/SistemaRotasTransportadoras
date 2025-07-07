document.addEventListener('DOMContentLoaded', () => {
    const routesList = document.getElementById('routesList');
    const loadingRoutesMessage = document.getElementById('loadingRoutesMessage');
    const routeDetailsSection = document.getElementById('routeDetailsSection');

    const selectedRouteNameSpan = document.getElementById('selectedRouteName');
    const selectedRouteIdSpan = document.getElementById('selectedRouteId');
    const selectedRouteStatusSpan = document.getElementById('selectedRouteStatus');
    const selectedRouteDateSpan = document.getElementById('selectedRouteDate');
    const selectedRouteWeightSpan = document.getElementById('selectedRouteWeight');
    const selectedRouteVolumesSpan = document.getElementById('selectedRouteVolumes');
    const selectedRouteValueSpan = document.getElementById('selectedRouteValue');
    const selectedRouteCitiesSpan = document.getElementById('selectedRouteCities');
    const selectedRouteNfList = document.getElementById('selectedRouteNfList');

    const API_BASE_URL = 'http://127.0.0.1:5000';
    const API_ROTAS_URL = `${API_BASE_URL}/rotas`;

    let weightChartInstance = null;
    let volumesChartInstance = null;

    // --- Funções de Carregamento de Dados ---

    async function fetchAllRoutes() {
        loadingRoutesMessage.style.display = 'block';
        routesList.innerHTML = '';
        routeDetailsSection.classList.add('hidden'); // Oculta detalhes ao carregar novas rotas

        try {
            const response = await fetch(API_ROTAS_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const routes = await response.json();
            displayAllRoutes(routes);
        }
        catch (error) {
            console.error('Erro ao buscar todas as rotas:', error);
            routesList.innerHTML = `<li class="error-message">Erro ao carregar rotas. Tente novamente mais tarde.</li>`;
        } finally {
            loadingRoutesMessage.style.display = 'none';
        }
    }

    async function fetchRouteDetails(routeId) {
        try {
            const response = await fetch(`${API_ROTAS_URL}/${routeId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const routeDetails = await response.json();
            displayRouteDetails(routeDetails);
        } catch (error) {
            console.error(`Erro ao buscar detalhes da rota ${routeId}:`, error);
            alert('Erro ao carregar detalhes da rota. Verifique o console.');
            routeDetailsSection.classList.add('hidden');
        }
    }

    // --- Funções de Exibição na UI ---

    function displayAllRoutes(routes) {
        if (routes.length === 0) {
            routesList.innerHTML = `<li class="no-results">Nenhuma rota encontrada.</li>`;
            return;
        }

        routes.forEach(route => {
            const li = document.createElement('li');
            li.className = 'route-item';
            li.dataset.routeId = route.id;
            li.innerHTML = `
                <h3>${route.nome_rota} (ID: ${route.id})</h3>
                <p>Status: <strong>${route.status_rota}</strong></p>
                <p>Cidades: ${route.cidades_atendidas && route.cidades_atendidas.length > 0 ? route.cidades_atendidas.join(', ') : 'N/A'}</p>
                <p>Peso Total: ${route.peso_total.toFixed(3).replace('.', ',')} kg | Volumes: ${route.volumes_total}</p>
                <button class="action-button remove-route-btn" data-route-id="${route.id}">Excluir Rota</button>
            `;
            li.querySelector('.remove-route-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Impede que o clique no botão ative o clique na lista
                handleDeleteRoute(route.id);
            });
            li.addEventListener('click', () => fetchRouteDetails(route.id));
            routesList.appendChild(li);
        });
    }

    function displayRouteDetails(route) {
        routeDetailsSection.classList.remove('hidden');

        selectedRouteNameSpan.textContent = route.nome_rota;
        selectedRouteIdSpan.textContent = route.id;
        selectedRouteStatusSpan.textContent = route.status_rota;
        selectedRouteDateSpan.textContent = new Date(route.data_criacao).toLocaleDateString('pt-BR') + ' ' + new Date(route.data_criacao).toLocaleTimeString('pt-BR');
        selectedRouteWeightSpan.textContent = route.peso_total.toFixed(3).replace('.', ',');
        selectedRouteVolumesSpan.textContent = route.volumes_total;
        selectedRouteValueSpan.textContent = route.valor_total.toFixed(2).replace('.', ',');
        selectedRouteCitiesSpan.textContent = route.cidades_atendidas && route.cidades_atendidas.length > 0 
                                              ? route.cidades_atendidas.join(', ') 
                                              : 'N/A';
        
        selectedRouteNfList.innerHTML = '';
        if (route.notas_fiscais && route.notas_fiscais.length > 0) {
            route.notas_fiscais.forEach(nf => {
                const li = document.createElement('li');
                li.className = 'note-item';
                const valorTotalNf = parseFloat(nf.valor_total_nf);
                const pesoBruto = parseFloat(nf.peso_bruto);
                li.innerHTML = `
                    <h3>NF ${nf.numero_nf} - ${nf.cliente_nome}</h3>
                    <div><strong>Endereço:</strong> ${nf.endereco_logradouro}, ${nf.endereco_numero} - ${nf.endereco_bairro}</div>
                    <div><strong>Cidade:</strong> ${nf.endereco_cidade} / ${nf.endereco_uf}</div>
                    <div><strong>Valor:</strong> R$ ${!isNaN(valorTotalNf) ? valorTotalNf.toFixed(2).replace('.', ',') : '0,00'}</div>
                    <div><strong>Peso Bruto:</strong> ${!isNaN(pesoBruto) ? pesoBruto.toFixed(3).replace('.', ',') : '0,000'} kg</div>
                    <div><strong>Volumes:</strong> ${nf.quantidade_volumes}</div>
                `;
                selectedRouteNfList.appendChild(li);
            });
        } else {
            selectedRouteNfList.innerHTML = `<li class="no-results">Nenhuma NF nesta rota.</li>`;
        }

        renderCharts(route);
    }

    function renderCharts(route) {
        if (weightChartInstance) {
            weightChartInstance.destroy();
        }
        if (volumesChartInstance) {
            volumesChartInstance.destroy();
        }

        const weightCtx = document.getElementById('weightChart').getContext('2d');
        weightChartInstance = new Chart(weightCtx, {
            type: 'bar',
            data: {
                labels: ['Peso Total'],
                datasets: [{
                    label: 'Peso Bruto Total (kg)',
                    data: [route.peso_total],
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Peso (kg)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        const volumesCtx = document.getElementById('volumesChart').getContext('2d');
        volumesChartInstance = new Chart(volumesCtx, {
            type: 'bar',
            data: {
                labels: ['Volumes Totais'],
                datasets: [{
                    label: 'Volumes Totais',
                    data: [route.volumes_total],
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Volumes'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    async function handleDeleteRoute(routeId) {
        if (!confirm(`Tem certeza que deseja EXCLUIR a rota ${routeId}? Isso removerá a rota permanentemente e reverterá o status de suas NFs para 'Disponível'.`)) {
            return;
        }
        try {
            const response = await fetch(`${API_ROTAS_URL}/${routeId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(`HTTP error! status: ${response.status}. Mensagem: ${errorData.message || errorData.error}`);
            }
            const result = await response.json();
            alert(result.message);
            fetchAllRoutes();
        } catch (error) {
            console.error(`Erro ao excluir rota ${routeId}:`, error);
            alert(`Erro ao excluir rota: ${error.message}. Verifique o console.`);
        }
    }


    // --- Carregamento Inicial ---
    fetchAllRoutes();
});