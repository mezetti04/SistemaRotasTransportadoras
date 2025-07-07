document.addEventListener('DOMContentLoaded', () => {
    const notasList = document.getElementById('notasList');
    const loadingMessage = document.getElementById('loadingMessage');
    const orderBySelect = document.getElementById('orderBy');
    const directionSelect = document.getElementById('direction');
    const filterCidadeSelect = document.getElementById('filterCidade');
    const applyFiltersButton = document.getElementById('applyFilters');
    const createRouteButton = document.getElementById('createRouteButton');
    const finalizeRouteButton = document.getElementById('finalizeRouteButton');

    // Elementos da área de Rota em Criação
    const currentRouteDisplay = document.getElementById('currentRouteDisplay');
    const routeStatusSpan = document.getElementById('routeStatus');
    const routeNameSpan = document.getElementById('routeName');
    const routeIdSpan = document.getElementById('routeId');
    const routeWeightSpan = document.getElementById('routeWeight');
    const routeVolumesSpan = document.getElementById('routeVolumes');
    const routeValueSpan = document.getElementById('routeValue');
    const routeCitiesSpan = document.getElementById('routeCities');
    const activeRouteNfItemsList = document.getElementById('activeRouteNfItems');

    const API_BASE_URL = 'http://127.0.0.1:5000';
    const API_NOTAS_URL = `${API_BASE_URL}/notas_fiscais`;
    const API_CIDADES_URL = `${API_BASE_URL}/cidades_unicas`;
    const API_ROTAS_URL = `${API_BASE_URL}/rotas`;
    const API_ACTIVE_ROUTE_URL = `${API_BASE_URL}/rotas/active`;

    let currentRouteId = null; // Armazena o ID da rota que está sendo criada/editada

    // --- Funções Auxiliares de UI ---
    function setAddRemoveButtonsVisibility(visible) {
        document.querySelectorAll('.add-remove-btn[data-action="add"]').forEach(button => {
            if (visible) {
                button.classList.remove('hidden');
            } else {
                button.classList.add('hidden');
            }
        });
    }

    function setCreateRouteButtonVisibility(visible) {
        if (visible) {
            createRouteButton.classList.remove('hidden');
        } else {
            createRouteButton.classList.add('hidden');
        }
    }

    // --- Funções de Carregamento de Dados ---

    async function populateCidadesFilter() {
        try {
            const response = await fetch(API_CIDADES_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const cidades = await response.json();

            while (filterCidadeSelect.options.length > 1) {
                filterCidadeSelect.remove(1);
            }

            cidades.forEach(cidade => {
                const option = document.createElement('option');
                option.value = cidade;
                option.textContent = cidade;
                filterCidadeSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar lista de cidades:', error);
        }
    }

    async function fetchNotasFiscais() {
        loadingMessage.style.display = 'block';
        notasList.innerHTML = '';

        const orderBy = orderBySelect.value;
        const direction = directionSelect.value;
        const cidade = filterCidadeSelect.value;

        let url = `${API_NOTAS_URL}?order_by=${orderBy}&direction=${direction}`;
        if (cidade) {
            url += `&cidade=${cidade}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const notas = await response.json();
            displayNotasFiscais(notas);
            setAddRemoveButtonsVisibility(currentRouteId !== null); 
        } catch (error) {
            console.error('Erro ao buscar notas fiscais:', error);
            notasList.innerHTML = `<li class="error-message">Erro ao carregar notas fiscais. Tente novamente mais tarde.</li>`;
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    async function fetchCurrentRouteDetails() {
        const response = await fetch(API_ACTIVE_ROUTE_URL);
        
        if (response.status === 204) {
            currentRouteId = null;
            resetRouteDisplay();
            setCreateRouteButtonVisibility(true);
            fetchNotasFiscais();
            return;
        }

        if (!response.ok) {
            console.error('Erro ao buscar rota ativa:', await response.text());
            currentRouteId = null;
            resetRouteDisplay();
            setCreateRouteButtonVisibility(true);
            fetchNotasFiscais();
            return;
        }
        
        const activeRoute = await response.json();
        currentRouteId = activeRoute.id;
        updateRouteDisplay(activeRoute);
        setCreateRouteButtonVisibility(false);
        fetchNotasFiscais();
    }

    // --- Funções de Exibição na UI ---

    function displayNotasFiscais(notas) {
        if (notas.length === 0) {
            notasList.innerHTML = `<li class="no-results">Nenhuma nota fiscal disponível com os filtros aplicados.</li>`;
            return;
        }

        notas.forEach(nota => {
            const li = document.createElement('li');
            li.className = 'note-item';
            const valorTotalNf = parseFloat(nota.valor_total_nf);
            const pesoBruto = parseFloat(nota.peso_bruto);
            
            li.dataset.statusRoteirizacao = nota.status_roteirizacao; 

            li.innerHTML = `
                <h3>NF ${nota.numero_nf} - ${nota.cliente_nome}</h3>
                <div><strong>Endereço:</strong> ${nota.endereco_logradouro}, ${nota.endereco_numero} - ${nota.endereco_bairro}</div>
                <div><strong>Cidade:</strong> ${nota.endereco_cidade} / ${nota.endereco_uf}</div>
                <div><strong>Valor:</strong> R$ ${!isNaN(valorTotalNf) ? valorTotalNf.toFixed(2).replace('.', ',') : '0,00'}</div>
                <div><strong>Peso Bruto:</strong> ${!isNaN(pesoBruto) ? pesoBruto.toFixed(3).replace('.', ',') : '0,000'} kg</div>
                <div><strong>Volumes:</strong> ${nota.quantidade_volumes}</div>
                <button class="add-remove-btn ${currentRouteId ? '' : 'hidden'}" data-nfe-id="${nota.id}" data-action="add">Adicionar à Rota</button>
            `;
            notasList.appendChild(li);
        });

        document.querySelectorAll('.add-remove-btn[data-action="add"]').forEach(button => {
            button.addEventListener('click', handleAddRemoveNfe);
        });
    }

    function updateRouteDisplay(routeDetails) {
        currentRouteId = routeDetails.id; 
        routeStatusSpan.textContent = routeDetails.status_rota;
        routeNameSpan.textContent = routeDetails.nome_rota;
        routeIdSpan.textContent = routeDetails.id;
        routeWeightSpan.textContent = routeDetails.peso_total.toFixed(3).replace('.', ',');
        routeVolumesSpan.textContent = routeDetails.volumes_total;
        routeValueSpan.textContent = routeDetails.valor_total.toFixed(2).replace('.', ',');
        routeCitiesSpan.textContent = routeDetails.cidades_atendidas && routeDetails.cidades_atendidas.length > 0 
                                      ? routeDetails.cidades_atendidas.join(', ') 
                                      : 'N/A';
        
        activeRouteNfItemsList.innerHTML = '';
        if (routeDetails.notas_fiscais && routeDetails.notas_fiscais.length > 0) {
            routeDetails.notas_fiscais.forEach(nf => {
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
                    <button class="add-remove-btn remove" data-nfe-id="${nf.id}" data-action="remove">Remover da Rota</button>
                `;
                activeRouteNfItemsList.appendChild(li);
            });
            document.querySelectorAll('#activeRouteNfItems .add-remove-btn[data-action="remove"]').forEach(button => {
                button.addEventListener('click', handleAddRemoveNfe);
            });
        } else {
            activeRouteNfItemsList.innerHTML = `<li class="no-results">Nenhuma NF adicionada a esta rota ainda.</li>`;
        }

        finalizeRouteButton.classList.remove('hidden'); 
        setAddRemoveButtonsVisibility(true);
        setCreateRouteButtonVisibility(false);
    }

    function resetRouteDisplay() {
        currentRouteId = null; 
        routeStatusSpan.textContent = 'Nenhuma rota em criação.';
        routeNameSpan.textContent = 'N/A';
        routeIdSpan.textContent = 'N/A';
        routeWeightSpan.textContent = '0.000';
        routeVolumesSpan.textContent = '0';
        routeValueSpan.textContent = '0,00';
        routeCitiesSpan.textContent = 'N/A';
        activeRouteNfItemsList.innerHTML = `<li class="no-results">Nenhuma NF adicionada a esta rota ainda.</li>`;
        finalizeRouteButton.classList.add('hidden'); 
        
        setAddRemoveButtonsVisibility(false);
        setCreateRouteButtonVisibility(true);
    }

    // --- Funções de Manipulação de Rotas ---

    async function handleCreateRoute() {
        const routeName = prompt('Digite um nome para a nova rota:');
        if (!routeName) {
            alert('Nome da rota é obrigatório.');
            return;
        }

        try {
            const response = await fetch(API_ROTAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome_rota: routeName })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(`HTTP error! status: ${response.status}. Mensagem: ${errorData.message || errorData.error}`);
            }
            const result = await response.json();
            currentRouteId = result.route_id; 
            alert(`Rota "${routeName}" criada com sucesso! ID: ${currentRouteId}`);
            fetchCurrentRouteDetails(); 
            
        } catch (error) {
            console.error('Erro ao criar rota:', error);
            alert(`Erro ao criar rota: ${error.message}. Verifique o console.`);
        }
    }

    async function handleAddRemoveNfe(event) {
        if (!currentRouteId) {
            alert('Crie ou selecione uma rota primeiro.');
            return;
        }

        const nfeId = parseInt(event.target.dataset.nfeId);
        const action = event.target.dataset.action; 
        const endpoint = action === 'add' ? 'add_nfe' : 'remove_nfe';

        try {
            const response = await fetch(`${API_ROTAS_URL}/${currentRouteId}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nfe_id: nfeId })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(`HTTP error! status: ${response.status}. Mensagem: ${errorData.message || errorData.error}`);
            }
            const result = await response.json();
            alert(result.message);
            fetchNotasFiscais();
            fetchCurrentRouteDetails();
        } catch (error) {
            console.error(`Erro ao ${action} NF da rota:`, error);
            alert(`Erro ao ${action} NF da rota: ${error.message}. Verifique o console.`);
        }
    }

    async function handleFinalizeRoute() {
        if (!currentRouteId) {
            alert('Nenhuma rota em criação para finalizar.');
            return;
        }
        if (!confirm('Tem certeza que deseja finalizar esta rota? As NFs serão marcadas como "Entregue" e não aparecerão mais nas listas de disponíveis.')) {
            return;
        }

        try {
            const response = await fetch(`${API_ROTAS_URL}/${currentRouteId}/finalize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(`HTTP error! status: ${response.status}. Mensagem: ${errorData.message || errorData.error}`);
            }
            const result = await response.json();
            alert(result.message);
            currentRouteId = null; 
            resetRouteDisplay(); 
            fetchNotasFiscais(); 
            populateCidadesFilter(); 
        } catch (error) {
            console.error('Erro ao finalizar rota:', error);
            alert(`Erro ao finalizar rota: ${error.message}. Verifique o console.`);
        }
    }

    // --- Event Listeners Iniciais ---
    applyFiltersButton.addEventListener('click', fetchNotasFiscais);
    createRouteButton.addEventListener('click', handleCreateRoute);
    finalizeRouteButton.addEventListener('click', handleFinalizeRoute);

    // --- Carregamento Inicial ---
    populateCidadesFilter();
    fetchCurrentRouteDetails();
});